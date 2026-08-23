import React, { useState, useEffect } from 'react';
import './AIInsightsPage.css';
import { apiFetch } from '../api/client';

// ─── Icons ────────────────────────────────────────────────────
const SalesIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
);
const ProductIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
);
const CustomerIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);
const CategoryIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
);
const RefreshIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
);
const ChevronIcon = ({ open }) => (
    <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"
        style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s ease' }}
    >
        <polyline points="6 9 12 15 18 9" />
    </svg>
);
const TrendUpIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
);
const AlertIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);
const InfoIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
);

// ─── Mini mascot (decorative) ───────────────────────────────
const MiniMascot = () => (
    <svg width="24" height="24" viewBox="0 0 44 44" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
        <line x1="22" y1="4" x2="22" y2="9" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="22" cy="3.5" r="2.25" fill="var(--accent)" />
        <rect x="6" y="9" width="32" height="27" rx="11" fill="var(--accent)" fillOpacity="0.14" stroke="var(--accent)" strokeWidth="2" />
        <g>
            <circle cx="16.5" cy="22" r="2.6" fill="var(--accent)" />
            <circle cx="27.5" cy="22" r="2.6" fill="var(--accent)" />
        </g>
        <path d="M16 28.5c1.6 1.7 4 2.6 6 2.6s4.4-0.9 6-2.6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
);

const SECTION_ICONS = {
    sales: <SalesIcon />,
    products: <ProductIcon />,
    customers: <CustomerIcon />,
    categories: <CategoryIcon />,
};

const SEVERITY_CONFIG = {
    positive: { color: '#16a34a', label: 'Growth', icon: <TrendUpIcon /> },
    warning: { color: '#d97706', label: 'Attention', icon: <AlertIcon /> },
    neutral: { color: '#2563eb', label: 'Observation', icon: <InfoIcon /> },
};

// ─── Render insight text with **bold** markers ──────────────
const renderRichText = (text = '') => {
    const parts = text.split(/(\*\*.*?\*\*)/g).filter(Boolean);
    return parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
            ? <strong key={i}>{part.slice(2, -2)}</strong>
            : <React.Fragment key={i}>{part}</React.Fragment>
    );
};

// ─── Single insight row ──────────────────────────────────────
const InsightRow = ({ insight }) => {
    const cfg = SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.neutral;
    return (
        <div className="ai-insight-row" style={{ borderLeftColor: cfg.color }}>
            <span className="ai-insight-row-icon" style={{ color: cfg.color }}>
                {cfg.icon}
            </span>
            <div className="ai-insight-row-body">
                <p className="ai-insight-row-text">{renderRichText(insight.insight)}</p>
            </div>
            <span className="ai-insight-row-pill" style={{ color: cfg.color, borderColor: cfg.color }}>
                {cfg.label}
            </span>
        </div>
    );
};

// ─── Section card (no health ring) ──────────────────────────
const SectionCard = ({ section }) => {
    const [open, setOpen] = useState(true);
    return (
        <div className="ai-section-card">
            <div
                className="ai-section-header"
                onClick={() => setOpen(o => !o)}
                role="button"
                tabIndex={0}
                aria-expanded={open}
            >
                <div className="ai-section-title-row">
                    <span className="ai-section-icon">
                        {SECTION_ICONS[section.id] || <SalesIcon />}
                    </span>
                    <h3 className="ai-section-title">{section.title}</h3>
                </div>
                <div className="ai-section-meta">
                    <span className="ai-section-count">{section.insights.length}</span>
                    <span className="ai-section-chevron"><ChevronIcon open={open} /></span>
                </div>
            </div>
            {open && (
                <div className="ai-section-body-list">
                    {section.insights.length === 0 ? (
                        <p className="ai-empty">No insights generated for this section.</p>
                    ) : (
                        section.insights.map((insight, i) => <InsightRow key={i} insight={insight} />)
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Main component ──────────────────────────────────────────
const AIInsightsPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const fetchInsights = async (forceRefresh = false) => {
        if (forceRefresh) setRefreshing(true);
        else setLoading(true);
        setError('');
        try {
            const url = `/api/ai-insights${forceRefresh ? '?refresh=true' : ''}`;
            const res = await apiFetch(url);
            if (!res.ok) throw new Error('Failed to load insights');
            const json = await res.json();
            setData(json);
        } catch (err) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchInsights(); }, []);

    const fmt = (iso) => iso
        ? new Date(iso).toLocaleString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
        : '';

    if (loading) {
        return (
            <div className="ai-page">
                <div className="ai-loading">
                    <div className="ai-spinner" />
                    <p className="ai-loading-text">Generating AI insights from your business data…</p>
                    <p className="ai-loading-sub">This may take a few seconds</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="ai-page">
                <div className="ai-error">
                    <p className="ai-error-title">Failed to load insights</p>
                    <p className="ai-error-sub">{error}</p>
                    <button className="ai-retry-btn" onClick={() => fetchInsights()}>Try Again</button>
                </div>
            </div>
        );
    }

    return (
        <div className="ai-page">
            <div className="ai-page-header">
                <div className="ai-page-title-group">
                    <span className="ai-page-mascot"><MiniMascot /></span>
                    <div>
                        <p className="ai-page-subtitle">
                            {data?.fromCache ? 'Cached' : 'Generated'} · {fmt(data?.generatedAt)}
                        </p>
                    </div>
                </div>
                <button
                    className="ai-refresh-btn"
                    onClick={() => fetchInsights(true)}
                    disabled={refreshing}
                >
                    <RefreshIcon />
                    {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
            </div>

            {/* Section cards */}
            <div className="ai-sections">
                {data?.sections?.map(section => (
                    <SectionCard key={section.id} section={section} />
                ))}
            </div>
        </div>
    );
};

export default AIInsightsPage;