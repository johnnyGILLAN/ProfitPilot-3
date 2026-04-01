const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { firestore } = require('../lib/firebase');

// GET /profile - returns the profile for the authenticated user
router.get('/', verifyToken, async (req, res) => {
    try {
        // req.user is attached by verifyToken middleware
        const userId = req.user && req.user.id;
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const doc = await firestore.collection('users').doc(String(userId)).get();
        if (!doc.exists) return res.status(404).json({ success: false, message: 'User not found' });

        const data = doc.data();
        // Remove sensitive fields
        delete data.passwordHash;

        return res.status(200).json({ success: true, user: { id: doc.id, ...data } });
    } catch (err) {
        console.error('Profile fetch error:', err);
        return res.status(500).json({ success: false, message: 'Server error retrieving profile.' });
    }
});

module.exports = router;
