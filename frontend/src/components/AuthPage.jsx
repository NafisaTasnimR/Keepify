import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../firebaseConfig';
import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import './AuthPage.css';
import { apiFetch } from '../api/client';

const AuthPage = ({ isOpen, onClose, initialMode = 'login' }) => {
    const [isLogin, setIsLogin] = useState(initialMode === 'login');
    const [authError, setAuthError] = useState('');
    const navigate = useNavigate();

    // Reset to whichever mode the button that opened this was clicked with
    useEffect(() => {
        if (isOpen) {
            setIsLogin(initialMode === 'login');
            setAuthError('');
        }
    }, [isOpen, initialMode]);

    // Escape key + body scroll lock while open
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

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
        setAuthError('');
    };

    const handleOverlayClick = (e) => {
        // Only close if the backdrop itself was clicked, not the card inside it
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div className="auth-overlay" onClick={handleOverlayClick}>
            <div
                className="auth-card"
                role="dialog"
                aria-modal="true"
                aria-label={isLogin ? 'Log in' : 'Create an account'}
            >
                <button className="auth-close-btn" onClick={onClose} aria-label="Close">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="6" y1="6" x2="18" y2="18" />
                        <line x1="18" y1="6" x2="6" y2="18" />
                    </svg>
                </button>

                <h2 className="auth-title">
                    {isLogin ? 'Log in' : 'Create an account'}
                </h2>

                <button className="auth-google-btn" onClick={handleGoogleLogin}>
                    <svg className="auth-google-icon" viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.9-2.26 5.35-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
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