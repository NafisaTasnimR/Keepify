const {
    listCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
} = require('../services/customerService');

const validateCustomerPayload = (payload, isUpdate = false) => {
    const errors = [];

    if (!isUpdate) {
        if (!payload.name  || typeof payload.name  !== 'string') errors.push('name is required');
        if (!payload.email || typeof payload.email !== 'string') errors.push('email is required');
    }

    if (payload.name  !== undefined && typeof payload.name  !== 'string')
        errors.push('name must be a string');
    if (payload.email !== undefined) {
        if (typeof payload.email !== 'string') errors.push('email must be a string');
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email))
            errors.push('email must be valid');
    }

    return errors;
};

const listCustomersHandler = async (req, res, next) => {
    try {
        const page  = Math.max(Number(req.query.page)  || 1, 1);
        const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
        const offset = (page - 1) * limit;

        const allowedRisk = new Set(['low', 'medium', 'high']);
        const risk = typeof req.query.risk === 'string'
            ? req.query.risk.split(',').map((r) => r.trim()).filter((r) => allowedRisk.has(r))
            : undefined;

        const { items, total } = await listCustomers(req.user.uid, {
            search:  req.query.search,
            risk,
            limit,
            offset,
            sortBy:  req.query.sortBy,
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
    } catch (error) { next(error); }
};

const getCustomerByIdHandler = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) { res.status(400); throw new Error('Invalid customer id'); }

        const customer = await getCustomerById(req.user.uid, id);
        if (!customer) { res.status(404); throw new Error('Customer not found'); }

        res.json(customer);
    } catch (error) { next(error); }
};

const createCustomerHandler = async (req, res, next) => {
    try {
        const payload = {
            name:  req.body.name,
            email: req.body.email,
            phone: req.body.phone,
        };

        const errors = validateCustomerPayload(payload);
        if (errors.length) { res.status(400); throw new Error(errors.join(', ')); }

        const customer = await createCustomer(req.user.uid, payload);
        res.status(201).json(customer);
    } catch (error) { next(error); }
};

const updateCustomerHandler = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) { res.status(400); throw new Error('Invalid customer id'); }

        const payload = {
            name:  req.body.name,
            email: req.body.email,
            phone: req.body.phone,
        };

        const hasUpdates = Object.values(payload).some((v) => v !== undefined);
        if (!hasUpdates) { res.status(400); throw new Error('No fields to update'); }

        const errors = validateCustomerPayload(payload, true);
        if (errors.length) { res.status(400); throw new Error(errors.join(', ')); }

        const updated = await updateCustomer(req.user.uid, id, payload);
        if (!updated) { res.status(404); throw new Error('Customer not found'); }

        res.json(updated);
    } catch (error) { next(error); }
};

const deleteCustomerHandler = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) { res.status(400); throw new Error('Invalid customer id'); }

        const deleted = await deleteCustomer(req.user.uid, id);
        if (!deleted) { res.status(404); throw new Error('Customer not found'); }

        res.json({ message: 'Customer deleted', customer: deleted });
    } catch (error) { next(error); }
};

module.exports = {
    listCustomersHandler,
    getCustomerByIdHandler,
    createCustomerHandler,
    updateCustomerHandler,
    deleteCustomerHandler,
};