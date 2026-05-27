import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';
import ProductsView from './ProductsView';
import './Dashboard.css';
const EMPTY_SALES_DATA = [
    { day: 'Mon', value: 0 },
    { day: 'Tue', value: 0 },
    { day: 'Wed', value: 0 },
    { day: 'Thu', value: 0 },
    { day: 'Fri', value: 0 },
    { day: 'Sat', value: 0 },
    { day: 'Sun', value: 0 },
];

const formatCurrency = (value, currencySymbol = '$') => {
    const amount = Number(value);
    if (Number.isNaN(amount)) {
        return `${currencySymbol}0`;
    }

    return `${currencySymbol}${amount.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
};

const Dashboard = () => {
    const [activeMenu, setActiveMenu] = useState('Dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [kpis, setKpis] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
    });
    const [salesData, setSalesData] = useState(EMPTY_SALES_DATA);
    const [analyticsError, setAnalyticsError] = useState('');

    const chartRef = useRef(null);
    const [chartHeight, setChartHeight] = useState(160);

    // Measure the actual chart container height so bars always fill it
    useEffect(() => {
        const measure = () => {
            if (chartRef.current) {
                setChartHeight(chartRef.current.clientHeight);
            }
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    const fetchAnalytics = async () => {
        setAnalyticsError('');

        try {
            const [kpisResponse, trendsResponse] = await Promise.all([
                fetch('/api/analytics/kpis'),
                fetch('/api/analytics/trends'),
            ]);

            if (!kpisResponse.ok || !trendsResponse.ok) {
                throw new Error('Failed to load analytics');
            }

            const kpisPayload = await kpisResponse.json();
            const kpisData = kpisPayload?.data || {};
            setKpis({
                totalRevenue: Number(kpisData.totalRevenue || 0),
                totalOrders: Number(kpisData.totalOrders || 0),
                avgOrderValue: Number(kpisData.avgOrderValue || 0),
            });

            const trendsPayload = await trendsResponse.json();
            const trendItems = Array.isArray(trendsPayload?.data) ? trendsPayload.data : [];
            const mapped = trendItems.map(item => ({
                day: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
                value: Number(item.revenue || 0),
            }));

            const trimmed = mapped.slice(-7);
            setSalesData(trimmed.length ? trimmed : EMPTY_SALES_DATA);
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
        fetchAnalytics();
    }, []);

    const kpiNote = analyticsError ? 'No data yet' : 'Updated from analytics';
    const kpiChangeType = analyticsError ? 'alert' : 'positive';

    const metrics = [
        { label: 'Total revenue', value: formatCurrency(kpis.totalRevenue), change: kpiNote, changeType: kpiChangeType },
        { label: 'Total orders', value: kpis.totalOrders.toLocaleString(), change: kpiNote, changeType: kpiChangeType },
        { label: 'Avg order value', value: formatCurrency(kpis.avgOrderValue), change: kpiNote, changeType: kpiChangeType },
        { label: 'Churn alerts', value: '9', change: 'High risk customers', changeType: 'alert' },
    ];

    const churnAlerts = [
        { name: 'Sarah Islam', days: '48 days inactive', risk: 'High' },
        { name: 'Rafiq Uddin', days: '41 days inactive', risk: 'High' },
        { name: 'Mitu Akter', days: '29 days inactive', risk: 'Medium' },
        { name: 'Tanvir Hasan', days: '25 days inactive', risk: 'Medium' },
    ];

    const topProducts = [
        { name: 'Premium Plan', unitsSold: 312, revenue: '$15,600', trend: '+18%', trendType: 'positive' },
        { name: 'Standard Pack', unitsSold: 204, revenue: '$6,120', trend: '+7%', trendType: 'positive' },
        { name: 'Add-on Bundle', unitsSold: 97, revenue: '$2,910', trend: '−4%', trendType: 'negative' },
    ];

    const maxValue = Math.max(...salesData.map(d => d.value), 1);
    // Reserve ~24px for the day labels below each bar
    const BAR_AREA = Math.max(chartHeight - 24, 40);

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
                { key: 'Outreach', label: 'Outreach', badge: '9' },
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

            <main className="main-content">
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
                        <span className="company-name">Demo Corp</span>
                        <div className="profile-avatar">DC</div>
                    </div>
                </header>

                <div className="dashboard-content">
                    {activeMenu === 'Products' ? (
                        <ProductsView />
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
                                {/* Sales bar chart */}
                                <div className="card sales-card">
                                    <h3>Sales this week</h3>
                                    <div className="chart-wrapper" ref={chartRef}>
                                        <div className="bars">
                                            {salesData.map((item, i) => (
                                                <div key={i} className="bar-container">
                                                    <div
                                                        className="bar"
                                                        style={{ height: `${Math.round((item.value / maxValue) * BAR_AREA)}px` }}
                                                        title={`${item.day}: ${item.value}`}
                                                    />
                                                    <span className="bar-label">{item.day}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Churn alerts */}
                                <div className="card churn-card">
                                    <h3>Churn alerts</h3>
                                    <div className="alerts-list">
                                        {churnAlerts.map((alert, i) => (
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
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Top products table */}
                            <div className="card top-products-card">
                                <h3>Top products</h3>
                                <table className="products-table">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Units sold</th>
                                            <th>Revenue</th>
                                            <th>Trend</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topProducts.map((product, i) => (
                                            <tr key={i}>
                                                <td>{product.name}</td>
                                                <td>{product.unitsSold}</td>
                                                <td>{product.revenue}</td>
                                                <td>
                                                    <span className={`trend ${product.trendType}`}>
                                                        {product.trend}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;