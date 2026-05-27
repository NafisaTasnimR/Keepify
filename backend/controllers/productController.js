const {
    listProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
} = require('../services/productService');

const parseNumber = (value) => {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
};

const normalizeImageUrl = (value) => {
    if (value === undefined) {
        return undefined;
    }

    if (value === '' || value === null) {
        return null;
    }

    return value;
};

const validateProductPayload = (payload, isUpdate = false) => {
    const errors = [];

    if (!isUpdate) {
        if (!payload.name || typeof payload.name !== 'string') {
            errors.push('name is required');
        }
    }

    if (payload.name !== undefined && typeof payload.name !== 'string') {
        errors.push('name must be a string');
    }

    if (payload.sku !== undefined && typeof payload.sku !== 'string') {
        errors.push('sku must be a string');
    }

    if (payload.price !== undefined) {
        const price = parseNumber(payload.price);
        if (price === null || price < 0) {
            errors.push('price must be a non-negative number');
        }
    }

    if (payload.stock !== undefined) {
        const stock = parseNumber(payload.stock);
        if (stock === null || !Number.isInteger(stock) || stock < 0) {
            errors.push('stock must be a non-negative integer');
        }
    }

    if (payload.status !== undefined) {
        const allowedStatus = new Set(['active', 'inactive', 'archived']);
        if (!allowedStatus.has(payload.status)) {
            errors.push('status must be active, inactive, or archived');
        }
    }

    if (payload.imageUrl !== undefined && payload.imageUrl !== null) {
        if (typeof payload.imageUrl !== 'string') {
            errors.push('imageUrl must be a string');
        }
    }

    return errors;
};

const listProductsHandler = async (req, res, next) => {
    try {
        const page = Math.max(Number(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
        const offset = (page - 1) * limit;

        const { items, total } = await listProducts({
            search: req.query.search,
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

const getProductByIdHandler = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400);
            throw new Error('Invalid product id');
        }

        const product = await getProductById(id);
        if (!product) {
            res.status(404);
            throw new Error('Product not found');
        }

        res.json(product);
    } catch (error) {
        next(error);
    }
};

const createProductHandler = async (req, res, next) => {
    try {
        const payload = {
            name: req.body.name,
            sku: req.body.sku,
            price: parseNumber(req.body.price) ?? 0,
            stock: parseNumber(req.body.stock) ?? 0,
            category: req.body.category,
            status: req.body.status || 'active',
            imageUrl: normalizeImageUrl(req.body.imageUrl),
        };

        const errors = validateProductPayload(payload);
        if (errors.length) {
            res.status(400);
            throw new Error(errors.join(', '));
        }

        const product = await createProduct(payload);
        res.status(201).json(product);
    } catch (error) {
        next(error);
    }
};

const updateProductHandler = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400);
            throw new Error('Invalid product id');
        }

        const payload = {
            name: req.body.name,
            sku: req.body.sku,
            price: parseNumber(req.body.price),
            stock: parseNumber(req.body.stock),
            category: req.body.category,
            status: req.body.status,
            imageUrl: normalizeImageUrl(req.body.imageUrl),
        };

        const hasUpdates = Object.values(payload).some(
            (value) => value !== undefined
        );
        if (!hasUpdates) {
            res.status(400);
            throw new Error('No fields to update');
        }

        const errors = validateProductPayload(payload, true);
        if (errors.length) {
            res.status(400);
            throw new Error(errors.join(', '));
        }

        const updated = await updateProduct(id, payload);
        if (!updated) {
            res.status(404);
            throw new Error('Product not found');
        }

        res.json(updated);
    } catch (error) {
        next(error);
    }
};

const deleteProductHandler = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400);
            throw new Error('Invalid product id');
        }

        const deleted = await deleteProduct(id);
        if (!deleted) {
            res.status(404);
            throw new Error('Product not found');
        }

        res.json({
            message: 'Product deleted',
            product: deleted,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listProductsHandler,
    getProductByIdHandler,
    createProductHandler,
    updateProductHandler,
    deleteProductHandler,
};
