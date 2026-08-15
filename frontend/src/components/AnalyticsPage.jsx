import React, { useEffect, useMemo, useState } from 'react';
import './AnalyticsPage.css';
import { apiFetch } from '../api/client';

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
    const [categoryBreakdown, setCategoryBreakdown] = useState([]);
    const [weekdayActivity, setWeekdayActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isClearingCache, setIsClearingCache] = useState(false);

    const period = periodConfig[selectedPeriod];

    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();

        const loadAnalytics = async () => {
            setLoading(true);
            setError('');

            try {
                const selectedRange = buildDateRange(period.daysBack);

                const selectedParams = new URLSearchParams({
                    start: selectedRange.start,
                    end: selectedRange.end,
                    interval: period.interval,
                });

                const activityParams = new URLSearchParams({
                    start: selectedRange.start,
                    end: selectedRange.end,
                    interval: 'day',
                });

                const [kpisResponse, categoryResponse, activityResponse] = await Promise.all([
                    apiFetch(`/api/analytics/kpis?${selectedParams}`, { signal: controller.signal }),
                    apiFetch(`/api/analytics/category-breakdown?${selectedParams}`, { signal: controller.signal }),
                    apiFetch(`/api/analytics/trends?${activityParams}`, { signal: controller.signal }),
                ]);

                if (!kpisResponse.ok || !categoryResponse.ok || !activityResponse.ok) {
                    throw new Error('Failed to load analytics data');
                }

                const kpisPayload = await kpisResponse.json();
                const categoryPayload = await categoryResponse.json();
                const activityPayload = await activityResponse.json();

                if (cancelled) {
                    return;
                }

                setKpis({
                    totalRevenue: Number(kpisPayload?.data?.totalRevenue || 0),
                    totalOrders: Number(kpisPayload?.data?.totalOrders || 0),
                    avgOrderValue: Number(kpisPayload?.data?.avgOrderValue || 0),
                });

                setCategoryBreakdown(
                    Array.isArray(categoryPayload?.data)
                        ? categoryPayload.data.map(item => ({
                            label: item.category || 'Uncategorized',
                            value: Number(item.revenue || 0),
                            percentage: Number(item.percentage || 0),
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
                    setCategoryBreakdown([]);
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

    const handleClearCache = async () => {
        if (!confirm('Are you sure you want to clear the analytics cache? This will force a fresh fetch from the database.')) {
            return;
        }

        setIsClearingCache(true);
        try {
            const response = await apiFetch('/api/analytics/cache', { method: 'DELETE' });
            if (!response.ok) {
                throw new Error('Failed to clear cache');
            }

            // Refresh data after clearing cache
            // We can trigger a re-run of the useEffect by updating a state or just calling the load function if it were extracted.
            // For now, we'll just alert success and the user can refresh or we can trigger a reload.
            alert('Analytics cache cleared successfully!');
            window.location.reload();
        } catch (err) {
            console.error('Clear cache error:', err);
            alert('An error occurred while clearing the analytics cache.');
        } finally {
            setIsClearingCache(false);
        }
    };

    const revenueRows = useMemo(() => {
        if (!categoryBreakdown.length) {
            return [];
        }

        const maxRevenue = Math.max(...categoryBreakdown.map(item => item.value), 1);

        return categoryBreakdown.map(item => ({
            label: item.label,
            value: formatCurrency(item.value),
            width: Math.max(item.percentage || (item.value / maxRevenue) * 100, 12),
        }));
    }, [categoryBreakdown]);

    const activityRows = useMemo(() => {
        const weekOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const totals = new Map(weekOrder.map(day => [day, 0]));

        weekdayActivity.forEach(item => {
            if (totals.has(item.day)) {
                totals.set(item.day, totals.get(item.day) + item.value);
            }
        });

        return weekOrder.map(day => ({ day, value: totals.get(day) }));
    }, [weekdayActivity]);

    const maxActivityValue = useMemo(
        () => Math.max(...activityRows.map(item => item.value), 1),
        [activityRows],
    );

    const topCategory = categoryBreakdown[0];
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
        : `Top category: ${topCategory ? topCategory.label : 'none'}${topCategory ? ` at ${formatCurrency(topCategory.value)}` : ''}. Weekday activity is strongest on ${topActivity.day}, and the average order value is ${formatCurrency(kpis.avgOrderValue)}.`;

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
                <button
                    className="period-tab clear-cache-btn"
                    onClick={handleClearCache}
                    disabled={isClearingCache}
                >
                    {isClearingCache ? 'Clearing...' : 'Clear Cache'}
                </button>
            </div>

            <div className="analytics-grid">
                <article className="analytics-card revenue-card">
                    <div className="card-header">
                        <h2>Revenue by category</h2>
                    </div>

                    <div className="revenue-list">
                        {loading ? (
                            <div className="card-placeholder">Loading category breakdown...</div>
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
                            <div className="card-placeholder">No category breakdown found for this range.</div>
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
                        ) : activityRows.some(item => item.value > 0) ? (
                            <>
                                <div className="activity-gridlines" aria-hidden="true">
                                    <span />
                                    <span />
                                    <span />
                                </div>
                                <div className="activity-bars">
                                    {activityRows.map(item => {
                                        const barHeight = item.value > 0
                                            ? Math.max((item.value / maxActivityValue) * 100, 6)
                                            : 0;
                                        const isPeak = item.value === maxActivityValue && item.value > 0;

                                        return (
                                            <div
                                                key={item.day}
                                                className="activity-column"
                                                tabIndex={0}
                                                role="img"
                                                aria-label={`${item.day}: ${formatCurrency(item.value)}`}
                                            >
                                                <div className="activity-tooltip">
                                                    <strong>{formatCurrency(item.value)}</strong>
                                                    <span>{item.day}</span>
                                                </div>
                                                <div className="activity-bar-track">
                                                    <span
                                                        className={`activity-bar ${isPeak ? 'is-peak' : ''}`}
                                                        style={{ height: `${barHeight}%` }}
                                                    />
                                                </div>
                                                <span className="activity-label">{item.day}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
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
