import React, { useState, useEffect } from 'react';
import './AddOrderPage.css';
import { apiFetch } from '../api/client';

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
    error = '',
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
                orderDate: toDateInputValue(order.orderDate),
                status: order.status ?? 'pending',
            }
            : defaultFormData
    );

    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [optionsLoading, setOptionsLoading] = useState(true);
    const [optionsError, setOptionsError] = useState('');

    useEffect(() => {
        const loadOptions = async () => {
            setOptionsLoading(true);
            setOptionsError('');
            try {
                const [customersRes, productsRes] = await Promise.all([
                    apiFetch('/api/customers?limit=200&sortBy=name&sortDir=asc'),
                    apiFetch('/api/products?limit=200&sortBy=name&sortDir=asc'),
                ]);
                if (!customersRes.ok || !productsRes.ok) {
                    throw new Error('Failed to load customers/products');
                }
                const customersData = await customersRes.json();
                const productsData = await productsRes.json();
                setCustomers(Array.isArray(customersData.items) ? customersData.items : []);
                setProducts(Array.isArray(productsData.items) ? productsData.items : []);
            } catch {
                setOptionsError('Could not load customers/products list.');
            } finally {
                setOptionsLoading(false);
            }
        };

        loadOptions();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleProductChange = (e) => {
        const productId = e.target.value;
        const selectedProduct = products.find((p) => String(p.id) === productId);
        setFormData((prev) => ({
            ...prev,
            productId,
            amount: selectedProduct
                ? (Number(selectedProduct.price) * (Number(prev.quantity) || 1)).toFixed(2)
                : prev.amount,
        }));
    };

    const handleQuantityChange = (e) => {
        const quantity = e.target.value;
        const selectedProduct = products.find((p) => String(p.id) === formData.productId);
        setFormData((prev) => ({
            ...prev,
            quantity,
            amount: selectedProduct
                ? (Number(selectedProduct.price) * (Number(quantity) || 1)).toFixed(2)
                : prev.amount,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const selectedCustomer = customers.find((c) => String(c.id) === String(formData.customerId));

    return (
        <div className="add-order-overlay">
            <div className="add-order-container">
                <h2>{isEditing ? 'Edit Order' : 'Add New Order'}</h2>

                <form onSubmit={handleSubmit} className="add-order-form">
                    {optionsError && <p className="form-error">{optionsError}</p>}

                    <div className="form-row">
                        <div className="form-section">
                            <label htmlFor="customerId" className="form-label">
                                Customer *
                            </label>
                            <select
                                id="customerId"
                                name="customerId"
                                value={formData.customerId}
                                onChange={handleInputChange}
                                required
                                className="form-select"
                                disabled={optionsLoading}
                            >
                                <option value="">
                                    {optionsLoading ? 'Loading customers…' : 'Select a customer'}
                                </option>
                                {customers.map((customer) => (
                                    <option key={customer.id} value={customer.id}>
                                        {customer.name} ({customer.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-section">
                        <label htmlFor="customerEmail" className="form-label">
                            Customer Email
                        </label>
                        <input
                            type="email"
                            id="customerEmail"
                            className="form-input"
                            value={selectedCustomer?.email || ''}
                            placeholder="Select a customer to see their email"
                            readOnly
                            disabled
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-section">
                            <label htmlFor="productId" className="form-label">
                                Product *
                            </label>
                            <select
                                id="productId"
                                name="productId"
                                value={formData.productId}
                                onChange={handleProductChange}
                                required
                                className="form-select"
                                disabled={optionsLoading}
                            >
                                <option value="">
                                    {optionsLoading ? 'Loading products…' : 'Select a product'}
                                </option>
                                {products.map((product) => (
                                    <option key={product.id} value={product.id}>
                                        {product.name}{product.sku ? ` (${product.sku})` : ''}
                                    </option>
                                ))}
                            </select>
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
                                onChange={handleQuantityChange}
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

                    {error && <p className="form-error">{error}</p>}

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
