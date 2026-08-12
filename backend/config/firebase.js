const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

// Debug: log shape of admin module for troubleshooting
try {
    const adminKeys = Object.keys(admin || {}).slice(0, 50);
    console.log('DEBUG firebase-admin type:', typeof admin, 'keys sample:', adminKeys);
    console.log('DEBUG admin.credential:', typeof (admin && admin.credential));
} catch (e) {
    console.warn('DEBUG: could not inspect firebase-admin module', e.message);
}

// It is recommended to store the service account JSON in a secure location 
// or use environment variables for each field.
// For this implementation, we assume the path to the service account file is in .env
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
    console.warn('WARNING: FIREBASE_SERVICE_ACCOUNT_PATH / GOOGLE_APPLICATION_CREDENTIALS is not defined. Skipping Firebase Admin initialization.');
}

let firebaseApp = null;
let firebaseAuth = null;

const initializeFirebase = () => {
    if (!serviceAccountPath) {
        return null;
    }

    if (admin.apps && admin.apps.length) {
        firebaseApp = admin.app();
        try {
            firebaseAuth = getAuth(firebaseApp);
        } catch (e) {
            // ignore, will reinitialize below if needed
        }
        return firebaseApp;
    }

    try {
        const absolutePath = path.resolve(process.cwd(), serviceAccountPath);
        const serviceAccount = require(absolutePath);
        firebaseApp = admin.initializeApp({
            credential: admin.cert ? admin.cert(serviceAccount) : admin.credential.cert(serviceAccount),
        });
        try {
            firebaseAuth = getAuth(firebaseApp);
        } catch (e) {
            console.warn('Could not initialize modular getAuth:', e.message);
        }

        return firebaseApp;
    } catch (error) {
        console.error('Firebase Admin initialization error:', error.message);
        return null;
    }
};

module.exports = { initializeFirebase, admin, auth: () => firebaseAuth };
