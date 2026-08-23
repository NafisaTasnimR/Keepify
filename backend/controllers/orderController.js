const { parse } = require('csv-parse/sync');
const {
    listOrders,
    getOrderById,
    createOrder,
    updateOrder,
    deleteOrder,
    bulkInsertOrders,
} = require('../services/orderService');
const { clearAnalyticsCache } = require('../services/analyticsService');

const parseNumber = (value) => {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
};

const parseInteger = (value) => {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
};

const isValidDate = (value) => !Number.isNaN(new Date(value).getTime());

const validateOrderPayload = (payload, isUpdate = false) => {
    const errors = [];

    if (!isUpdate && (payload.customerId === undefined || payload.customerId === null) && !payload.newCustomer) {
        errors.push('customerId or newCustomer is required');
    }

    if (payload.customerId !== undefined && payload.customerId !== null) {
        if (!Number.isInteger(payload.customerId) || payload.customerId <= 0) {
            errors.push('customerId must be a positive integer');
        }
    }

    if (payload.newCustomer) {
        if (!payload.newCustomer.name || typeof payload.newCustomer.name !== 'string' || !payload.newCustomer.name.trim()) {
            errors.push('Customer name is required');
        }
        if (!payload.newCustomer.email || typeof payload.newCustomer.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.newCustomer.email.trim())) {
            errors.push('A valid customer email is required');
        }
    }

    if (!isUpdate && (payload.productId === undefined || payload.productId === null)) {
        errors.push('productId is required');
    }

    if (payload.productId !== undefined) {
        if (!Number.isInteger(payload.productId) || payload.productId <= 0) {
            errors.push('productId must be a positive integer');
        }
    }

    if (!isUpdate && (payload.quantity === undefined || payload.quantity === null)) {
        errors.push('quantity is required');
    }

    if (payload.quantity !== undefined) {
        if (!Number.isInteger(payload.quantity) || payload.quantity <= 0) {
            errors.push('quantity must be a positive integer');
        }
    }

    if (payload.orderDate !== undefined && payload.orderDate !== null && !isValidDate(payload.orderDate)) {
        errors.push('orderDate must be a valid date');
    }

    if (payload.amount !== undefined) {
        const amount = parseNumber(payload.amount);
        if (amount === null || amount < 0) {
            errors.push('amount must be a non-negative number');
        }
    }

    if (payload.status !== undefined) {
        const allowedStatus = new Set(['pending', 'completed', 'cancelled']);
        if (!allowedStatus.has(payload.status)) {
            errors.push('status must be pending, completed, or cancelled');
        }
    }

    if (payload.category !== undefined && payload.category !== null && typeof payload.category !== 'string') {
        errors.push('category must be a string');
    }

    return errors;
};

const listOrdersHandler = async (req, res, next) => {
    try {
        const page = Math.max(Number(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
        const offset = (page - 1) * limit;

        const { items, total } = await listOrders(req.user.uid, {
            customer: req.query.customer,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            limit,
            offset,
            sortBy: req.query.sortBy,
            sortDir: req.query.sortDir,
        });

        res.json({
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        next(error);
    }
};

const getOrderByIdHandler = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400);
            throw new Error('Invalid order id');
        }

        const order = await getOrderById(req.user.uid, id);
        if (!order) {
            res.status(404);
            throw new Error('Order not found');
        }

        res.json(order);
    } catch (error) {
        next(error);
    }
};

const createOrderHandler = async (req, res, next) => {
    try {
        const payload = {
            customerId: parseInteger(req.body.customerId),
            newCustomer: req.body.newCustomer && typeof req.body.newCustomer === 'object' ? {
                name: req.body.newCustomer.name ? String(req.body.newCustomer.name).trim() : '',
                email: req.body.newCustomer.email ? String(req.body.newCustomer.email).trim() : '',
                phone: req.body.newCustomer.phone ? String(req.body.newCustomer.phone).trim() : null,
            } : null,
            productId: parseInteger(req.body.productId),
            quantity: parseInteger(req.body.quantity),
            amount: parseNumber(req.body.amount),
            orderDate: req.body.orderDate || null,
            status: req.body.status || 'pending',
            category: req.body.category ?? null,
        };

        const errors = validateOrderPayload(payload);
        if (errors.length) {
            res.status(400);
            throw new Error(errors.join(', '));
        }

        const order = await createOrder(req.user.uid, payload);
        await clearAnalyticsCache(req.user.uid);
        res.status(201).json(order);
    } catch (error) {
        next(error);
    }
};

const updateOrderHandler = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400);
            throw new Error('Invalid order id');
        }

        const payload = {
            customerId: parseInteger(req.body.customerId),
            newCustomer: req.body.newCustomer && typeof req.body.newCustomer === 'object' ? {
                name: req.body.newCustomer.name ? String(req.body.newCustomer.name).trim() : '',
                email: req.body.newCustomer.email ? String(req.body.newCustomer.email).trim() : '',
                phone: req.body.newCustomer.phone ? String(req.body.newCustomer.phone).trim() : null,
            } : undefined,
            productId: parseInteger(req.body.productId),
            quantity: parseInteger(req.body.quantity),
            amount: parseNumber(req.body.amount),
            orderDate: req.body.orderDate,
            status: req.body.status,
            category: req.body.category,
        };

        const hasUpdates = Object.values(payload).some((value) => value !== undefined);
        if (!hasUpdates) {
            res.status(400);
            throw new Error('No fields to update');
        }

        const errors = validateOrderPayload(payload, true);
        if (errors.length) {
            res.status(400);
            throw new Error(errors.join(', '));
        }

        const updated = await updateOrder(req.user.uid, id, payload);
        if (!updated) {
            res.status(404);
            throw new Error('Order not found');
        }

        await clearAnalyticsCache(req.user.uid);
        res.json(updated);
    } catch (error) {
        next(error);
    }
};

const deleteOrderHandler = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400);
            throw new Error('Invalid order id');
        }

        const deleted = await deleteOrder(req.user.uid, id);
        if (!deleted) {
            res.status(404);
            throw new Error('Order not found');
        }

        await clearAnalyticsCache(req.user.uid);
        res.json({
            message: 'Order deleted',
            order: deleted,
        });
    } catch (error) {
        next(error);
    }
};

const uploadCsvHandler = async (req, res, next) => {
    try {
        if (!req.file) {
            res.status(400);
            throw new Error('No CSV file uploaded');
        }

        let records;
        try {
            records = parse(req.file.buffer, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
            });
        } catch (parseError) {
            res.status(400);
            throw new Error(`Invalid CSV file: ${parseError.message}`);
        }

        const rows = records.map((record) => ({
            customerId: parseInteger(record.customer_id || record.customerId),
            customerName: record.customer_name || record.customerName || null,
            customerEmail: record.customer_email || record.customerEmail || null,
            customerPhone: record.customer_phone || record.customerPhone || null,
            productId: parseInteger(record.product_id || record.productId),
            productName: record.product_name || record.productName || null,
            quantity: (() => {
                const parsedQuantity = parseInteger(record.quantity);
                return parsedQuantity === undefined ? 1 : parsedQuantity;
            })(),
            amount: parseNumber(record.amount),
            orderDate: record.order_date || record.orderDate || null,
            status: record.status || 'pending',
            category: record.product_category || record.category || record.categories || null,
        }));

        const result = await bulkInsertOrders(req.user.uid, rows);

        await clearAnalyticsCache(req.user.uid);

        res.json({
            imported: result.imported,
            failed: result.failed,
            errors: result.errors,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listOrdersHandler,
    getOrderByIdHandler,
    createOrderHandler,
    updateOrderHandler,
    deleteOrderHandler,
    uploadCsvHandler,
};
