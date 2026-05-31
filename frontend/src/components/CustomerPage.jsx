import React, { useState, useEffect, useCallback } from 'react';
import './CustomerPage.css';

// ─── SVG Icons ────────────────────────────────────────────────
const IconEdit = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);

const IconTrash = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
);

const IconRefresh = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
);

const IconScore = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
    </svg>
);

const IconUser = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const IconBox = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
);

const IconMegaphone = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
);

const IconTrendUp = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
    </svg>
);

const INSIGHT_ICONS = {
    follow_up: <IconUser />,
    restock: <IconBox />,
    promotion: <IconMegaphone />,
    upsell: <IconTrendUp />,
};

// ─── Risk Badge ───────────────────────────────────────────────
const RiskBadge = ({ risk }) => {
    if (!risk) return <span className="risk-badge risk-none">No Data</span>;
    const labels = { high: 'High Risk', medium: 'Medium Risk', low: 'Low Risk' };
    return <span className={`risk-badge risk-${risk}`}>{labels[risk]}</span>;
};

// ─── Insight Card ─────────────────────────────────────────────
const InsightCard = ({ insight, onDismiss }) => (
    <div className={`insight-card priority-${insight.priority}`}>
        <div className="insight-card-header">
            <span className="insight-type-icon">
                {INSIGHT_ICONS[insight.type] || <IconUser />}
            </span>
            <span className="insight-title">{insight.title}</span>
            <button
                className="insight-dismiss-btn"
                onClick={() => onDismiss(insight._id)}
                title="Dismiss"
            >×</button>
        </div>
        <p className="insight-description">{insight.description}</p>
        <div className="insight-action">
            <span className="insight-action-label">Suggested action</span>
            <span className="insight-action-text">{insight.action}</span>
        </div>
    </div>
);

// ─── Customer Drawer ──────────────────────────────────────────
const CustomerDrawer = ({ customer, onClose, onScoreCustomer, scoring }) => {
    const [insights, setInsights] = useState([]);
    const [loadingInsights, setLoadingInsights] = useState(true);

    useEffect(() => {
        if (!customer) return;
        setLoadingInsights(true);
        fetch(`/api/insights/customer/${customer.id}`)
            .then(r => r.json())
            .then(data => setInsights(Array.isArray(data) ? data : []))
            .catch(() => setInsights([]))
            .finally(() => setLoadingInsights(false));
    }, [customer]);

    const handleDismiss = async (insightId) => {
        await fetch(`/api/insights/${insightId}/dismiss`, { method: 'PATCH' });
        setInsights(prev => prev.filter(i => i._id !== insightId));
    };

    if (!customer) return null;

    const lastActive = customer.lastActive
        ? new Date(customer.lastActive).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric'
        })
        : 'Never';

    const joinDate = customer.createdAt
        ? new Date(customer.createdAt).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric'
        })
        : '—';

    return (
        <>
            <div className="drawer-backdrop" onClick={onClose} />
            <div className="customer-drawer">
                <div className="drawer-header">
                    <div className="drawer-customer-info">
                        <div className="drawer-avatar">
                            {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="drawer-customer-name">{customer.name}</h2>
                            <span className="drawer-customer-email">{customer.email}</span>
                        </div>
                    </div>
                    <button className="drawer-close-btn" onClick={onClose}>×</button>
                </div>

                <div className="drawer-risk-bar">
                    <RiskBadge risk={customer.churnRisk} />
                    {customer.churnScore !== null && customer.churnScore !== undefined && (
                        <span className="drawer-churn-score">
                            {Math.round(customer.churnScore * 100)}% churn probability
                        </span>
                    )}
                    <button
                        className="btn btn-score"
                        onClick={() => onScoreCustomer(customer.id)}
                        disabled={scoring}
                    >
                        <IconRefresh />
                        {scoring ? 'Scoring…' : 'Re-score'}
                    </button>
                </div>

                <div className="drawer-stats">
                    <div className="drawer-stat">
                        <span className="drawer-stat-label">Total Orders</span>
                        <span className="drawer-stat-value">{customer.totalOrders}</span>
                    </div>
                    <div className="drawer-stat">
                        <span className="drawer-stat-label">Total Spending</span>
                        <span className="drawer-stat-value">৳{Number(customer.totalSpending).toLocaleString()}</span>
                    </div>
                    <div className="drawer-stat">
                        <span className="drawer-stat-label">Last Active</span>
                        <span className="drawer-stat-value">{lastActive}</span>
                    </div>
                    <div className="drawer-stat">
                        <span className="drawer-stat-label">Customer Since</span>
                        <span className="drawer-stat-value">{joinDate}</span>
                    </div>
                    {customer.phone && (
                        <div className="drawer-stat">
                            <span className="drawer-stat-label">Phone</span>
                            <span className="drawer-stat-value">{customer.phone}</span>
                        </div>
                    )}
                </div>

                <div className="drawer-section">
                    <h3 className="drawer-section-title">AI Insights</h3>
                    {loadingInsights ? (
                        <p className="drawer-empty">Loading insights…</p>
                    ) : insights.length === 0 ? (
                        <p className="drawer-empty">No active insights for this customer.</p>
                    ) : (
                        <div className="drawer-insights">
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
        </>
    );
};

// ─── Add / Edit Customer Modal ────────────────────────────────
const CustomerFormModal = ({ customer, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: customer?.name || '',
        email: customer?.email || '',
        phone: customer?.phone || '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await onSave(formData);
        } catch (err) {
            setError(err.message || 'Failed to save customer');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="add-product-overlay">
            <div className="add-product-container">
                <h2>{customer ? 'Edit Customer' : 'Add New Customer'}</h2>
                <form onSubmit={handleSubmit} className="add-product-form">
                    <div className="form-section">
                        <label className="form-label">Full Name *</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="form-input"
                            placeholder="Enter full name"
                        />
                    </div>
                    <div className="form-section">
                        <label className="form-label">Email Address *</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="form-input"
                            placeholder="Enter email address"
                        />
                    </div>
                    <div className="form-section">
                        <label className="form-label">Phone</label>
                        <input
                            type="text"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="Enter phone number (optional)"
                        />
                    </div>
                    {error && <p className="form-error">{error}</p>}
                    <div className="form-buttons">
                        <button type="button" onClick={onCancel} className="btn btn-cancel">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-save" disabled={saving}>
                            {saving ? 'Saving…' : customer ? 'Update Customer' : 'Save Customer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────
const CustomerPage = () => {
    const [customers, setCustomers] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');
    const [riskFilter, setRiskFilter] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [scoringAll, setScoringAll] = useState(false);
    const [scoringId, setScoringId] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchCustomers = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page,
                limit: 10,
                sortBy,
                sortDir,
                ...(search && { search }),
            });
            const res = await fetch(`/api/customers?${params}`);
            const data = await res.json();

            let items = data.items || [];
            if (riskFilter) {
                items = items.filter(c => c.churnRisk === riskFilter);
            }

            setCustomers(items);
            setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
        } catch {
            showToast('Failed to load customers', 'error');
        } finally {
            setLoading(false);
        }
    }, [search, sortBy, sortDir, riskFilter]);

    useEffect(() => { fetchCustomers(1); }, [fetchCustomers]);

    const handleSort = (col) => {
        if (sortBy === col) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(col);
            setSortDir('desc');
        }
    };

    const handleSaveCustomer = async (formData) => {
        const method = editingCustomer ? 'PUT' : 'POST';
        const url = editingCustomer
            ? `/api/customers/${editingCustomer.id}`
            : '/api/customers';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Request failed');
        }

        showToast(editingCustomer ? 'Customer updated' : 'Customer added');
        setShowModal(false);
        setEditingCustomer(null);
        fetchCustomers(pagination.page);
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Delete this customer?')) return;
        const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Customer deleted');
            fetchCustomers(pagination.page);
            if (selectedCustomer?.id === id) setSelectedCustomer(null);
        } else {
            showToast('Failed to delete', 'error');
        }
    };

    const handleScoreCustomer = async (id) => {
        setScoringId(id);
        try {
            const res = await fetch(`/api/customers/${id}/score`, { method: 'POST' });
            if (!res.ok) throw new Error();
            const updated = await res.json();
            setCustomers(prev => prev.map(c => c.id === id ? updated : c));
            if (selectedCustomer?.id === id) setSelectedCustomer(updated);
            showToast('Churn score updated');
        } catch {
            showToast('Scoring failed — is the ML service running?', 'error');
        } finally {
            setScoringId(null);
        }
    };

    const handleScoreAll = async () => {
        setScoringAll(true);
        try {
            const res = await fetch('/api/customers/score-all', { method: 'POST' });
            const data = await res.json();
            showToast(`Scored ${data.success} customers`);
            fetchCustomers(pagination.page);
        } catch {
            showToast('Bulk scoring failed', 'error');
        } finally {
            setScoringAll(false);
        }
    };

    const SortIcon = ({ col }) => {
        if (sortBy !== col) return <span className="sort-icon">↕</span>;
        return <span className="sort-icon active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
    };

    return (
        <div className="customer-page">
            {toast && (
                <div className={`toast toast-${toast.type}`}>{toast.message}</div>
            )}

            <div className="page-header">
                <div>
                    <h1 className="page-title">Customers</h1>
                    <p className="page-subtitle">{pagination.total} total customers</p>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-score-all"
                        onClick={handleScoreAll}
                        disabled={scoringAll}
                    >
                        <IconScore />
                        {scoringAll ? 'Scoring…' : 'Run Churn Scoring'}
                    </button>
                    <button
                        className="btn btn-save"
                        onClick={() => { setEditingCustomer(null); setShowModal(true); }}
                    >
                        + Add Customer
                    </button>
                </div>
            </div>

            <div className="filters-bar">
                <input
                    type="text"
                    className="form-input search-input"
                    placeholder="Search by name or email…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <select
                    className="form-select"
                    value={riskFilter}
                    onChange={e => setRiskFilter(e.target.value)}
                >
                    <option value="">All Risk Levels</option>
                    <option value="high">High Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="low">Low Risk</option>
                </select>
            </div>

            <div className="table-wrapper">
                {loading ? (
                    <div className="table-loading">
                        <div className="spinner" />
                        <span>Loading customers…</span>
                    </div>
                ) : customers.length === 0 ? (
                    <div className="table-empty">
                        <p>No customers found.</p>
                    </div>
                ) : (
                    <table className="customer-table">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th className="sortable" onClick={() => handleSort('total_orders')}>
                                    Orders <SortIcon col="total_orders" />
                                </th>
                                <th className="sortable" onClick={() => handleSort('total_spending')}>
                                    Spending <SortIcon col="total_spending" />
                                </th>
                                <th className="sortable" onClick={() => handleSort('last_active')}>
                                    Last Active <SortIcon col="last_active" />
                                </th>
                                <th className="sortable" onClick={() => handleSort('churn_score')}>
                                    Churn Risk <SortIcon col="churn_score" />
                                </th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map(customer => (
                                <tr
                                    key={customer.id}
                                    className="customer-row"
                                    onClick={() => setSelectedCustomer(customer)}
                                >
                                    <td>
                                        <div className="customer-cell">
                                            <div className="table-avatar">
                                                {customer.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <span className="customer-name">{customer.name}</span>
                                                <span className="customer-email">{customer.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="td-number">{customer.totalOrders}</td>
                                    <td className="td-number">৳{Number(customer.totalSpending).toLocaleString()}</td>
                                    <td className="td-muted">
                                        {customer.lastActive
                                            ? new Date(customer.lastActive).toLocaleDateString('en-GB', {
                                                day: 'numeric', month: 'short', year: 'numeric'
                                            })
                                            : '—'}
                                    </td>
                                    <td>
                                        <RiskBadge risk={customer.churnRisk} />
                                    </td>
                                    <td>
                                        <div className="row-actions" onClick={e => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                className="action-btn"
                                                title="Edit customer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingCustomer(customer);
                                                    setShowModal(true);
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="action-btn-delete"
                                                title="Delete customer"
                                                onClick={(e) => handleDelete(customer.id, e)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {pagination.totalPages > 1 && (
                <div className="pagination">
                    <button
                        className="page-btn"
                        disabled={pagination.page <= 1}
                        onClick={() => fetchCustomers(pagination.page - 1)}
                    >← Prev</button>
                    <span className="page-info">
                        Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                        className="page-btn"
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => fetchCustomers(pagination.page + 1)}
                    >Next →</button>
                </div>
            )}

            {selectedCustomer && (
                <CustomerDrawer
                    customer={selectedCustomer}
                    onClose={() => setSelectedCustomer(null)}
                    onScoreCustomer={handleScoreCustomer}
                    scoring={scoringId === selectedCustomer.id}
                />
            )}

            {showModal && (
                <CustomerFormModal
                    customer={editingCustomer}
                    onSave={handleSaveCustomer}
                    onCancel={() => { setShowModal(false); setEditingCustomer(null); }}
                />
            )}
        </div>
    );
};

export default CustomerPage;