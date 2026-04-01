const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { firestore, admin } = require('../lib/firebase');
const verifyToken = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const RESET_TTL_MS = 1000 * 60 * 60; // 1 hour
const bcrypt = require('bcryptjs');

function sanitizeUserData(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    email: data.email,
    name: data.name,
    role: data.role || 'FREE',
    profile: data.profile || {},
    createdAt: data.createdAt || null,
  };
}

// Register (server-side) - only allowed if ALLOW_SERVER_REGISTRATION=true
// Preferred flow: client creates user with Firebase Auth SDK and then calls /auth/sync-user to create the Firestore profile.
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Missing email or password.' });

    if (process.env.ALLOW_SERVER_REGISTRATION !== 'true') {
      return res.status(403).json({ success: false, message: 'Server-side registration is disabled. Use Firebase client sign up.' });
    }

    // Create Firebase Auth user via admin SDK
    const firebaseUser = await admin.auth().createUser({ email: String(email).toLowerCase(), password, displayName: name || '' });

    // Create Firestore user doc with same uid
    const createdAt = new Date().toISOString();
    const userDoc = {
      name: name || '',
      email: String(email).toLowerCase(),
      role: 'FREE',
      profile: {},
      createdAt,
    };

    await firestore.collection('users').doc(firebaseUser.uid).set(userDoc);

    // return sanitized object
    return res.status(201).json({ success: true, message: 'User created via admin', user: { id: firebaseUser.uid, email: firebaseUser.email, name: userDoc.name } });
  } catch (err) {
    console.error('Register (admin) error:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// Login endpoint (compatibility). Preferred flow is client SDK sign-in. This endpoint accepts either an ID token or falls back to legacy server-side password checks.
router.post('/login', async (req, res) => {
  try {
    const { idToken, email, password } = req.body;

    // If idToken provided, verify and return Firestore user doc
    if (idToken) {
      const decoded = await admin.auth().verifyIdToken(idToken);
      const uid = decoded.uid;
      const doc = await firestore.collection('users').doc(String(uid)).get();
      if (!doc.exists) return res.status(404).json({ success: false, message: 'User profile not found' });
      const sanitized = sanitizeUserData(doc);
      return res.status(200).json({ success: true, token: idToken, user: sanitized });
    }

    // Legacy email/password route - will try to find passwordHash field for backwards compatibility
    if (!email || !password) return res.status(400).json({ success: false, message: 'Missing credentials.' });

    const usersQuery = await firestore.collection('users').where('email', '==', String(email).toLowerCase()).limit(1).get();
    if (usersQuery.empty) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const userDoc = usersQuery.docs[0];
    const user = userDoc.data();

    // if user has passwordHash we compare (backwards compatibility); otherwise advise using Firebase Auth
    if (!user.passwordHash) {
      return res.status(403).json({ success: false, message: 'Please sign in using Firebase Auth client SDK.' });
    }

    // keep bcrypt compare for legacy stored users
    const bcrypt = require('bcryptjs');
    const matches = await bcrypt.compare(password, user.passwordHash || '');
    if (!matches) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const token = jwt.sign({ id: userDoc.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    const sanitized = sanitizeUserData(userDoc);
    return res.status(200).json({ success: true, token, user: sanitized });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// Request a password reset token — we store a short lived token in Firestore.
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Missing email.' });

    // Preferred: use Firebase Auth to generate a password reset link
    try {
      const link = await admin.auth().generatePasswordResetLink(String(email).toLowerCase());
      const devResponse = process.env.NODE_ENV === 'development' || process.env.DEBUG ? { link } : {};
      // You would normally email this link to the user. In dev we return it for convenience.
      return res.status(200).json({ success: true, message: 'If that email exists we have sent password reset instructions.', ...devResponse });
    } catch (err) {
      console.warn('generatePasswordResetLink failed; falling back to Firestore token flow', err);
      const usersQuery = await firestore.collection('users').where('email', '==', String(email).toLowerCase()).limit(1).get();
      if (usersQuery.empty) return res.status(200).json({ success: true, message: 'If that email exists we have sent password reset instructions.' });

      const userDoc = usersQuery.docs[0];
      const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const expiresAt = Date.now() + RESET_TTL_MS;

      await firestore.collection('passwordResets').add({ userId: userDoc.id, token, expiresAt, createdAt: new Date().toISOString() });

      const devResponse = process.env.NODE_ENV === 'development' || process.env.DEBUG ? { token } : {};
      return res.status(200).json({ success: true, message: 'If that email exists we have sent password reset instructions.', ...devResponse });
    }
  } catch (err) {
    console.error('Request password reset error:', err);
    return res.status(500).json({ success: false, message: 'Server error while requesting password reset.' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ success: false, message: 'Missing token or new password.' });

    // reset via token stored in Firestore (legacy) - otherwise password reset will be performed via Firebase link
    const resetQuery = await firestore.collection('passwordResets').where('token', '==', token).limit(1).get();
    if (resetQuery.empty) return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });

    const resetDoc = resetQuery.docs[0];
    const resetData = resetDoc.data();
    if (resetData.expiresAt < Date.now()) return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });

    const userRef = firestore.collection('users').doc(resetData.userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return res.status(400).json({ success: false, message: 'User not found.' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userRef.update({ passwordHash });

    // Remove reset document
    await resetDoc.ref.delete();

    return res.status(200).json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ success: false, message: 'Server error while resetting password.' });
  }
});

// Sync user — called after client signs up using Firebase Auth. Protected: client must send ID token in Authorization header.
router.post('/sync-user', verifyToken, async (req, res) => {
  try {
    const uid = req.user && (req.user.firebaseUid || req.user.id);
    if (!uid) return res.status(400).json({ success: false, message: 'Missing authenticated user.' });

    const { name } = req.body;
    const userRef = firestore.collection('users').doc(String(uid));
    const existing = await userRef.get();
    const data = {
      name: name || (req.user && req.user.name) || '',
      email: req.user && req.user.email ? req.user.email : undefined,
      role: 'FREE',
      profile: {},
      createdAt: existing.exists ? existing.data().createdAt : new Date().toISOString(),
    };

    await userRef.set(data, { merge: true });
    const created = await userRef.get();
    return res.status(200).json({ success: true, user: { id: created.id, ...created.data() } });
  } catch (err) {
    console.error('Sync user error:', err);
    return res.status(500).json({ success: false, message: 'Server error syncing user.' });
  }
});

module.exports = router;
