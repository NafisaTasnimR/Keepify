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
    const [chartHeight, setChartHeight] = useState(160);

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
                                {/* Sales bar chart */}
                                <div className="card sales-card">
                                    <h3>Sales this week</h3>
                                    <div className="chart-wrapper" ref={chartRef}>
                                        {hasSalesThisWeek ? (
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
                                            <div className="sales-empty-state">
                                                <p>No sales recorded in the last 7 days.</p>
                                            </div>
                                        )}
                                    </div>
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

                            {/* Top products table */}
                            <div className="card top-products-card">
                                <h3>Products</h3>
                                {topProducts.length > 0 ? (
                                    <table className="products-table">
                                        <thead>
                                            <tr>
                                                <th>Product</th>
                                                <th>SKU</th>
                                                <th>Price</th>
                                                <th>Stock</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topProducts.map((product, i) => (
                                                <tr key={i}>
                                                    <td>{product.name}</td>
                                                    <td>{product.sku || 'N/A'}</td>
                                                    <td>{formatCurrency(product.price)}</td>
                                                    <td>{product.stock}</td>
                                                    <td>
                                                        <span className={`status-badge ${product.status}`}>
                                                            {product.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p style={{ color: '#888', fontStyle: 'italic', padding: '16px' }}>
                                        No products yet. Click on "Products" in the sidebar to add your first product.
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;