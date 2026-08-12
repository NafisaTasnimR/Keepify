const { auth } = require('../config/firebase');

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('Missing or malformed Authorization header');
        return res.status(401).json({ message: 'Authentication token required' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        console.log('Verifying token. header length:', typeof authHeader === 'string' ? authHeader.length : 0);
        const firebaseAuth = auth();
        console.log('Firebase auth instance present:', !!firebaseAuth);
        if (!firebaseAuth || typeof firebaseAuth.verifyIdToken !== 'function') {
            console.error('Firebase Auth not initialized or verifyIdToken not available');
            return res.status(500).json({ message: 'Server misconfiguration: Firebase Auth not initialized' });
        }
        const decodedToken = await firebaseAuth.verifyIdToken(idToken);
        // Attach user info to the request object
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name,
        };
        next();
    } catch (error) {
        console.error('Error verifying Firebase token:', error);
        return res.status(401).json({ message: 'Invalid or expired token', error: error.message });
    }
};

module.exports = { verifyToken };
