import React, { useState } from 'react';
import './AddOrderPage.css';

const AddOrderPage = ({
    order = null,
    onSave,
    onCancel,
    isEditing = false,
}) => {
    const defaultFormData = {
        customerId: '',
        productId: '',
        quantity: '1',
        amount: '',
        orderDate: new Date().toISOString().slice(0, 10),
        status: 'pending',
        category: '',
    };

    const [formData, setFormData] = useState(
        order
            ? {
                ...defaultFormData,
                ...order,
                customerId: order.customerId ?? '',
                productId: order.productId ?? '',
                quantity: order.quantity ?? '1',
                amount: order.amount ?? '',
                orderDate: order.orderDate ?? defaultFormData.orderDate,
                status: order.status ?? 'pending',
            }
            : defaultFormData
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
                    <div className="form-row">
                        <div className="form-section">
                            <label htmlFor="customerId" className="form-label">
                                Customer ID *
                            </label>
                            <input
                                type="number"
                                id="customerId"
                                name="customerId"
                                value={formData.customerId}
                                onChange={handleInputChange}
                                required
                                className="form-input"
                                placeholder="1"
                                min="1"
                                step="1"
                            />
                        </div>

                        <div className="form-section">
                            <label htmlFor="productId" className="form-label">
                                Product ID *
                            </label>
                            <input
                                type="number"
                                id="productId"
                                name="productId"
                                value={formData.productId}
                                onChange={handleInputChange}
                                required
                                className="form-input"
                                placeholder="1"
                                min="1"
                                step="1"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-section">
                            <label htmlFor="quantity" className="form-label">
                                Quantity *
                            </label>
                            <input
                                type="number"
                                id="quantity"
                                name="quantity"
                                value={formData.quantity}
                                onChange={handleInputChange}
                                required
                                className="form-input"
                                placeholder="1"
                                min="1"
                                step="1"
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
