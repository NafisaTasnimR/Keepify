import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../firebaseConfig';
import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import './AuthPage.css';
import { apiFetch } from '../api/client';

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(false);
    const [authError, setAuthError] = useState('');
    const navigate = useNavigate();

    const handleGoogleLogin = async () => {
        setAuthError('');
        try {
            // 1. Trigger Firebase Google Popup
            const result = await signInWithPopup(auth, googleProvider);

            // 2. Get the ID Token (JWT) from Firebase
            const idToken = await result.user.getIdToken();

            // 3. Send this token to your backend for verification (use Vite proxy)
            const response = await apiFetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: idToken }),
            });

            if (response.ok) {
                const data = await response.json();
                // Store the session token provided by your backend
                localStorage.setItem('token', data.token);
                if (data.user) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                }
                navigate('/dashboard');
            } else {
                const text = await response.text();
                console.error('Backend verification failed:', response.status, text);
                setAuthError('Backend token verification failed');
            }
        } catch (error) {
            console.error('Firebase Login Error:', error);
            // Graceful handling for common popup-related errors
            const code = error && error.code ? error.code : '';
            if (code === 'auth/popup-closed-by-user') {
                setAuthError('Sign-in popup was closed before completing. Please try again.');
                return;
            }

            if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
                // Popup blocked — fall back to redirect sign-in which works in stricter environments
                try {
                    setAuthError('Popup blocked — redirecting to sign-in.');
                    await signInWithRedirect(auth, googleProvider);
                    return;
                } catch (redirectErr) {
                    console.error('Redirect fallback failed:', redirectErr);
                    setAuthError('Unable to open sign-in popup or redirect. Please enable popups and try again.');
                    return;
                }
            }

            // Generic fallback message
            setAuthError('Authentication failed. Please try again.');
        }
    };

    const toggleMode = () => {
        setIsLogin((prev) => !prev);
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 className="auth-title">
                    {isLogin ? 'Log in' : 'Create an account'}
                </h2>

                <button className="auth-google-btn" onClick={handleGoogleLogin}>
                    Continue with Google
                </button>

                {authError && <p className="auth-error">{authError}</p>}

                <p className="auth-toggle">
                    {isLogin ? (
                        <>
                            Don't have an account?{' '}
                            <span className="auth-toggle-link" onClick={toggleMode}>
                                Sign up
                            </span>
                        </>
                    ) : (
                        <>
                            Already have an account?{' '}
                            <span className="auth-toggle-link" onClick={toggleMode}>
                                Log in
                            </span>
                        </>
                    )}
                </p>
            </div>
        </div>
    );
};

export default AuthPage;