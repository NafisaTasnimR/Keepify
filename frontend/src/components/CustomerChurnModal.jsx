import React, { useState, useEffect, useRef } from 'react';
import './CustomerChurnModal.css';
import { apiFetch } from '../api/client';

const DoughnutChart = ({ score, risk }) => {
    const canvasRef = useRef(null);
    const riskColor = { high: '#dc2626', medium: '#d97706', low: '#16a34a' }[risk] || '#9da6cc';

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const size = canvas.width;
        const cx = size / 2, cy = size / 2;
        const radius = size * 0.38;
        const thick = size * 0.12;
        const pct = score ?? 0;

        ctx.clearRect(0, 0, size, size);

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.07)';
        ctx.lineWidth = thick;
        ctx.stroke();

        const start = -Math.PI / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, start, start + Math.PI * 2 * pct);
        ctx.strokeStyle = riskColor;
        ctx.lineWidth = thick;
        ctx.lineCap = 'round';
        ctx.stroke();
    }, [score, risk, riskColor]);

    const pct = score != null ? Math.round(score * 100) : null;

    return (
        <div className="doughnut-wrapper">
            <canvas ref={canvasRef} width={160} height={160} className="doughnut-canvas" />
            <div className="doughnut-center">
                {pct !== null
                    ? <><span className="doughnut-pct" style={{ color: riskColor }}>{pct}%</span><span className="doughnut-sublabel">churn risk</span></>
                    : <span className="doughnut-sublabel">not scored</span>
                }
            </div>
        </div>
    );
};

const RiskBadge = ({ risk }) => {
    if (!risk) return <span className="cm-risk-badge cm-risk-none">Not Scored</span>;
    const labels = { high: 'High Risk', medium: 'Medium Risk', low: 'Low Risk' };
    return <span className={`cm-risk-badge cm-risk-${risk}`}>{labels[risk]}</span>;
};

const TYPE_CONFIG = {
    follow_up: { label: 'Follow Up', color: '#dc2626', bg: 'rgba(220,38,38,0.07)' },
    promotion: { label: 'Promotion', color: '#d97706', bg: 'rgba(245,158,11,0.07)' },
    upsell: { label: 'Upsell', color: '#2563eb', bg: 'rgba(37,99,235,0.07)' },
    restock: { label: 'Restock', color: '#7c3aed', bg: 'rgba(124,58,237,0.07)' },
};

const InsightCard = ({ insight, onDismiss }) => {
    const cfg = TYPE_CONFIG[insight.type] || TYPE_CONFIG.follow_up;
    return (
        <div className="cm-insight-card" style={{ borderLeftColor: cfg.color }}>

            <div className="cm-insight-top">
                <span className="cm-insight-tag" style={{ color: cfg.color, backgroundColor: cfg.bg }}>
                    {cfg.label}
                </span>
                <button className="cm-insight-dismiss" onClick={() => onDismiss(insight._id)}>
                    Dismiss
                </button>
            </div>

            <p className="cm-insight-desc">{insight.description}</p>

            <div className="cm-insight-action-box" style={{ borderColor: cfg.color, backgroundColor: cfg.bg }}>
                <span className="cm-insight-action-label" style={{ color: cfg.color }}>
                    Recommended Action
                </span>
                <span className="cm-insight-action-text">{insight.action}</span>
            </div>

        </div>
    );
};

const CustomerChurnModal = ({ customer, onClose, onScoreCustomer, scoring }) => {
    const [insights, setInsights] = useState([]);
    const [loadingInsights, setLoadingInsights] = useState(true);

    useEffect(() => {
        if (!customer) return;
        setLoadingInsights(true);
        apiFetch(`/api/insights/customer/${customer.id}`)
            .then(r => r.json())
            .then(data => setInsights(Array.isArray(data) ? data : []))
            .catch(() => setInsights([]))
            .finally(() => setLoadingInsights(false));
    }, [customer]);

    const handleDismiss = async (id) => {
        await apiFetch(`/api/insights/${id}/dismiss`, { method: 'PATCH' });
        setInsights(prev => prev.filter(i => i._id !== id));
    };

    if (!customer) return null;

    const fmt = (d) => d
        ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—';

    const stats = [
        { label: 'Total Orders', value: customer.totalOrders },
        { label: 'Total Spending', value: `৳${Number(customer.totalSpending).toLocaleString()}` },
        { label: 'Last Active', value: fmt(customer.lastActive) },
        { label: 'Customer Since', value: fmt(customer.createdAt) },
        ...(customer.phone ? [{ label: 'Phone', value: customer.phone }] : []),
    ];

    return (
        <div className="cm-overlay" onClick={onClose}>
            <div className="cm-modal" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="cm-header">
                    <div className="cm-header-left">
                        <div className="cm-avatar">{customer.name.charAt(0).toUpperCase()}</div>
                        <div>
                            <h2 className="cm-name">{customer.name}</h2>
                            <span className="cm-email">{customer.email}</span>
                        </div>
                    </div>
                    <button className="cm-close" onClick={onClose}>×</button>
                </div>

                {/* Top row: chart + stats */}
                <div className="cm-top-row">
                    <div className="cm-chart-block">
                        <DoughnutChart score={customer.churnScore} risk={customer.churnRisk} />
                        <RiskBadge risk={customer.churnRisk} />
                        <button
                            className="cm-rescore-btn"
                            onClick={() => onScoreCustomer(customer.id)}
                            disabled={scoring}
                        >
                            {scoring ? 'Scoring…' : 'Re-run Scoring'}
                        </button>
                    </div>

                    <div className="cm-divider-v" />

                    <div className="cm-stats-block">
                        {stats.map(s => (
                            <div className="cm-stat-row" key={s.label}>
                                <span className="cm-stat-label">{s.label}</span>
                                <span className="cm-stat-value">{s.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="cm-divider-h" />

                {/* AI Recommendations */}
                <div className="cm-insights-section">
                    <h3 className="cm-section-title">AI Recommendations</h3>

                    {loadingInsights ? (
                        <p className="cm-empty">Loading recommendations…</p>
                    ) : insights.length === 0 ? (
                        <p className="cm-empty">
                            No active recommendations. Run churn scoring to generate insights.
                        </p>
                    ) : (
                        <div className="cm-insights-list">
                            {insights.map(insight => (
                                <InsightCard
                                    key={insight._id}
                                    insight={insight}
                                    onDismiss={handleDismiss}
                                />
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default CustomerChurnModal;