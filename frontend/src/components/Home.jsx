import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
    const navigate = useNavigate();

    // Placeholder functions – replace with routing logic
    const handleLogin = () => {
        navigate('/auth');
    };

    const handleSignup = () => {
        navigate('/auth');
    };

    return (
        <div className="home-container">
            {/* Header with logo and login link */}
            <header className="home-header">
                <div className="home-logo">MyApp</div>
                <button className="home-header-login" onClick={handleLogin}>
                    Log in
                </button>
            </header>

            {/* Main content */}
            <main className="home-main">
                <div className="home-card">
                    <h1 className="home-title">Welcome back</h1>
                    <p className="home-subtitle">
                        Access your account or create a new one to get started.
                    </p>

                    <div className="home-actions">
                        <button className="home-btn home-btn-login" onClick={handleLogin}>
                            Log in
                        </button>
                        <button className="home-btn home-btn-signup" onClick={handleSignup}>
                            Sign up
                        </button>
                    </div>

                    <p className="home-footer-text">
                        By continuing, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default Home;