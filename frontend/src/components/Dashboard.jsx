import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import ProductsView from './ProductsView';
import OrdersView from './OrdersView';
import AnalyticsPage from './AnalyticsPage';
import CustomerPage from './CustomerPage';
import OutreachPage from './OutreachPage';
import AIInsightsPage from './AIInsightsPage';
import Settings from './Settings';
import AuthPage from './AuthPage';
import './Dashboard.css';
import { apiFetch } from '../api/client';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';

const EMPTY_SALES_DATA = [
    { day: 'Mon', value: 0 },
    { day: 'Tue', value: 0 },
    { day: 'Wed', value: 0 },
    { day: 'Thu', value: 0 },
    { day: 'Fri', value: 0 },
    { day: 'Sat', value: 0 },
    { day: 'Sun', value: 0 },
];

const STATUS_COLOR_MAP = {
    active: '#1f9d63',
    'in-stock': '#1f9d63',
    'low-stock': '#d97706',
    'out-of-stock': '#dc2626',
    inactive: '#7c9186',
    draft: '#7c9186',
};

const FALLBACK_DONUT_COLORS = ['#467a63', '#98fbcb', '#24392f', '#305040'];

const formatCurrency = (value, currencySymbol = '৳') => {
    const amount = Number(value);
    if (Number.isNaN(amount)) {
        return `${currencySymbol}0`;
    }

    return `${currencySymbol}${amount.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
};

const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
};

const formatStatusLabel = (status) => {
    if (!status) return 'Unknown';
    return status
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

// Reusable donut/pie chart built with plain SVG — no charting library needed.
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

const Dashboard = () => {
    const navigate = useNavigate();
    const [activeMenu, setActiveMenu] = useState('Dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [userInfo, setUserInfo] = useState({ name: 'User', email: '' });
    const [kpis, setKpis] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
    });
    const [salesData, setSalesData] = useState(EMPTY_SALES_DATA);
    const [churnAlerts, setChurnAlerts] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [analyticsError, setAnalyticsError] = useState('');
    const [chartView, setChartView] = useState('bar');
    const [hoveredPoint, setHoveredPoint] = useState(null);
    const [hoveredChurnIndex, setHoveredChurnIndex] = useState(null);
    const [hoveredStatusIndex, setHoveredStatusIndex] = useState(null);
    const [hoveredPerfIndex, setHoveredPerfIndex] = useState(null);
    const [hoveredStockIndex, setHoveredStockIndex] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/');
            return;
        }

        // Fetch user profile settings
        const fetchUserProfile = async () => {
            try {
                const res = await apiFetch('/api/settings/me');
                if (res.ok) {
                    const data = await res.json();
                    setUserInfo({ name: data.name || 'User', email: data.email || '' });
                } else {
                    const saved = localStorage.getItem('user');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        setUserInfo({ name: parsed.name || 'User', email: parsed.email || '' });
                    }
                }
            } catch (e) {
                // ignore
            }
        };

        fetchUserProfile();
    }, [navigate]);

    const chartRef = useRef(null);
    const [chartSize, setChartSize] = useState({ width: 600, height: 160 });

    // Measure the actual chart box (width AND height) with a ResizeObserver so the
    // chart always matches its real rendered size — independent of any other card.
    useEffect(() => {
        const node = chartRef.current;
        if (!node) return undefined;

        const measure = () => {
            setChartSize({
                width: node.clientWidth || 600,
                height: node.clientHeight || 160,
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

    const fetchDashboardData = async () => {
        setAnalyticsError('');

        try {
            const [kpisResponse, trendsResponse, customersResponse, productsResponse] = await Promise.all([
                apiFetch('/api/analytics/kpis'),
                apiFetch('/api/analytics/trends'),
                apiFetch('/api/customers?risk=high,medium&limit=10'),
                apiFetch('/api/products?limit=5'),
            ]);

            if (kpisResponse.ok) {
                const kpisPayload = await kpisResponse.json();
                const kpisData = kpisPayload?.data || {};
                setKpis({
                    totalRevenue: Number(kpisData.totalRevenue || 0),
                    totalOrders: Number(kpisData.totalOrders || 0),
                    avgOrderValue: Number(kpisData.avgOrderValue || 0),
                });
            }

            if (trendsResponse.ok) {
                const trendsPayload = await trendsResponse.json();
                const trendItems = Array.isArray(trendsPayload?.data) ? trendsPayload.data : [];
                const mapped = trendItems.map(item => ({
                    day: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
                    value: Number(item.revenue || 0),
                }));

                const trimmed = mapped.slice(-7);
                setSalesData(trimmed.length ? trimmed : EMPTY_SALES_DATA);
            }

            if (customersResponse.ok) {
                const custPayload = await customersResponse.json();
                const custItems = custPayload?.items || [];
                const formattedAlerts = custItems.map(c => {
                    const days = c.lastActive
                        ? `${Math.floor((Date.now() - new Date(c.lastActive).getTime()) / (1000 * 60 * 60 * 24))} days inactive`
                        : 'never purchased';
                    return {
                        name: c.name,
                        days,
                        risk: c.churnRisk === 'high' ? 'High' : 'Medium',
                    };
                });
                setChurnAlerts(formattedAlerts);
            }

            if (productsResponse.ok) {
                const prodPayload = await productsResponse.json();
                const prodItems = prodPayload?.items || [];
                setTopProducts(prodItems);
            }

        } catch (error) {
            setKpis({
                totalRevenue: 0,
                totalOrders: 0,
                avgOrderValue: 0,
            });
            setSalesData(EMPTY_SALES_DATA);
            setAnalyticsError('Unable to load analytics right now.');
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [activeMenu]);

    const kpiNote = kpis.totalOrders === 0 ? 'No data yet' : 'Updated from analytics';
    const kpiChangeType = kpis.totalOrders === 0 ? 'neutral' : 'positive';

    const metrics = [
        { label: 'Total revenue', value: formatCurrency(kpis.totalRevenue), change: kpiNote, changeType: kpiChangeType },
        { label: 'Total orders', value: kpis.totalOrders.toLocaleString(), change: kpiNote, changeType: kpiChangeType },
        { label: 'Avg order value', value: formatCurrency(kpis.avgOrderValue), change: kpiNote, changeType: kpiChangeType },
        { label: 'Churn alerts', value: churnAlerts.length.toString(), change: 'At-risk customers', changeType: churnAlerts.length > 0 ? 'alert' : 'neutral' },
    ];

    const maxValue = Math.max(...salesData.map(d => d.value), 1);
    const hasSalesThisWeek = salesData.some(d => d.value > 0);
    const BAR_AREA = Math.max(chartSize.height - 24, 40);

    // Derived points/paths for the interactive line-chart view of the same sales data.
    const areaBaseline = chartSize.height - 24;
    const linePoints = salesData.map((item, i) => {
        const x = salesData.length > 1 ? (i / (salesData.length - 1)) * chartSize.width : chartSize.width / 2;
        const y = areaBaseline - (item.value / maxValue) * BAR_AREA;
        return { ...item, x, y };
    });
    const linePath = linePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${linePoints[linePoints.length - 1].x} ${areaBaseline} L ${linePoints[0].x} ${areaBaseline} Z`;
    const weeklyAverage = salesData.reduce((sum, d) => sum + d.value, 0) / (salesData.length || 1);
    const avgLineY = areaBaseline - (weeklyAverage / maxValue) * BAR_AREA;
    const formattedAvg = formatCurrency(weeklyAverage);

    // Churn risk pie/donut — built from the same churnAlerts already on screen.
    const churnRiskBreakdown = [
        { label: 'High risk', value: churnAlerts.filter((a) => a.risk === 'High').length, color: '#dc2626' },
        { label: 'Medium risk', value: churnAlerts.filter((a) => a.risk === 'Medium').length, color: '#d97706' },
    ].filter((item) => item.value > 0);

    // Product status pie/donut — built from the same topProducts already on screen.
    const statusCounts = topProducts.reduce((acc, product) => {
        const key = (product.status || 'unknown').toLowerCase();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    const productStatusBreakdown = Object.entries(statusCounts).map(([status, count], idx) => ({
        label: formatStatusLabel(status),
        value: count,
        color: STATUS_COLOR_MAP[status] || FALLBACK_DONUT_COLORS[idx % FALLBACK_DONUT_COLORS.length],
    }));

    // Product performance pie/donut — based on the trend percentage from the API.
    const perfData = topProducts.map((p, i) => {
        const perfValue = parseInt(p.performance?.replace(/[+%]/g, '') || '0', 10);
        return {
            label: p.name,
            value: Math.abs(perfValue),
            actualValue: p.performance,
            color: FALLBACK_DONUT_COLORS[i % FALLBACK_DONUT_COLORS.length],
        };
    }).filter(d => d.value !== 0);

    // Stock pie/donut — based on current stock levels.
    const stockData = topProducts.map((p, i) => ({
        label: p.name,
        value: p.stock || 0,
        color: FALLBACK_DONUT_COLORS[i % FALLBACK_DONUT_COLORS.length],
    })).filter(d => d.value > 0);

    const navSections = [
        {
            title: 'Main',
            items: [
                { key: 'Dashboard', label: 'Dashboard' },
                { key: 'Orders', label: 'Orders' },
                { key: 'Customers', label: 'Customers' },
            ],
        },
        {
            title: 'Insights',
            items: [
                { key: 'Analytics', label: 'Analytics' },
                { key: 'AI', label: 'AI Insights' },
            ],
        },
        {
            title: 'Action',
            items: [
                { key: 'Outreach', label: 'Outreach', badge: churnAlerts.length ? churnAlerts.length.toString() : undefined },
            ],
        },
        {
            title: 'Manage',
            items: [
                { key: 'Products', label: 'Products' },
                { key: 'Settings', label: 'Settings' },
            ],
        },
    ];

    const handleSelectMenu = (menuKey) => {
        setActiveMenu(menuKey);
        setIsSidebarOpen(false);
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            // ignore — clearing local session below is what actually matters
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    return (
        <div className="dashboard-container">
            <Sidebar
                activeMenu={activeMenu}
                onSelect={handleSelectMenu}
                navSections={navSections}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
            {isSidebarOpen && (
                <button
                    type="button"
                    className="sidebar-backdrop"
                    onClick={() => setIsSidebarOpen(false)}
                    aria-label="Close navigation"
                />
            )}

            <main className={`main-content ${activeMenu === 'Analytics' ? 'analytics-mode' : ''}`}>
                <header className="dashboard-header">
                    <div className="header-left">
                        <button
                            type="button"
                            className="sidebar-toggle"
                            onClick={() => setIsSidebarOpen(true)}
                            aria-label="Open navigation"
                        >
                            <span className="toggle-bar" />
                            <span className="toggle-bar" />
                            <span className="toggle-bar" />
                        </button>
                        <h1>{activeMenu === 'AI' ? 'AI Insights' : activeMenu}</h1>
                    </div>
                    <div className="header-right">
                        <span className="company-name">{userInfo.name}</span>
                        <div className="profile-menu-wrapper">
                            <button
                                type="button"
                                className="profile-avatar"
                                onClick={() => setIsProfileMenuOpen((open) => !open)}
                                aria-label="Open profile menu"
                                aria-expanded={isProfileMenuOpen}
                            >
                                {getInitials(userInfo.name)}
                            </button>
                            {isProfileMenuOpen && (
                                <>
                                    <button
                                        type="button"
                                        className="profile-menu-backdrop"
                                        onClick={() => setIsProfileMenuOpen(false)}
                                        aria-label="Close profile menu"
                                    />
                                    <div className="profile-menu">
                                        <div className="profile-menu-info">
                                            <span className="profile-menu-name">{userInfo.name}</span>
                                            <span className="profile-menu-email">{userInfo.email}</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="profile-menu-signout"
                                            onClick={handleSignOut}
                                        >
                                            Sign out
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <div className="dashboard-content">
                    {activeMenu === 'Analytics' ? (
                        <AnalyticsPage />
                    ) : activeMenu === 'Products' ? (
                        <ProductsView />
                    ) : activeMenu === 'Orders' ? (
                        <OrdersView />
                    ) : activeMenu === 'Customers' ? (
                        <CustomerPage />
                    ) : activeMenu === 'AI' ? (
                        <AIInsightsPage />
                    ) : activeMenu === 'Outreach' ? (
                        <OutreachPage />
                    ) : activeMenu === 'Settings' ? (
                        <Settings />
                    ) : activeMenu === 'Auth' ? (
                        <AuthPage />
                    ) : (
                        <>
                            {/* Metric cards */}
                            <div className="metrics-grid">
                                {metrics.map((metric, i) => (
                                    <div key={i} className="metric-card">
                                        <p className="metric-label">{metric.label}</p>
                                        <h2 className="metric-value">{metric.value}</h2>
                                        <p className={`metric-change ${metric.changeType}`}>
                                            {metric.change}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Charts row */}
                            <div className="charts-section">
                                {/* Sales chart (bar / line toggle) */}
                                <div className="card sales-card">
                                    <div className="card-header-row">
                                        <h3>Sales this week</h3>
                                        <div className="chart-toggle" role="tablist" aria-label="Sales chart type">
                                            <button
                                                type="button"
                                                role="tab"
                                                aria-selected={chartView === 'bar'}
                                                className={chartView === 'bar' ? 'active' : ''}
                                                onClick={() => setChartView('bar')}
                                            >
                                                Bar
                                            </button>
                                            <button
                                                type="button"
                                                role="tab"
                                                aria-selected={chartView === 'line'}
                                                className={chartView === 'line' ? 'active' : ''}
                                                onClick={() => setChartView('line')}
                                            >
                                                Line
                                            </button>
                                        </div>
                                    </div>
                                    <div className="chart-wrapper" ref={chartRef}>
                                        {hasSalesThisWeek ? (
                                            chartView === 'bar' ? (
                                                <>
                                                    <div className="sales-gridlines" aria-hidden="true">
                                                        <span />
                                                        <span />
                                                        <span />
                                                    </div>
                                                    <div className="bars">
                                                        {salesData.map((item, i) => {
                                                            const isPeak = item.value === maxValue && item.value > 0;
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className="bar-container"
                                                                    tabIndex={0}
                                                                    role="img"
                                                                    aria-label={`${item.day}: ${formatCurrency(item.value)}`}
                                                                >
                                                                    <div className="bar-tooltip">
                                                                        <strong>{formatCurrency(item.value)}</strong>
                                                                        <span>{item.day}</span>
                                                                    </div>
                                                                    <div
                                                                        className={`bar ${isPeak ? 'is-peak' : ''}`}
                                                                        style={{ height: `${Math.round((item.value / maxValue) * BAR_AREA)}px` }}
                                                                    />
                                                                    <span className="bar-label">{item.day}</span>
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
                                                        viewBox={`0 0 ${chartSize.width} ${chartSize.height}`}
                                                        preserveAspectRatio="none"
                                                        className="sales-line-svg"
                                                    >
                                                        <defs>
                                                            <linearGradient id="salesAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="0%" stopColor="#98fbcb" stopOpacity="0.5" />
                                                                <stop offset="100%" stopColor="#98fbcb" stopOpacity="0" />
                                                            </linearGradient>
                                                        </defs>
                                                        <line x1="0" y1={avgLineY} x2={chartSize.width} y2={avgLineY} className="sales-avg-line" />
                                                        <text x={4} y={avgLineY - 6} className="sales-avg-label">
                                                            Avg {formattedAvg}
                                                        </text>
                                                        <path d={areaPath} fill="url(#salesAreaGradient)" stroke="none" />
                                                        <path d={linePath} fill="none" stroke="#467a63" strokeWidth="2.5" />
                                                        {linePoints.map((p, i) => (
                                                            <circle
                                                                key={i}
                                                                cx={p.x}
                                                                cy={p.y}
                                                                r={hoveredPoint === i ? 6 : 4}
                                                                fill={p.value === maxValue ? '#467a63' : '#ffffff'}
                                                                stroke="#467a63"
                                                                strokeWidth="2"
                                                                className="sales-line-point"
                                                                tabIndex={0}
                                                                role="img"
                                                                aria-label={`${p.day}: ${formatCurrency(p.value)}`}
                                                                onMouseEnter={() => setHoveredPoint(i)}
                                                                onMouseLeave={() => setHoveredPoint(null)}
                                                                onFocus={() => setHoveredPoint(i)}
                                                                onBlur={() => setHoveredPoint(null)}
                                                            />
                                                        ))}
                                                    </svg>
                                                    {hoveredPoint !== null && linePoints[hoveredPoint] && (
                                                        <div
                                                            className="sales-line-tooltip"
                                                            style={{
                                                                left: `${linePoints[hoveredPoint].x}px`,
                                                                top: `${linePoints[hoveredPoint].y}px`,
                                                            }}
                                                        >
                                                            <strong>{formatCurrency(linePoints[hoveredPoint].value)}</strong>
                                                            <span>{linePoints[hoveredPoint].day}</span>
                                                        </div>
                                                    )}
                                                </>
                                            )
                                        ) : (
                                            <div className="sales-empty-state">
                                                <p>No sales recorded in the last 7 days.</p>
                                            </div>
                                        )}
                                    </div>
                                    {hasSalesThisWeek && chartView === 'line' && (
                                        <div className="sales-line-labels">
                                            {salesData.map((item, i) => (
                                                <span key={i}>{item.day}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Churn alerts */}
                                <div className="card churn-card">
                                    <h3>Churn alerts</h3>
                                    <div className="alerts-list">
                                        {churnAlerts.length > 0 ? (
                                            churnAlerts.map((alert, i) => (
                                                <div key={i} className="alert-item">
                                                    <div className="alert-content">
                                                        <span className={`alert-dot ${alert.risk === 'Medium' ? 'medium' : ''}`} />
                                                        <div className="alert-info">
                                                            <p className="alert-name">{alert.name}</p>
                                                            <p className="alert-days">{alert.days}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`risk-badge ${alert.risk.toLowerCase()}`}>
                                                        {alert.risk}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <p style={{ color: '#888', fontStyle: 'italic', padding: '12px 0' }}>
                                                No churn alerts found. Add customers and run scoring to see churn risks.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Pie/donut insight charts */}
                            <div className="insights-section">
                                <div className="card insight-card">
                                    <h3>Churn risk breakdown</h3>
                                    {churnAlerts.length > 0 ? (
                                        <>
                                            <div className="donut-chart-row">
                                                <div className="donut-svg-wrapper">
                                                    <DonutChart
                                                        data={churnRiskBreakdown}
                                                        centerValue={churnAlerts.length}
                                                        centerLabel="At risk"
                                                        hoveredIndex={hoveredChurnIndex}
                                                        onHover={setHoveredChurnIndex}
                                                    />
                                                </div>
                                                <div className="donut-legend">
                                                    {churnRiskBreakdown.map((item, i) => (
                                                        <div
                                                            key={item.label}
                                                            className={`legend-item ${hoveredChurnIndex === i ? 'is-active' : ''}`}
                                                            onMouseEnter={() => setHoveredChurnIndex(i)}
                                                            onMouseLeave={() => setHoveredChurnIndex(null)}
                                                        >
                                                            <span className="legend-swatch" style={{ backgroundColor: item.color }} />
                                                            <span className="legend-text">{item.label}</span>
                                                            <span className="legend-value">
                                                                {item.value} · {Math.round((item.value / churnAlerts.length) * 100)}%
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="insight-footnote">
                                                Based on the {churnAlerts.length} at-risk customers shown above.
                                            </p>
                                        </>
                                    ) : (
                                        <p style={{ color: '#888', fontStyle: 'italic', padding: '12px 0' }}>
                                            No churn risk data to display yet.
                                        </p>
                                    )}
                                </div>

                                <div className="card insight-card">
                                    <h3>Product status breakdown</h3>
                                    {topProducts.length > 0 ? (
                                        <>
                                            <div className="donut-chart-row">
                                                <div className="donut-svg-wrapper">
                                                    <DonutChart
                                                        data={productStatusBreakdown}
                                                        centerValue={topProducts.length}
                                                        centerLabel="Products"
                                                        hoveredIndex={hoveredStatusIndex}
                                                        onHover={setHoveredStatusIndex}
                                                    />
                                                </div>
                                                <div className="donut-legend">
                                                    {productStatusBreakdown.map((item, i) => (
                                                        <div
                                                            key={item.label}
                                                            className={`legend-item ${hoveredStatusIndex === i ? 'is-active' : ''}`}
                                                            onMouseEnter={() => setHoveredStatusIndex(i)}
                                                            onMouseLeave={() => setHoveredStatusIndex(null)}
                                                        >
                                                            <span className="legend-swatch" style={{ backgroundColor: item.color }} />
                                                            <span className="legend-text">{item.label}</span>
                                                            <span className="legend-value">
                                                                {item.value} · {Math.round((item.value / topProducts.length) * 100)}%
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="insight-footnote">
                                                Based on the {topProducts.length} products shown below.
                                            </p>
                                        </>
                                    ) : (
                                        <p style={{ color: '#888', fontStyle: 'italic', padding: '16px' }}>
                                            No products yet. Click on "Products" in the sidebar to add your first product.
                                        </p>
                                    )}
                                </div>

                                <div className="card insight-card">
                                    <h3>Product Performance</h3>
                                    {topProducts.length > 0 ? (
                                        <>
                                            <div className="donut-chart-row">
                                                <div className="donut-svg-wrapper">
                                                    <DonutChart
                                                        data={perfData}
                                                        centerValue={perfData.length > 0 ? 'Trend' : '0%'}
                                                        centerLabel="Growth"
                                                        hoveredIndex={hoveredPerfIndex}
                                                        onHover={setHoveredPerfIndex}
                                                    />
                                                </div>
                                                <div className="donut-legend">
                                                    {perfData.map((item, i) => (
                                                        <div
                                                            key={item.label}
                                                            className={`legend-item ${hoveredPerfIndex === i ? 'is-active' : ''}`}
                                                            onMouseEnter={() => setHoveredPerfIndex(i)}
                                                            onMouseLeave={() => setHoveredPerfIndex(null)}
                                                        >
                                                            <span className="legend-swatch" style={{ backgroundColor: item.color }} />
                                                            <span className="legend-text">{item.label}</span>
                                                            <span className="legend-value">
                                                                {item.actualValue} · {Math.round((item.value / perfData.reduce((sum, p) => sum + p.value, 0)) * 100) || 0}%
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="insight-footnote">
                                                Based on the {topProducts.length} top products.
                                            </p>
                                        </>
                                    ) : (
                                        <p style={{ color: '#888', fontStyle: 'italic', padding: '16px' }}>
                                            No product performance data available.
                                        </p>
                                    )}
                                </div>

                                <div className="card insight-card">
                                    <h3>Stock Levels</h3>
                                    {topProducts.length > 0 ? (
                                        <>
                                            <div className="donut-chart-row">
                                                <div className="donut-svg-wrapper">
                                                    <DonutChart
                                                        data={stockData}
                                                        centerValue={topProducts.reduce((sum, p) => sum + (p.stock || 0), 0)}
                                                        centerLabel="Total Stock"
                                                        hoveredIndex={hoveredStockIndex}
                                                        onHover={setHoveredStockIndex}
                                                    />
                                                </div>
                                                <div className="donut-legend">
                                                    {stockData.map((item, i) => (
                                                        <div
                                                            key={item.label}
                                                            className={`legend-item ${hoveredStockIndex === i ? 'is-active' : ''}`}
                                                            onMouseEnter={() => setHoveredStockIndex(i)}
                                                            onMouseLeave={() => setHoveredStockIndex(null)}
                                                        >
                                                            <span className="legend-swatch" style={{ backgroundColor: item.color }} />
                                                            <span className="legend-text">{item.label}</span>
                                                            <span className="legend-value">
                                                                {item.value} · {Math.round((item.value / topProducts.reduce((sum, p) => sum + (p.stock || 0), 0)) * 100) || 0}%
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="insight-footnote">
                                                Based on the {topProducts.length} top products.
                                            </p>
                                        </>
                                    ) : (
                                        <p style={{ color: '#888', fontStyle: 'italic', padding: '16px' }}>
                                            No stock data available.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;