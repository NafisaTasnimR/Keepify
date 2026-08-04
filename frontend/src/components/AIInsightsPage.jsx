import React, { useState, useEffect } from 'react';
import './AIInsightsPage.css';

// ─── Icons ────────────────────────────────────────────────────
const SalesIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
);
const ProductIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    </svg>
);
const CustomerIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
);
const CategoryIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
);
const RefreshIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
);

const SECTION_ICONS = {
    sales:      <SalesIcon />,
    products:   <ProductIcon />,
    customers:  <CustomerIcon />,
    categories: <CategoryIcon />,
};

const SEVERITY_CONFIG = {
    positive: { color: '#16a34a', bg: 'rgba(22,163,74,0.07)',  border: 'rgba(22,163,74,0.2)',  dot: '#16a34a' },
    warning:  { color: '#d97706', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.2)', dot: '#d97706' },
    neutral:  { color: '#2563eb', bg: 'rgba(37,99,235,0.07)',  border: 'rgba(37,99,235,0.2)',  dot: '#2563eb' },
};

// ─── Single insight row ───────────────────────────────────────
const InsightRow = ({ insight }) => {
    const cfg = SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.neutral;
    return (
        <div className="ai-insight-row" style={{ borderLeftColor: cfg.dot }}>
            <span className="ai-insight-dot" style={{ backgroundColor: cfg.dot }} />
            <p className="ai-insight-text">{insight.insight}</p>
        </div>
    );
};

// ─── Section card ─────────────────────────────────────────────
const SectionCard = ({ section }) => {
    const [open, setOpen] = useState(true);

    return (
        <div className="ai-section-card">
            <div className="ai-section-header" onClick={() => setOpen(o => !o)}>
                <div className="ai-section-title-row">
                    <span className="ai-section-icon">
                        {SECTION_ICONS[section.id] || <SalesIcon />}
                    </span>
                    <h3 className="ai-section-title">{section.title}</h3>
                    <span className="ai-section-count">{section.insights.length} insights</span>
                </div>
                <span className="ai-section-chevron">{open ? '▲' : '▼'}</span>
            </div>

            {open && (
                <div className="ai-section-body">
                    {section.insights.length === 0 ? (
                        <p className="ai-empty">No insights generated for this section.</p>
                    ) : (
                        section.insights.map((insight, i) => (
                            <InsightRow key={i} insight={insight} />
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Summary bar ──────────────────────────────────────────────
const SummaryBar = ({ sections }) => {
    const all      = sections.flatMap(s => s.insights);
    const positive = all.filter(i => i.severity === 'positive').length;
    const warnings = all.filter(i => i.severity === 'warning').length;
    const neutral  = all.filter(i => i.severity === 'neutral').length;

    return (
        <div className="ai-summary-bar">
            <div className="ai-summary-stat">
                <span className="ai-summary-dot" style={{ backgroundColor: '#16a34a' }} />
                <span className="ai-summary-num">{positive}</span>
                <span className="ai-summary-label">Positive</span>
            </div>
            <div className="ai-summary-divider" />
            <div className="ai-summary-stat">
                <span className="ai-summary-dot" style={{ backgroundColor: '#d97706' }} />
                <span className="ai-summary-num">{warnings}</span>
                <span className="ai-summary-label">Warnings</span>
            </div>
            <div className="ai-summary-divider" />
            <div className="ai-summary-stat">
                <span className="ai-summary-dot" style={{ backgroundColor: '#2563eb' }} />
                <span className="ai-summary-num">{neutral}</span>
                <span className="ai-summary-label">Observations</span>
            </div>
            <div className="ai-summary-divider" />
            <div className="ai-summary-stat">
                <span className="ai-summary-num">{all.length}</span>
                <span className="ai-summary-label">Total Insights</span>
            </div>
        </div>
    );
};

// ─── Main page ────────────────────────────────────────────────
const AIInsightsPage = () => {
    const [data,        setData]        = useState(null);
    const [loading,     setLoading]     = useState(true);
    const [refreshing,  setRefreshing]  = useState(false);
    const [error,       setError]       = useState('');

    const fetchInsights = async (forceRefresh = false) => {
        if (forceRefresh) setRefreshing(true);
        else setLoading(true);
        setError('');

        try {
            const url = `/api/ai-insights${forceRefresh ? '?refresh=true' : ''}`;
            const res = await fetch(url);
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
            {/* Header */}
            <div className="ai-page-header">
                <div>
                    <h1 className="ai-page-title">AI Insights</h1>
                    <p className="ai-page-subtitle">
                        {data?.fromCache ? 'Cached' : 'Generated'} · {fmt(data?.generatedAt)}
                    </p>
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

            {/* Summary bar */}
            {data?.sections && <SummaryBar sections={data.sections} />}

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