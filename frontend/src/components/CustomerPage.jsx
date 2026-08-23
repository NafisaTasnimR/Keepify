import React, { useState, useEffect, useCallback } from 'react';
import CustomerFormModal from './CustomerFormModal';
import CustomerChurnModal from './CustomerChurnModal';
import './CustomerPage.css';
import { apiFetch } from '../api/client';

const RiskBadge = ({ risk }) => {
    if (!risk) return <span className="risk-badge risk-none">No Data</span>;
    const labels = { high: 'High Risk', medium: 'Medium Risk', low: 'Low Risk' };
    return <span className={`risk-badge risk-${risk}`}>{labels[risk]}</span>;
};

const CustomerPage = () => {
    const [customers, setCustomers] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');
    const [riskFilter, setRiskFilter] = useState('');
    const [churnModal, setChurnModal] = useState(null);
    const [formModal, setFormModal] = useState(false);
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
                page, limit: 10, sortBy, sortDir,
                ...(search && { search }),
            });
            const res = await apiFetch(`/api/customers?${params}`);
            const data = await res.json();
            let items = data.items || [];
            if (riskFilter) items = items.filter(c => c.churnRisk === riskFilter);
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
        if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(col); setSortDir('desc'); }
    };

    const handleSaveCustomer = async (formData) => {
        const method = editingCustomer ? 'PUT' : 'POST';
        const url = editingCustomer
            ? `/api/customers/${editingCustomer.id}`
            : '/api/customers';
        const res = await apiFetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Request failed');
        }
        showToast(editingCustomer ? 'Customer updated' : 'Customer added');
        setFormModal(false);
        setEditingCustomer(null);
        fetchCustomers(pagination.page);
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Delete this customer?')) return;
        const res = await apiFetch(`/api/customers/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Customer deleted');
            fetchCustomers(pagination.page);
            if (churnModal?.id === id) setChurnModal(null);
        } else {
            showToast('Failed to delete', 'error');
        }
    };

    const handleScoreCustomer = async (id) => {
        setScoringId(id);
        try {
            const res = await apiFetch(`/api/customers/${id}/score`, { method: 'POST' });
            if (!res.ok) throw new Error();
            const updated = await res.json();
            setCustomers(prev => prev.map(c => c.id === id ? updated : c));
            if (churnModal?.id === id) setChurnModal(updated);
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
            const res = await apiFetch('/api/customers/score-all', { method: 'POST' });
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
                    <p className="page-subtitle">{pagination.total} total customers</p>
                </div>
                <div className="header-actions">
                    <button
                        className="add-product-button secondary-btn"
                        onClick={handleScoreAll}
                        disabled={scoringAll}
                    >
                        {scoringAll ? 'Scoring…' : 'Run Churn Scoring'}
                    </button>
                    <button
                        className="add-product-button"
                        onClick={() => { setEditingCustomer(null); setFormModal(true); }}
                    >
                        Add Customer
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
                    className="form-select filter-select"
                    value={riskFilter}
                    onChange={e => setRiskFilter(e.target.value)}
                >
                    <option value="">All Risk Levels</option>
                    <option value="high">High Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="low">Low Risk</option>
                </select>
            </div>

            <div className="card products-card">
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
                    <table className="products-page-table">
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
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map(customer => (
                                <tr
                                    key={customer.id}
                                    className="customer-row"
                                    onClick={() => setChurnModal(customer)}
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
                                    <td>{customer.totalOrders}</td>
                                    <td>৳{Number(customer.totalSpending).toLocaleString()}</td>
                                    <td className="td-muted">
                                        {customer.lastActive
                                            ? new Date(customer.lastActive).toLocaleDateString('en-GB', {
                                                day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
                                            })
                                            : '—'}
                                    </td>
                                    <td><RiskBadge risk={customer.churnRisk} /></td>
                                    <td>
                                        <div className="action-buttons" onClick={e => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                className="edit-product-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingCustomer(customer);
                                                    setFormModal(true);
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="delete-product-btn"
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

            {churnModal && (
                <CustomerChurnModal
                    customer={churnModal}
                    onClose={() => setChurnModal(null)}
                    onScoreCustomer={handleScoreCustomer}
                    scoring={scoringId === churnModal.id}
                />
            )}

            {formModal && (
                <CustomerFormModal
                    customer={editingCustomer}
                    onSave={handleSaveCustomer}
                    onCancel={() => { setFormModal(false); setEditingCustomer(null); }}
                />
            )}
        </div>
    );
};

export default CustomerPage;