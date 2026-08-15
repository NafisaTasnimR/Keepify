import React, { useState } from 'react';
import './Home.css';
import AuthPage from './AuthPage';

const Home = () => {
    const [authOpen, setAuthOpen] = useState(false);
    const [authMode, setAuthMode] = useState('login');

    const handleLogin = () => {
        setAuthMode('login');
        setAuthOpen(true);
    };

    const handleSignup = () => {
        setAuthMode('signup');
        setAuthOpen(true);
    };

    const closeAuth = () => {
        setAuthOpen(false);
    };

    const features = [
        {
            title: 'Dashboard & Analytics',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19V13M10 19V8M16 19V4" />
                    <path d="M2 19H22" />
                </svg>
            ),
            bullets: [
                'Sales overview: revenue, orders and top products',
                'Daily/weekly trend charts',
                'Peak activity periods flagged automatically',
            ],
        },
        {
            title: 'Orders & Customers',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="3.4" />
                    <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
                </svg>
            ),
            bullets: [
                'Full CRUD for orders with date/customer filters',
                'Customer profiles: history, spending, recency',
                'Risk badges: Low / Medium / High',
            ],
        },
        {
            title: 'ML Churn Prediction',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="8" />
                    <circle cx="12" cy="12" r="4.2" />
                    <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
                </svg>
            ),
            bullets: [
                'Logistic Regression / Random Forest classifier',
                'Trained on recency, frequency, orders, spending',
                'Every customer scored automatically',
            ],
        },
        {
            title: 'AI Insights',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.2 11.1c.6.4 1 1.1 1 1.9h4.4c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3Z" />
                </svg>
            ),
            bullets: [
                '"Customers likely to leave" alerts',
                'Auto-recommendations: discounts, follow-ups, upsells',
                'Best days to promote, products to restock',
            ],
        },
    ];

    return (
        <div className="home-container">
            {/* Header */}
            <header className="home-header">
                <div className="home-header-left">
                    <div className="home-logo">Keepify</div>
                    <nav className="home-nav">
                        <a href="#features" className="home-nav-link">Features</a>
                    </nav>
                </div>
                <div className="home-header-right">
                    <button className="home-header-login" onClick={handleLogin}>
                        Log in
                    </button>
                    <button className="home-header-signup" onClick={handleSignup}>
                        Sign up
                    </button>
                </div>
            </header>

            {/* Hero */}
            <section className="home-hero">
                <div className="home-hero-copy">
                    <span className="home-hero-eyebrow">Retail Business Intelligence</span>
                    <h1 className="home-hero-title">
                        Turn &ldquo;inactive for 40 days&rdquo; into &ldquo;follow up now.&rdquo;
                    </h1>
                    <p className="home-hero-text">
                        Keepify combines real-time sales analytics with churn prediction, so
                        raw order and customer data becomes a clear next action — not just
                        another dashboard to stare at.
                    </p>
                    <div className="home-hero-actions">
                        <button className="home-hero-cta" onClick={handleSignup}>
                            Get started free
                        </button>
                    </div>
                    <p className="home-hero-note">
                        Already have an account?{' '}
                        <button className="home-inline-link" onClick={handleLogin}>
                            Log in
                        </button>
                    </p>
                </div>

                <div className="home-analytics-panel" aria-hidden="true">
                    <div className="home-analytics-bg" />

                    <div className="home-analytics-inner">
                        <div className="home-analytics-header">
                            <span className="home-analytics-title">Customer Risk Overview</span>
                            <div className="home-analytics-dots">
                                <span className="home-analytics-dot" />
                                <span className="home-analytics-dot" />
                                <span className="home-analytics-dot" />
                            </div>
                        </div>

                        <div className="home-analytics-chart">
                            <svg viewBox="0 0 320 130" className="home-analytics-svg" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="analyticsFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#98FBCB" stopOpacity="0.32" />
                                        <stop offset="100%" stopColor="#98FBCB" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path
                                    className="home-analytics-area"
                                    d="M0,100 C30,95 45,70 70,72 C95,74 105,50 135,48 C160,46 170,60 195,42 C215,28 225,55 250,38 C270,25 290,30 320,10 L320,130 L0,130 Z"
                                    fill="url(#analyticsFill)"
                                />
                                <path
                                    className="home-analytics-line"
                                    d="M0,100 C30,95 45,70 70,72 C95,74 105,50 135,48 C160,46 170,60 195,42 C215,28 225,55 250,38 C270,25 290,30 320,10"
                                    fill="none"
                                />
                            </svg>
                        </div>

                        <div className="home-analytics-stats">
                            <div className="home-analytics-stat">
                                <span className="home-analytics-value">94%</span>
                                <span className="home-analytics-label">Prediction accuracy</span>
                            </div>
                            <div className="home-analytics-divider" />
                            <div className="home-analytics-stat">
                                <span className="home-analytics-value">3.2x</span>
                                <span className="home-analytics-label">Avg. retention lift</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="home-features" id="features">
                <div className="home-features-head">
                    <span className="home-hero-eyebrow">What&apos;s inside</span>
                    <h2 className="home-features-title">
                        Everything you need to retain customers
                    </h2>
                    <p className="home-features-subtitle">
                        From live sales numbers to who&apos;s about to churn — and what to do about it.
                    </p>
                </div>

                <div className="home-features-grid">
                    {features.map((feature) => (
                        <div className="home-feature-card" key={feature.title}>
                            <div className="home-feature-icon">{feature.icon}</div>
                            <h3 className="home-feature-title">{feature.title}</h3>
                            <ul className="home-feature-list">
                                {feature.bullets.map((bullet) => (
                                    <li key={bullet}>{bullet}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA band */}
            <section className="home-cta">
                <h2 className="home-cta-title">Start predicting churn before it happens</h2>
                <p className="home-cta-text">
                    Set up your dashboard in minutes and let the model flag who needs
                    attention first.
                </p>
                <button className="home-cta-btn" onClick={handleSignup}>
                    Create your account
                </button>
            </section>

            {/* Footer */}
            <footer className="home-footer">
                <div className="home-footer-logo">Keepify</div>
                <p className="home-footer-text">
                    By creating an account, you agree to our Terms of Service and Privacy
                    Policy. © 2026 Keepify.
                </p>
            </footer>

            {/* Auth overlay */}
            <AuthPage isOpen={authOpen} onClose={closeAuth} initialMode={authMode} />
        </div>
    );
};

export default Home;