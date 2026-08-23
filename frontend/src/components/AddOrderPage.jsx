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

    const [customerMode, setCustomerMode] = useState('existing'); // 'existing' | 'new'
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        email: '',
        phone: '',
    });
    const [localValidationMessage, setLocalValidationMessage] = useState('');

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
                    apiFetch('/api/products?status=active&limit=200&sortBy=name&sortDir=asc'),
                ]);
                if (!customersRes.ok || !productsRes.ok) {
                    throw new Error('Failed to load customers/products');
                }
                const customersData = await customersRes.json();
                const productsData = await productsRes.json();

                let activeProducts = Array.isArray(productsData.items) ? productsData.items : [];

                // If editing an existing order and its product is inactive/archived, fetch and append it
                if (order?.productId && !activeProducts.some((p) => String(p.id) === String(order.productId))) {
                    try {
                        const existingProdRes = await apiFetch(`/api/products/${order.productId}`);
                        if (existingProdRes.ok) {
                            const existingProd = await existingProdRes.json();
                            if (existingProd) {
                                activeProducts = [
                                    ...activeProducts,
                                    { ...existingProd, name: `${existingProd.name} (${existingProd.status || 'inactive'})` },
                                ];
                            }
                        }
                    } catch {
                        // ignore error loading archived product
                    }
                }

                setCustomers(Array.isArray(customersData.items) ? customersData.items : []);
                setProducts(activeProducts);
            } catch {
                setOptionsError('Could not load customers/products list.');
            } finally {
                setOptionsLoading(false);
            }
        };

        loadOptions();
    }, [order?.productId]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleNewCustomerChange = (e) => {
        const { name, value } = e.target;
        setNewCustomer((prev) => ({
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
        setLocalValidationMessage('');

        if (customerMode === 'existing') {
            if (!formData.customerId) {
                setLocalValidationMessage('Please select an existing customer or switch to Add New Customer.');
                return;
            }
            onSave({
                ...formData,
                newCustomer: null,
            });
        } else {
            if (!newCustomer.name.trim()) {
                setLocalValidationMessage('Customer name is required.');
                return;
            }
            if (!newCustomer.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomer.email.trim())) {
                setLocalValidationMessage('A valid customer email is required.');
                return;
            }
            onSave({
                ...formData,
                customerId: null,
                newCustomer: {
                    name: newCustomer.name.trim(),
                    email: newCustomer.email.trim(),
                    phone: newCustomer.phone.trim() || null,
                },
            });
        }
    };

    const selectedCustomer = customers.find((c) => String(c.id) === String(formData.customerId));

    return (
        <div className="add-order-overlay">
            <div className="add-order-container">
                <h2>{isEditing ? 'Edit Order' : 'Add New Order'}</h2>

                <form onSubmit={handleSubmit} className="add-order-form">
                    {optionsError && <p className="form-error">{optionsError}</p>}
                    {(localValidationMessage || error) && (
                        <p className="form-error">{localValidationMessage || error}</p>
                    )}

                    {/* Customer Selection Mode Toggle */}
                    <div className="form-section">
                        <label className="form-label">Customer Source *</label>
                        <div className="customer-mode-toggle">
                            <button
                                type="button"
                                className={`customer-toggle-btn ${customerMode === 'existing' ? 'active' : ''}`}
                                onClick={() => {
                                    setCustomerMode('existing');
                                    setLocalValidationMessage('');
                                }}
                            >
                                Select Existing
                            </button>
                            <button
                                type="button"
                                className={`customer-toggle-btn ${customerMode === 'new' ? 'active' : ''}`}
                                onClick={() => {
                                    setCustomerMode('new');
                                    setLocalValidationMessage('');
                                }}
                            >
                                + Add New Customer
                            </button>
                        </div>
                    </div>

                    {customerMode === 'existing' ? (
                        <>
                            <div className="form-row">
                                <div className="form-section">
                                    <label htmlFor="customerId" className="form-label">
                                        Select Customer *
                                    </label>
                                    <select
                                        id="customerId"
                                        name="customerId"
                                        value={formData.customerId}
                                        onChange={handleInputChange}
                                        required={customerMode === 'existing'}
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
                        </>
                    ) : (
                        <div className="new-customer-fields">
                            <div className="form-section">
                                <label htmlFor="newCustomerName" className="form-label">
                                    Customer Name *
                                </label>
                                <input
                                    type="text"
                                    id="newCustomerName"
                                    name="name"
                                    value={newCustomer.name}
                                    onChange={handleNewCustomerChange}
                                    placeholder="e.g. John Doe"
                                    required={customerMode === 'new'}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-row" style={{ marginTop: '12px' }}>
                                <div className="form-section">
                                    <label htmlFor="newCustomerEmail" className="form-label">
                                        Customer Email *
                                    </label>
                                    <input
                                        type="email"
                                        id="newCustomerEmail"
                                        name="email"
                                        value={newCustomer.email}
                                        onChange={handleNewCustomerChange}
                                        placeholder="john@example.com"
                                        required={customerMode === 'new'}
                                        className="form-input"
                                    />
                                </div>

                                <div className="form-section">
                                    <label htmlFor="newCustomerPhone" className="form-label">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        id="newCustomerPhone"
                                        name="phone"
                                        value={newCustomer.phone}
                                        onChange={handleNewCustomerChange}
                                        placeholder="01700-000000"
                                        className="form-input"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

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
                                {products.map((product) => {
                                    const stockNum = Number(product.stock ?? 0);
                                    const isOutOfStock = stockNum <= 0;
                                    return (
                                        <option key={product.id} value={product.id} disabled={isOutOfStock}>
                                            {product.name}{product.sku ? ` (${product.sku})` : ''} - {isOutOfStock ? 'Out of Stock (0)' : `${stockNum} in stock`}
                                        </option>
                                    );
                                })}
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
