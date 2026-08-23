import React, { useEffect, useState, useCallback } from 'react';
import OrderPage from './OrderPage';
import AddOrderPage from './AddOrderPage';
import CsvUploadModal from './CsvUploadModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { apiFetch } from '../api/client';

const formatAmountLabel = (value) => {
    const amount = Number(value);
    if (Number.isNaN(amount)) {
        return '$0.00';
    }
    return `$${amount.toFixed(2)}`;
};

const formatDateLabel = (value) => {
    if (!value) {
        return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '—';
    }
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatEntityLabel = (id, name, fallback) => {
    if (id === undefined || id === null || id === '') {
        return name || fallback;
    }

    return name ? `#${id} ${name}` : `#${id}`;
};

const normalizeOrder = (order) => ({
    id: order.id,
    customerId: order.customerId ?? null,
    customerName: order.customerName || null,
    customerEmail: order.customerEmail || null,
    customerLabel: formatEntityLabel(order.customerId, order.customerName, 'Unknown customer'),
    productId: order.productId ?? null,
    productName: order.productName || null,
    productSku: order.productSku || null,
    productCategory: order.productCategory || null,
    productLabel: formatEntityLabel(order.productId, order.productName, 'Unknown product'),
    quantity: Number(order.quantity ?? 1),
    quantityLabel: Number(order.quantity ?? 1).toLocaleString(),
    orderDate: order.orderDate,
    orderDateLabel: formatDateLabel(order.orderDate),
    amount: Number(order.amount ?? 0),
    amountLabel: formatAmountLabel(order.amount),
    status: order.status ?? 'pending',
    category: order.category ?? '',
});

const EMPTY_FILTERS = { customer: '', startDate: '', endDate: '' };

const OrdersView = () => {
    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [ordersError, setOrdersError] = useState('');
    const [filters, setFilters] = useState(EMPTY_FILTERS);

    const [showOrderForm, setShowOrderForm] = useState(false);
    const [editingOrderIndex, setEditingOrderIndex] = useState(null);
    const [formError, setFormError] = useState('');

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const [showCsvModal, setShowCsvModal] = useState(false);

    const fetchOrders = useCallback(async () => {
        setOrdersLoading(true);
        setOrdersError('');

        try {
            const params = new URLSearchParams({ limit: '100' });
            if (filters.customer) params.set('customer', filters.customer);
            if (filters.startDate) params.set('startDate', filters.startDate);
            if (filters.endDate) params.set('endDate', filters.endDate);

            const response = await apiFetch(`/api/orders?${params.toString()}`);
            if (!response.ok) {
                throw new Error('Failed to load orders');
            }

            const data = await response.json();
            const items = Array.isArray(data.items) ? data.items : [];
            setOrders(items.map(normalizeOrder));
        } catch (error) {
            setOrders([]);
            setOrdersError('Unable to load orders right now.');
        } finally {
            setOrdersLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleAddOrder = () => {
        setEditingOrderIndex(null);
        setFormError('');
        setShowOrderForm(true);
    };

    const handleEditOrder = (index) => {
        setEditingOrderIndex(index);
        setFormError('');
        setShowOrderForm(true);
    };

    const handleSaveOrder = async (formData) => {
        const payload = {
            customerId: Number(formData.customerId) || null,
            newCustomer: formData.newCustomer || null,
            productId: Number(formData.productId) || null,
            quantity: Number(formData.quantity) || null,
            amount: Number(formData.amount) || 0,
            orderDate: formData.orderDate || null,
            status: formData.status || 'pending',
            category: formData.category?.trim() || null,
        };

        setOrdersError('');

        try {
            if (editingOrderIndex !== null) {
                const existing = orders[editingOrderIndex];
                const response = await apiFetch(`/api/orders/${existing.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.message || 'Failed to update order');
                }

                const updated = normalizeOrder(await response.json());
                setOrders((prev) =>
                    prev.map((item, index) => (index === editingOrderIndex ? updated : item))
                );
            } else {
                const response = await apiFetch('/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.message || 'Failed to create order');
                }

                const created = normalizeOrder(await response.json());
                setOrders((prev) => [created, ...prev]);
            }

            setShowOrderForm(false);
            setEditingOrderIndex(null);
            setFormError('');
        } catch (error) {
            setFormError(error.message || 'Unable to save order right now.');
        }
    };

    const handleCancelForm = () => {
        setShowOrderForm(false);
        setEditingOrderIndex(null);
        setFormError('');
    };

    const handleRequestDelete = (index) => {
        setDeleteTarget({ index, order: orders[index] });
        setDeleteError('');
    };

    const handleCancelDelete = () => {
        if (isDeleting) {
            return;
        }
        setDeleteTarget(null);
        setDeleteError('');
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) {
            return;
        }

        setIsDeleting(true);
        setDeleteError('');

        try {
            const order = deleteTarget.order;
            const response = await apiFetch(`/api/orders/${order.id}`, { method: 'DELETE' });

            if (!response.ok) {
                throw new Error('Failed to delete order');
            }

            setOrders((prev) => prev.filter((_, idx) => idx !== deleteTarget.index));
            setDeleteTarget(null);
        } catch (error) {
            setDeleteError('Unable to delete order right now.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <OrderPage
                orders={orders}
                onAddOrder={handleAddOrder}
                onEditOrder={handleEditOrder}
                onDeleteOrder={handleRequestDelete}
                onUploadCsv={() => setShowCsvModal(true)}
                filters={filters}
                onFilterChange={setFilters}
                isLoading={ordersLoading}
                error={ordersError}
            />

            {showOrderForm && (
                <AddOrderPage
                    order={editingOrderIndex !== null ? orders[editingOrderIndex] : null}
                    onSave={handleSaveOrder}
                    onCancel={handleCancelForm}
                    isEditing={editingOrderIndex !== null}
                    error={formError}
                />
            )}

            <CsvUploadModal
                isOpen={showCsvModal}
                onClose={() => setShowCsvModal(false)}
                onUploaded={fetchOrders}
            />

            <ConfirmDeleteModal
                isOpen={Boolean(deleteTarget)}
                title="Delete order"
                itemName={deleteTarget?.order?.customerLabel || deleteTarget?.order?.productLabel || `Order #${deleteTarget?.order?.id}`}
                itemLabel="order"
                onConfirm={handleConfirmDelete}
                onCancel={handleCancelDelete}
                isDeleting={isDeleting}
                error={deleteError}
            />
        </>
    );
};

export default OrdersView;
