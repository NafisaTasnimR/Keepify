import React, { useEffect, useMemo, useState } from 'react';
import './AnalyticsPage.css';

const periodTabs = ['Daily', 'Weekly', 'Monthly'];

const periodConfig = {
    Daily: { daysBack: 7, interval: 'day', label: 'last 7 days' },
    Weekly: { daysBack: 30, interval: 'week', label: 'last 30 days' },
    Monthly: { daysBack: 365, interval: 'month', label: 'last 12 months' },
};

const formatCurrency = (value) => {
    const amount = Number(value) || 0;
    return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const buildDateRange = (daysBack) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - daysBack);

    return {
        start: start.toISOString(),
        end: end.toISOString(),
    };
};

const formatPeakLabel = (dateValue, interval) => {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return 'Unknown';
    }

    if (interval === 'month') {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            year: '2-digit',
        });
    }

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
};

const formatWeekdayLabel = (dateValue) => {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return 'Unknown';
    }

    return date.toLocaleDateString('en-US', {
        weekday: 'short',
    });
};

const AnalyticsPage = () => {
    const [selectedPeriod, setSelectedPeriod] = useState('Weekly');
    const [kpis, setKpis] = useState({ totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 });
    const [revenuePeaks, setRevenuePeaks] = useState([]);
    const [weekdayActivity, setWeekdayActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const period = periodConfig[selectedPeriod];

    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();

        const loadAnalytics = async () => {
            setLoading(true);
            setError('');

            try {
                const selectedRange = buildDateRange(period.daysBack);
                const activityRange = buildDateRange(7);

                const selectedParams = new URLSearchParams({
                    start: selectedRange.start,
                    end: selectedRange.end,
                    interval: period.interval,
                });

                const activityParams = new URLSearchParams({
                    start: activityRange.start,
                    end: activityRange.end,
                    interval: 'day',
                });

                const [kpisResponse, peaksResponse, activityResponse] = await Promise.all([
                    fetch(`/api/analytics/kpis?${selectedParams}`, { signal: controller.signal }),
                    fetch(`/api/analytics/peaks?${selectedParams}&limit=4`, { signal: controller.signal }),
                    fetch(`/api/analytics/trends?${activityParams}`, { signal: controller.signal }),
                ]);

                if (!kpisResponse.ok || !peaksResponse.ok || !activityResponse.ok) {
                    throw new Error('Failed to load analytics data');
                }

                const kpisPayload = await kpisResponse.json();
                const peaksPayload = await peaksResponse.json();
                const activityPayload = await activityResponse.json();

                if (cancelled) {
                    return;
                }

                setKpis({
                    totalRevenue: Number(kpisPayload?.data?.totalRevenue || 0),
                    totalOrders: Number(kpisPayload?.data?.totalOrders || 0),
                    avgOrderValue: Number(kpisPayload?.data?.avgOrderValue || 0),
                });

                setRevenuePeaks(
                    Array.isArray(peaksPayload?.data)
                        ? peaksPayload.data.map(item => ({
                            label: formatPeakLabel(item.date, period.interval),
                            value: Number(item.revenue || 0),
                        }))
                        : [],
                );

                setWeekdayActivity(
                    Array.isArray(activityPayload?.data)
                        ? activityPayload.data.map(item => ({
                            day: formatWeekdayLabel(item.date),
                            value: Number(item.revenue || 0),
                        }))
                        : [],
                );
            } catch (requestError) {
                if (requestError.name !== 'AbortError' && !cancelled) {
                    setError('Unable to load analytics from the backend right now.');
                    setKpis({ totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 });
                    setRevenuePeaks([]);
                    setWeekdayActivity([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadAnalytics();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [period.daysBack, period.interval]);

    const revenueRows = useMemo(() => {
        if (!revenuePeaks.length) {
            return [];
        }

        const maxRevenue = Math.max(...revenuePeaks.map(item => item.value), 1);

        return revenuePeaks.map(item => ({
            label: item.label,
            value: formatCurrency(item.value),
            width: Math.max((item.value / maxRevenue) * 100, 12),
        }));
    }, [revenuePeaks]);

    const activityRows = useMemo(() => {
        const weekOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const lookup = new Map(weekdayActivity.map(item => [item.day, item]));

        return weekOrder.map(day => lookup.get(day) || { day, value: 0 });
    }, [weekdayActivity]);

    const maxActivityValue = useMemo(
        () => Math.max(...activityRows.map(item => item.value), 1),
        [activityRows],
    );

    const topPeak = revenuePeaks[0];
    const topActivity = activityRows.reduce(
        (best, item) => (item.value > best.value ? item : best),
        { day: 'Mon', value: 0 },
    );

    const statusLabel = loading
        ? 'Loading analytics from the backend...'
        : error || `Updated from backend for the ${period.label}.`;

    const insightLead = error
        ? 'Analytics data is not available right now.'
        : `${formatCurrency(kpis.totalRevenue)} in revenue over the ${period.label}.`;

    const insightBody = error
        ? 'Check that the backend is running and the analytics routes are reachable.'
        : `Top revenue period: ${topPeak ? topPeak.label : 'none'}${topPeak ? ` at ${formatCurrency(topPeak.value)}` : ''}. Weekday activity is strongest on ${topActivity.day}, and the average order value is ${formatCurrency(kpis.avgOrderValue)}.`;

    return (
        <section className="analytics-page" aria-label="Analytics overview">
            <p className="analytics-status">{statusLabel}</p>

            <div className="analytics-tabs" role="tablist" aria-label="Analytics period">
                {periodTabs.map(periodName => (
                    <button
                        key={periodName}
                        type="button"
                        role="tab"
                        aria-selected={selectedPeriod === periodName}
                        className={`period-tab ${selectedPeriod === periodName ? 'active' : ''}`}
                        onClick={() => setSelectedPeriod(periodName)}
                    >
                        {periodName}
                    </button>
                ))}
            </div>

            <div className="analytics-grid">
                <article className="analytics-card revenue-card">
                    <div className="card-header">
                        <h2>Revenue peaks</h2>
                    </div>

                    <div className="revenue-list">
                        {loading ? (
                            <div className="card-placeholder">Loading revenue peaks...</div>
                        ) : revenueRows.length ? (
                            revenueRows.map(item => (
                                <div key={item.label} className="revenue-row">
                                    <span className="revenue-label">{item.label}</span>
                                    <div className="revenue-track" aria-hidden="true">
                                        <span className="revenue-fill" style={{ width: `${item.width}%` }} />
                                    </div>
                                    <span className="revenue-value">{item.value}</span>
                                </div>
                            ))
                        ) : (
                            <div className="card-placeholder">No revenue peaks found for this range.</div>
                        )}
                    </div>
                </article>

                <article className="analytics-card activity-card">
                    <div className="card-header">
                        <h2>Activity by weekday</h2>
                    </div>

                    <div className="activity-chart" aria-label="Weekday activity chart">
                        {loading ? (
                            <div className="card-placeholder">Loading weekday activity...</div>
                        ) : activityRows.length ? (
                            activityRows.map(item => {
                                const barHeight = Math.max((item.value / maxActivityValue) * 100, 14);

                                return (
                                    <div key={item.day} className="activity-column">
                                        <div className="activity-bar-shell">
                                            <span className="activity-bar" style={{ height: `${barHeight}%` }} />
                                        </div>
                                        <span className="activity-label">{item.day}</span>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="card-placeholder">No activity data found for this range.</div>
                        )}
                    </div>
                </article>
            </div>

            <article className="analytics-card insight-card">
                <div className="card-header">
                    <h2>Diagnostic insight</h2>
                </div>
                <p className="insight-lead">{insightLead}</p>
                <p className="insight-body">{insightBody}</p>
                <p className="insight-body">Orders tracked in this range: {kpis.totalOrders.toLocaleString()}</p>
            </article>
        </section>
    );
};

export default AnalyticsPage;
