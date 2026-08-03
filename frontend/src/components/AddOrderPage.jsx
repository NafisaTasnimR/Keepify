import React, { useState } from 'react';
import './AddOrderPage.css';

const toDateInputValue = (value) => {
    if (!value) {
        return new Date().toISOString().slice(0, 10);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? new Date().toISOString().slice(0, 10)
        : date.toISOString().slice(0, 10);
};

const AddOrderPage = ({
    order = null,
    onSave,
    onCancel,
    isEditing = false,
}) => {
    const [formData, setFormData] = useState(
        order
            ? { ...order, orderDate: toDateInputValue(order.orderDate) }
            : {
                customerName: '',
                customerEmail: '',
                orderDate: new Date().toISOString().slice(0, 10),
                amount: '',
                status: 'pending',
            }
    );

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="add-order-overlay">
            <div className="add-order-container">
                <h2>{isEditing ? 'Edit Order' : 'Add New Order'}</h2>

                <form onSubmit={handleSubmit} className="add-order-form">
                    <div className="form-section">
                        <label htmlFor="customerName" className="form-label">
                            Customer Name *
                        </label>
                        <input
                            type="text"
                            id="customerName"
                            name="customerName"
                            value={formData.customerName}
                            onChange={handleInputChange}
                            required
                            className="form-input"
                            placeholder="Enter customer name"
                        />
                    </div>

                    <div className="form-section">
                        <label htmlFor="customerEmail" className="form-label">
                            Customer Email
                        </label>
                        <input
                            type="email"
                            id="customerEmail"
                            name="customerEmail"
                            value={formData.customerEmail}
                            onChange={handleInputChange}
                            className="form-input"
                            placeholder="customer@example.com"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-section">
                            <label htmlFor="orderDate" className="form-label">
                                Order Date *
                            </label>
                            <input
                                type="date"
                                id="orderDate"
                                name="orderDate"
                                value={formData.orderDate}
                                onChange={handleInputChange}
                                required
                                className="form-input"
                            />
                        </div>

                        <div className="form-section">
                            <label htmlFor="amount" className="form-label">
                                Amount *
                            </label>
                            <input
                                type="number"
                                id="amount"
                                name="amount"
                                value={formData.amount}
                                onChange={handleInputChange}
                                required
                                className="form-input"
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <label htmlFor="status" className="form-label">
                            Status
                        </label>
                        <select
                            id="status"
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                            className="form-select"
                        >
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    <div className="form-buttons">
                        <button type="button" onClick={onCancel} className="btn btn-cancel">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-save">
                            {isEditing ? 'Update Order' : 'Save Order'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddOrderPage;
