const jwt = require('jsonwebtoken');
const { firestore, admin } = require('../lib/firebase');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Verify token middleware - prefers Firebase ID tokens, falls back to legacy server JWT for compatibility.
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader || req.body.token || req.query.token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Missing authentication token.' });
  }

  // Try Firebase ID token first
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    // decoded.uid contains Firebase UID
    const userRef = firestore.collection('users').doc(String(decoded.uid));
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      // Optionally, we could create the user doc here, but require explicit sync endpoint from frontend
      return res.status(401).json({ success: false, message: 'User profile not found for this token.' });
    }
    const user = userSnap.data();
    req.user = { id: userSnap.id, firebaseUid: decoded.uid, ...user };
    return next();
  } catch (firebaseErr) {
    // if it's a Firebase verification error, continue to fallback. If token is a completely different format, jwt verify below will handle.
    console.warn('Firebase token verification failed, attempting legacy JWT fallback:', firebaseErr && firebaseErr.code ? firebaseErr.code : firebaseErr.message || firebaseErr);
  }

  // Fallback: legacy JWT support
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userRef = firestore.collection('users').doc(String(payload.id));
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return res.status(401).json({ success: false, message: 'Invalid token: user not found.' });
    }
    const user = userSnap.data();
    req.user = { id: userSnap.id, ...user };
    return next();
  } catch (err) {
    console.error('Token verification error (legacy):', err.message || err);
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

module.exports = verifyToken;
