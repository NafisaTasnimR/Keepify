import React, { useEffect, useMemo, useRef, useState } from 'react';
import './AnalyticsPage.css';
import { apiFetch } from '../api/client';


const periodTabs = ['Daily', 'Weekly', 'Monthly'];


const periodConfig = {
    Daily: { daysBack: 7, interval: 'day', label: 'last 7 days' },
    Weekly: { daysBack: 30, interval: 'week', label: 'last 30 days' },
    Monthly: { daysBack: 365, interval: 'month', label: 'last 12 months' },
};


const CATEGORY_COLORS = ['#467a63', '#98fbcb', '#d97706', '#dc2626', '#24392f', '#7c9186', '#305040', '#1f9d63'];


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


// Reusable donut/pie chart built with plain SVG (mirrors the one on the main Dashboard).
const DonutChart = ({ data, size = 160, thickness = 22, centerValue, centerLabel, hoveredIndex, onHover }) => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;
    const cx = size / 2;
    const cy = size / 2;
    let cumulative = 0;


    return (
        <svg viewBox={`0 0 ${size} ${size}`} className="donut-svg" role="img" aria-label={`${centerLabel}: ${centerValue}`}>
            <g transform={`rotate(-90 ${cx} ${cy})`}>
                {total === 0 ? (
                    <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#eaf6ef" strokeWidth={thickness} />
                ) : (
                    data.map((d, i) => {
                        const fraction = d.value / total;
                        const dash = fraction * circumference;
                        const gap = circumference - dash;
                        const dashoffset = -cumulative;
                        cumulative += dash;
                        const isDimmed = hoveredIndex !== null && hoveredIndex !== undefined && hoveredIndex !== i;
                        return (
                            <circle
                                key={d.label}
                                cx={cx}
                                cy={cy}
                                r={radius}
                                fill="none"
                                stroke={d.color}
                                strokeWidth={hoveredIndex === i ? thickness + 4 : thickness}
                                strokeDasharray={`${dash} ${gap}`}
                                strokeDashoffset={dashoffset}
                                className="donut-segment"
                                style={{ opacity: isDimmed ? 0.45 : 1 }}
                                onMouseEnter={() => onHover(i)}
                                onMouseLeave={() => onHover(null)}
                                tabIndex={0}
                                onFocus={() => onHover(i)}
                                onBlur={() => onHover(null)}
                            />
                        );
                    })
                )}
            </g>
            <text x={cx} y={cy - 4} textAnchor="middle" className="donut-center-value">
                {centerValue}
            </text>
            <text x={cx} y={cy + 16} textAnchor="middle" className="donut-center-label">
                {centerLabel}
            </text>
        </svg>
    );
};


const AnalyticsPage = () => {
    const [selectedPeriod, setSelectedPeriod] = useState('Weekly');
    const [kpis, setKpis] = useState({ totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 });
    const [categoryBreakdown, setCategoryBreakdown] = useState([]);
    const [weekdayActivity, setWeekdayActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isClearingCache, setIsClearingCache] = useState(false);
    const [activityView, setActivityView] = useState('bar');
    const [hoveredActivityPoint, setHoveredActivityPoint] = useState(null);
    const [hoveredCategoryIndex, setHoveredCategoryIndex] = useState(null);


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


    // Measures the activity chart box (width + height) so the interactive line view
    // can plot points at exact pixel positions, matching the bar view's scale.
    const activityChartRef = useRef(null);
    const [activityChartSize, setActivityChartSize] = useState({ width: 600, height: 148 });


    useEffect(() => {
        const node = activityChartRef.current;
        if (!node) return undefined;


        const measure = () => {
            setActivityChartSize({
                width: node.clientWidth || 600,
                height: node.clientHeight || 148,
            });
        };


        measure();


        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(measure);
            observer.observe(node);
            return () => observer.disconnect();
        }


        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);


    const categoryDonutData = useMemo(
        () => categoryBreakdown.map((item, idx) => ({
            label: item.label,
            value: item.value,
            color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        })),
        [categoryBreakdown],
    );


    const categoryTotal = useMemo(
        () => Math.max(categoryBreakdown.reduce((sum, item) => sum + item.value, 0), 1),
        [categoryBreakdown],
    );


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


    // Derived geometry for the interactive line-chart view of the same activity data.
    const activityBaseline = activityChartSize.height - 26;
    const ACTIVITY_BAR_AREA = Math.max(activityChartSize.height - 26, 40);
    const activityLinePoints = activityRows.map((item, i) => {
        const x = activityRows.length > 1 ? (i / (activityRows.length - 1)) * activityChartSize.width : activityChartSize.width / 2;
        const y = activityBaseline - (item.value / maxActivityValue) * ACTIVITY_BAR_AREA;
        return { ...item, x, y };
    });
    const activityLinePath = activityLinePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const activityAreaPath = `${activityLinePath} L ${activityLinePoints[activityLinePoints.length - 1].x} ${activityBaseline} L ${activityLinePoints[0].x} ${activityBaseline} Z`;
    const activityAverage = activityRows.reduce((sum, item) => sum + item.value, 0) / (activityRows.length || 1);
    const activityAvgLineY = activityBaseline - (activityAverage / maxActivityValue) * ACTIVITY_BAR_AREA;


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


    const insightBody = 'Check that the backend is running and the analytics routes are reachable.';


    const analyticsMetrics = [
        { label: 'Total revenue', value: formatCurrency(kpis.totalRevenue), sub: `Over the ${period.label}` },
        { label: 'Total orders', value: kpis.totalOrders.toLocaleString(), sub: `Over the ${period.label}` },
        { label: 'Avg order value', value: formatCurrency(kpis.avgOrderValue), sub: `Over the ${period.label}` },
        {
            label: 'Top category',
            value: topCategory ? topCategory.label : '—',
            sub: topCategory ? formatCurrency(topCategory.value) : 'No data yet',
        },
    ];


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


            <div className="analytics-main-layout">
                <div className="analytics-content">
                    <div className="analytics-grid">
                        <article className="analytics-card revenue-card">
                            <div className="card-header">
                                <h2>Revenue by category</h2>
                            </div>


                            {loading ? (
                                <div className="card-placeholder">Loading category breakdown...</div>
                            ) : categoryDonutData.length ? (
                                <>
                                    <div className="donut-chart-row">
                                        <div className="donut-svg-wrapper">
                                            <DonutChart
                                                data={categoryDonutData}
                                                centerValue={formatCurrency(categoryTotal)}
                                                centerLabel="Revenue"
                                                hoveredIndex={hoveredCategoryIndex}
                                                onHover={setHoveredCategoryIndex}
                                            />
                                        </div>
                                        <div className="donut-legend">
                                            {categoryDonutData.map((item, i) => (
                                                <div
                                                    key={item.label}
                                                    className={`legend-item ${hoveredCategoryIndex === i ? 'is-active' : ''}`}
                                                    onMouseEnter={() => setHoveredCategoryIndex(i)}
                                                    onMouseLeave={() => setHoveredCategoryIndex(null)}
                                                >
                                                    <span className="legend-swatch" style={{ backgroundColor: item.color }} />
                                                    <span className="legend-text">{item.label}</span>
                                                    <span className="legend-value">
                                                        {formatCurrency(item.value)} · {Math.round((item.value / categoryTotal) * 100)}%
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="insight-footnote">
                                        Based on {categoryBreakdown.length} categories over the {period.label}.
                                    </p>
                                </>
                            ) : (
                                <div className="card-placeholder">No category breakdown found for this range.</div>
                            )}
                        </article>


                        <article className="analytics-card activity-card">
                            <div className="card-header-row">
                                <div className="card-header">
                                    <h2>Activity by weekday</h2>
                                </div>
                                <div className="chart-toggle" role="tablist" aria-label="Activity chart type">
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={activityView === 'bar'}
                                        className={activityView === 'bar' ? 'active' : ''}
                                        onClick={() => setActivityView('bar')}
                                    >
                                        Bar
                                    </button>
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={activityView === 'line'}
                                        className={activityView === 'line' ? 'active' : ''}
                                        onClick={() => setActivityView('line')}
                                    >
                                        Line
                                    </button>
                                </div>
                            </div>


                            <div className="activity-chart" aria-label="Weekday activity chart" ref={activityChartRef}>
                                {loading ? (
                                    <div className="card-placeholder">Loading weekday activity...</div>
                                ) : activityRows.some(item => item.value > 0) ? (
                                    activityView === 'bar' ? (
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
                                        <>
                                            <svg
                                                width="100%"
                                                height="100%"
                                                viewBox={`0 0 ${activityChartSize.width} ${activityChartSize.height}`}
                                                preserveAspectRatio="none"
                                                className="activity-line-svg"
                                            >
                                                <defs>
                                                    <linearGradient id="activityAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#98fbcb" stopOpacity="0.5" />
                                                        <stop offset="100%" stopColor="#98fbcb" stopOpacity="0" />
                                                    </linearGradient>
                                                </defs>
                                                <line
                                                    x1="0"
                                                    y1={activityAvgLineY}
                                                    x2={activityChartSize.width}
                                                    y2={activityAvgLineY}
                                                    className="activity-avg-line"
                                                />
                                                <text x={4} y={activityAvgLineY - 6} className="activity-avg-label">
                                                    Avg {formatCurrency(activityAverage)}
                                                </text>
                                                <path d={activityAreaPath} fill="url(#activityAreaGradient)" stroke="none" />
                                                <path d={activityLinePath} fill="none" stroke="#467a63" strokeWidth="2.5" />
                                                {activityLinePoints.map((p, i) => (
                                                    <circle
                                                        key={i}
                                                        cx={p.x}
                                                        cy={p.y}
                                                        r={hoveredActivityPoint === i ? 6 : 4}
                                                        fill={p.value === maxActivityValue ? '#467a63' : '#ffffff'}
                                                        stroke="#467a63"
                                                        strokeWidth="2"
                                                        className="activity-line-point"
                                                        tabIndex={0}
                                                        role="img"
                                                        aria-label={`${p.day}: ${formatCurrency(p.value)}`}
                                                        onMouseEnter={() => setHoveredActivityPoint(i)}
                                                        onMouseLeave={() => setHoveredActivityPoint(null)}
                                                        onFocus={() => setHoveredActivityPoint(i)}
                                                        onBlur={() => setHoveredActivityPoint(null)}
                                                    />
                                                ))}
                                            </svg>
                                            {hoveredActivityPoint !== null && activityLinePoints[hoveredActivityPoint] && (
                                                <div
                                                    className="activity-line-tooltip"
                                                    style={{
                                                        left: `${activityLinePoints[hoveredActivityPoint].x}px`,
                                                        top: `${activityLinePoints[hoveredActivityPoint].y}px`,
                                                    }}
                                                >
                                                    <strong>{formatCurrency(activityLinePoints[hoveredActivityPoint].value)}</strong>
                                                    <span>{activityLinePoints[hoveredActivityPoint].day}</span>
                                                </div>
                                            )}
                                        </>
                                    )
                                ) : (
                                    <div className="card-placeholder">No activity data found for this range.</div>
                                )}
                            </div>
                            {activityView === 'line' && !loading && activityRows.some(item => item.value > 0) && (
                                <div className="activity-line-labels">
                                    {activityRows.map(item => (
                                        <span key={item.day}>{item.day}</span>
                                    ))}
                                </div>
                            )}
                        </article>
                    </div>


                    <article className="analytics-card insight-card">
                        <div className="card-header">
                            <h2 className="insight-title">Diagnostic insight</h2>
                        </div>
                        <div className="insight-content">
                            <p className="insight-lead">{insightLead}</p>
                            {error ? (
                                <p className="insight-body">{insightBody}</p>
                            ) : (
                                <div className="insight-stat-grid">
                                    <div className="insight-stat-chip">
                                        <span className="insight-stat-chip-label">Best day</span>
                                        <span className="insight-stat-chip-value">{topActivity.day}</span>
                                        <span className="insight-stat-chip-sub">{formatCurrency(topActivity.value)}</span>
                                    </div>
                                    <div className="insight-stat-chip">
                                        <span className="insight-stat-chip-label">Revenue Share</span>
                                        <span className="insight-stat-chip-value">
                                            {topCategory ? Math.round((topCategory.value / categoryTotal) * 100) : 0}%
                                        </span>
                                        <span className="insight-stat-chip-sub">of total revenue</span>
                                    </div>
                                    <div className="insight-stat-chip">
                                        <span className="insight-stat-chip-label">Activity Peak</span>
                                        <span className="insight-stat-chip-value">{topActivity.day}</span>
                                        <span className="insight-stat-chip-sub">{formatCurrency(maxActivityValue)} peak</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </article>
                </div>


                <aside className="analytics-sidebar">
                    <p className="sidebar-title">Key Metrics</p>
                    <div className="analytics-metrics-vertical">
                        {analyticsMetrics.map((metric) => (
                            <div key={metric.label} className="analytics-metric-card">
                                <p className="analytics-metric-label">{metric.label}</p>
                                <h2 className="analytics-metric-value">{metric.value}</h2>
                                <p className="analytics-metric-sub">{metric.sub}</p>
                            </div>
                        ))}
                    </div>
                </aside>
            </div>
        </section>
    );
};


export default AnalyticsPage;
