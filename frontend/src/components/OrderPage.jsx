import React from 'react';
import './OrderPage.css';

const OrderPage = ({
    orders,
    onAddOrder,
    onEditOrder,
    onDeleteOrder,
    onUploadCsv,
    filters,
    onFilterChange,
    isLoading = false,
    error = '',
}) => {
    const hasOrders = orders.length > 0;

    return (
        <div className="orders-page">
            <div className="orders-toolbar">
                <div className="orders-filters">
                    <input
                        type="text"
                        className="filter-input"
                        placeholder="Filter by customer or product"
                        value={filters.customer}
                        onChange={(e) => onFilterChange({ ...filters, customer: e.target.value })}
                    />
                    <input
                        type="date"
                        className="filter-input"
                        value={filters.startDate}
                        onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value })}
                        title="From date"
                    />
                    <input
                        type="date"
                        className="filter-input"
                        value={filters.endDate}
                        onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value })}
                        title="To date"
                    />
                </div>
                <div className="orders-toolbar-actions">
                    <button type="button" className="upload-csv-button" onClick={onUploadCsv}>
                        Upload CSV
                    </button>
                    <button type="button" className="add-order-button" onClick={onAddOrder}>
                        Add order
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="card empty-state">
                    <p className="empty-state-title">Loading orders</p>
                    <p className="empty-state-text">Please wait while we fetch your data.</p>
                </div>
            ) : error ? (
                <div className="card empty-state error">
                    <p className="empty-state-title">Unable to load orders</p>
                    <p className="empty-state-text">{error}</p>
                </div>
            ) : !hasOrders ? (
                <div className="card empty-state">
                    <p className="empty-state-title">No orders yet</p>
                    <p className="empty-state-text">Add your first order or upload a CSV to get started.</p>
                    <div className="empty-state-actions">
                        <button type="button" className="add-order-button" onClick={onAddOrder}>
                            Add order
                        </button>
                    </div>
                </div>
            ) : (
                <div className="card orders-card">
                    <table className="orders-page-table">
                        <thead>
                            <tr>
                                <th>Customer Name</th>
                                <th>Customer Email</th>
                                <th>Product Name</th>
                                <th>Category</th>
                                <th>Amount</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order, i) => (
                                <tr key={order.id ?? i}>
                                    <td>{order.customerName || '—'}</td>
                                    <td>{order.customerEmail || '—'}</td>
                                    <td>{order.productName || '—'}</td>
                                    <td>{order.productCategory || '—'}</td>
                                    <td>{order.amountLabel || order.amount || '—'}</td>
                                    <td>{order.orderDateLabel || order.orderDate || '—'}</td>
                                    <td>
                                        <span className={`order-status ${order.status}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                type="button"
                                                className="edit-order-btn"
                                                onClick={() => onEditOrder(i)}
                                                title="Edit order"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="delete-order-btn"
                                                onClick={() => onDeleteOrder(i)}
                                                title="Delete order"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default OrderPage;
