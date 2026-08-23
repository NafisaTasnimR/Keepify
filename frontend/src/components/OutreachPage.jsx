import React, { useState, useEffect, useCallback } from 'react';
import OutreachComposerModal from './OutreachComposerModal';
import './OutreachPage.css';
import { apiFetch } from '../api/client';

const RiskBadge = ({ risk }) => {
    if (!risk) return <span className="risk-badge risk-none">No Data</span>;
    const labels = { high: 'High Risk', medium: 'Medium Risk', low: 'Low Risk' };
    return <span className={`risk-badge risk-${risk}`}>{labels[risk]}</span>;
};

const OutreachPage = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [composerCustomer, setComposerCustomer] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchCandidates = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({
                risk: 'high,medium',
                limit: '100',
                sortBy: 'churn_score',
                sortDir: 'desc',
            });
            const res = await apiFetch(`/api/customers?${params}`);
            if (!res.ok) throw new Error('Failed to load customers');
            const data = await res.json();
            setCustomers(Array.isArray(data.items) ? data.items : []);
        } catch {
            setCustomers([]);
            setError('Unable to load at-risk customers right now.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCandidates();
    }, [fetchCandidates]);

    const hasCustomers = customers.length > 0;

    return (
        <div className="outreach-page">
            {toast && <div className={`outreach-toast outreach-toast-${toast.type}`}>{toast.message}</div>}

            <div className="page-header">
                <div>
                    <p className="page-subtitle">
                        {customers.length} high/medium risk customer{customers.length === 1 ? '' : 's'} to reach out to
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="card empty-state">
                    <p className="empty-state-title">Loading customers</p>
                    <p className="empty-state-text">Please wait while we fetch at-risk customers.</p>
                </div>
            ) : error ? (
                <div className="card empty-state error">
                    <p className="empty-state-title">Unable to load</p>
                    <p className="empty-state-text">{error}</p>
                </div>
            ) : !hasCustomers ? (
                <div className="card empty-state">
                    <p className="empty-state-title">No at-risk customers right now</p>
                    <p className="empty-state-text">
                        Once churn scoring flags high or medium risk customers, they'll show up here.
                    </p>
                </div>
            ) : (
                <div className="card outreach-card">
                    <table className="outreach-table">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Risk</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((customer) => (
                                <tr key={customer.id}>
                                    <td>
                                        <div className="customer-cell">
                                            <div className="table-avatar">
                                                {customer.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="customer-name">{customer.name}</span>
                                        </div>
                                    </td>
                                    <td>{customer.email}</td>
                                    <td className="td-muted">{customer.phone || '—'}</td>
                                    <td><RiskBadge risk={customer.churnRisk} /></td>
                                    <td>
                                        <button
                                            type="button"
                                            className="generate-outreach-btn"
                                            onClick={() => setComposerCustomer(customer)}
                                        >
                                            Generate outreach
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {composerCustomer && (
                <OutreachComposerModal
                    customer={composerCustomer}
                    onClose={() => setComposerCustomer(null)}
                    onSent={(msg) => showToast(msg)}
                />
            )}
        </div>
    );
};

export default OutreachPage;
