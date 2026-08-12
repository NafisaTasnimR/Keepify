const express = require('express');
const { verifyToken } = require('../middlewares/authMiddleware');
const { auth } = require('../config/firebase');
const { createUserSettings } = require('../services/settingsService');

const router = express.Router();

// Verify ID token sent from frontend (e.g., after Firebase sign-in)
router.post('/', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ message: 'ID token is required' });
    }

    try {
        console.log('Received token verification request. token length:', typeof token === 'string' ? token.length : 0);
        const firebaseAuth = auth();
        console.log('Firebase auth instance present:', !!firebaseAuth);
        if (!firebaseAuth || typeof firebaseAuth.verifyIdToken !== 'function') {
            console.error('Firebase Auth not initialized or verifyIdToken not available');
            return res.status(500).json({ message: 'Server misconfiguration: Firebase Auth not initialized' });
        }
        const decoded = await firebaseAuth.verifyIdToken(token);
        console.log('Token verified for uid:', decoded.uid);

        const userName = decoded.name || decoded.email?.split('@')[0] || 'User';
        const userEmail = decoded.email || '';

        // Auto-provision user settings on sign in
        try {
            await createUserSettings({
                userId: decoded.uid,
                email: userEmail,
                name: userName,
            });
        } catch (settingsErr) {
            console.warn('Failed to auto-provision user settings:', settingsErr.message);
        }

        return res.json({
            token,
            user: {
                uid: decoded.uid,
                email: userEmail,
                name: userName,
            }
        });
    } catch (error) {
        console.error('Error verifying ID token:', error);
        return res.status(401).json({ message: 'Invalid or expired token', error: error.message });
    }
});

// This endpoint can be used by the frontend to verify the current session
router.get('/me', verifyToken, (req, res) => {
    res.json({
        user: req.user,
        message: 'Authenticated successfully'
    });
});

module.exports = router;
