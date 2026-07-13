const { parse } = require('csv-parse/sync');
const {
    listOrders,
    getOrderById,
    createOrder,
    updateOrder,
    deleteOrder,
    bulkInsertOrders,
} = require('../services/orderService');

const parseNumber = (value) => {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
};

const isValidDate = (value) => !Number.isNaN(new Date(value).getTime());

const validateOrderPayload = (payload, isUpdate = false) => {
    const errors = [];

    if (!isUpdate && (!payload.customerName || typeof payload.customerName !== 'string')) {
        errors.push('customerName is required');
    }

    if (payload.customerName !== undefined && typeof payload.customerName !== 'string') {
        errors.push('customerName must be a string');
    }

    if (payload.customerEmail !== undefined && payload.customerEmail !== null && typeof payload.customerEmail !== 'string') {
        errors.push('customerEmail must be a string');
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

    return errors;
};

const listOrdersHandler = async (req, res, next) => {
    try {
        const page = Math.max(Number(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
        const offset = (page - 1) * limit;

        const { items, total } = await listOrders({
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

        const order = await getOrderById(id);
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
            customerName: req.body.customerName,
            customerEmail: req.body.customerEmail || null,
            orderDate: req.body.orderDate || null,
            amount: parseNumber(req.body.amount) ?? 0,
            status: req.body.status || 'pending',
        };

        const errors = validateOrderPayload(payload);
        if (errors.length) {
            res.status(400);
            throw new Error(errors.join(', '));
        }

        const order = await createOrder(payload);
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
            customerName: req.body.customerName,
            customerEmail: req.body.customerEmail,
            orderDate: req.body.orderDate,
            amount: parseNumber(req.body.amount),
            status: req.body.status,
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

        const updated = await updateOrder(id, payload);
        if (!updated) {
            res.status(404);
            throw new Error('Order not found');
        }

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

        const deleted = await deleteOrder(id);
        if (!deleted) {
            res.status(404);
            throw new Error('Order not found');
        }

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
            customerName: record.customer_name || record.customerName,
            customerEmail: record.customer_email || record.customerEmail || null,
            orderDate: record.order_date || record.orderDate || null,
            amount: parseNumber(record.amount) ?? 0,
            status: record.status || 'pending',
        }));

        const rowErrors = [];
        rows.forEach((row, index) => {
            const errors = validateOrderPayload(row);
            if (errors.length) {
                rowErrors.push({ row: index + 1, message: errors.join(', ') });
            }
        });

        const validRows = rows.filter((_, index) => !rowErrors.some((e) => e.row === index + 1));
        const result = await bulkInsertOrders(validRows);

        res.json({
            imported: result.imported,
            failed: result.failed + rowErrors.length,
            errors: [...rowErrors, ...result.errors],
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
