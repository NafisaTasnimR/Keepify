const { pool } = require('../config/postgres');

const ORDER_COLUMNS = [
    'id',
    'user_id',
    'customer_id',
    'product_id',
    'customer_name',
    'customer_email',
    'product_name',
    'product_sku',
    'product_category',
    'quantity',
    'amount',
    'order_date',
    'status',
    'category',
    'created_at',
    'updated_at',
];

const ORDER_SELECT_SQL = `
    SELECT
        id,
        user_id,
        customer_id,
        product_id,
        customer_name,
        customer_email,
        product_name,
        product_sku,
        product_category,
        quantity,
        amount,
        order_date,
        status,
        category,
        created_at,
        updated_at
    FROM orders
`;

const ANALYTICS_TABLE_COLUMNS = [
    'order_id',
    'user_id',
    'customer_id',
    'customer_name',
    'customer_email',
    'product_id',
    'product_name',
    'product_sku',
    'category',
    'quantity',
    'amount',
    'order_date',
    'status',
    'created_at',
    'updated_at',
];

const mapOrder = (row) => ({
    id: row.id,
    userId: row.user_id || null,
    customerId: row.customer_id !== null ? Number(row.customer_id) : null,
    productId: row.product_id !== null ? Number(row.product_id) : null,
    customerName: row.customer_name ?? null,
    customerEmail: row.customer_email ?? null,
    productName: row.product_name ?? null,
    productSku: row.product_sku ?? null,
    productCategory: row.product_category ?? null,
    quantity: row.quantity !== null ? Number(row.quantity) : null,
    amount: row.amount !== null ? Number(row.amount) : null,
    orderDate: row.order_date,
    status: row.status,
    category: row.category ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const ensureOrdersTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                user_id TEXT,
                customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
                product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
                customer_name TEXT,
                customer_email TEXT,
                product_name TEXT,
                product_sku TEXT,
                product_category TEXT,
                quantity INTEGER NOT NULL DEFAULT 1,
                amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
                order_date DATE NOT NULL DEFAULT CURRENT_DATE,
                status TEXT NOT NULL DEFAULT 'pending',
                category TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id TEXT;`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);`);
    } catch (err) {
        console.error('Error in ensureOrdersTable:', err.message);
    }
};

const ensureOrderAnalyticsTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS order_analytics (
                order_id INTEGER PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
                user_id TEXT,
                customer_id INTEGER,
                customer_name TEXT,
                customer_email TEXT,
                product_id INTEGER,
                product_name TEXT,
                product_sku TEXT,
                category TEXT,
                quantity INTEGER NOT NULL DEFAULT 1,
                amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
                order_date DATE NOT NULL,
                status TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        await pool.query(`ALTER TABLE order_analytics ADD COLUMN IF NOT EXISTS user_id TEXT;`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_order_analytics_user_id ON order_analytics(user_id);`);

        await pool.query(`
            INSERT INTO order_analytics (${ANALYTICS_TABLE_COLUMNS.join(', ')})
            SELECT
                o.id AS order_id,
                o.user_id,
                o.customer_id,
                COALESCE(o.customer_name, c.name) AS customer_name,
                COALESCE(o.customer_email, c.email) AS customer_email,
                o.product_id,
                COALESCE(o.product_name, p.name) AS product_name,
                COALESCE(o.product_sku, p.sku) AS product_sku,
                COALESCE(o.category, o.product_category, p.category) AS category,
                COALESCE(o.quantity, 1) AS quantity,
                COALESCE(o.amount, 0) AS amount,
                o.order_date,
                o.status,
                o.created_at,
                o.updated_at
            FROM orders o
            LEFT JOIN customers c ON c.id = o.customer_id
            LEFT JOIN products p ON p.id = o.product_id
            ON CONFLICT (order_id) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                customer_id = EXCLUDED.customer_id,
                customer_name = EXCLUDED.customer_name,
                customer_email = EXCLUDED.customer_email,
                product_id = EXCLUDED.product_id,
                product_name = EXCLUDED.product_name,
                product_sku = EXCLUDED.product_sku,
                category = EXCLUDED.category,
                quantity = EXCLUDED.quantity,
                amount = EXCLUDED.amount,
                order_date = EXCLUDED.order_date,
                status = EXCLUDED.status,
                created_at = EXCLUDED.created_at,
                updated_at = EXCLUDED.updated_at
        `);
    } catch (err) {
        console.error('Error in ensureOrderAnalyticsTable:', err.message);
    }
};

const syncOrderAnalyticsRecord = async (client, orderId) => {
    await client.query(
        `INSERT INTO order_analytics (${ANALYTICS_TABLE_COLUMNS.join(', ')})
         SELECT
            o.id AS order_id,
            o.user_id,
            o.customer_id,
            COALESCE(o.customer_name, c.name) AS customer_name,
            COALESCE(o.customer_email, c.email) AS customer_email,
            o.product_id,
            COALESCE(o.product_name, p.name) AS product_name,
            COALESCE(o.product_sku, p.sku) AS product_sku,
            COALESCE(o.category, o.product_category, p.category) AS category,
            COALESCE(o.quantity, 1) AS quantity,
            COALESCE(o.amount, 0) AS amount,
            o.order_date,
            o.status,
            o.created_at,
            o.updated_at
         FROM orders o
         LEFT JOIN customers c ON c.id = o.customer_id
         LEFT JOIN products p ON p.id = o.product_id
         WHERE o.id = $1
         ON CONFLICT (order_id) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            customer_id = EXCLUDED.customer_id,
            customer_name = EXCLUDED.customer_name,
            customer_email = EXCLUDED.customer_email,
            product_id = EXCLUDED.product_id,
            product_name = EXCLUDED.product_name,
            product_sku = EXCLUDED.product_sku,
            category = EXCLUDED.category,
            quantity = EXCLUDED.quantity,
            amount = EXCLUDED.amount,
            order_date = EXCLUDED.order_date,
            status = EXCLUDED.status,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at`,
        [orderId]
    );
};

const deleteOrderAnalyticsRecord = async (client, orderId) => {
    await client.query('DELETE FROM order_analytics WHERE order_id = $1', [orderId]);
};

// Adjust product inventory stock when an order is completed, cancelled, or deleted
const adjustProductStock = async (client, userId, productId, deltaQuantity) => {
    if (!productId || deltaQuantity === 0) return;
    const safeUserId = userId || '';

    if (deltaQuantity < 0) {
        // Decrease stock for completed order
        const decreaseAmount = Math.abs(deltaQuantity);
        await client.query(
            `UPDATE products
             SET stock = GREATEST(stock - $1, 0),
                 updated_at = NOW()
             WHERE id = $2 AND (user_id = $3 OR user_id IS NULL)`,
            [decreaseAmount, productId, safeUserId]
        );
    } else {
        // Restore/increase stock for cancelled or deleted order
        await client.query(
            `UPDATE products
             SET stock = stock + $1,
                 updated_at = NOW()
             WHERE id = $2 AND (user_id = $3 OR user_id IS NULL)`,
            [deltaQuantity, productId, safeUserId]
        );
    }
};

const fetchOrderDetails = async (client, userId, customerId, productId) => {
    const safeUserId = userId || '';
    const [customerResult, productResult] = await Promise.all([
        client.query('SELECT id, name, email FROM customers WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)', [customerId, safeUserId]),
        client.query('SELECT id, name, sku, category, price FROM products WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)', [productId, safeUserId]),
    ]);

    const customer = customerResult.rows[0] || null;
    const product = productResult.rows[0] || null;

    if (!customer) {
        throw new Error('Customer not found');
    }

    if (!product) {
        throw new Error('Product not found');
    }

    return { customer, product };
};

const buildOrderWritePayload = async (client, userId, payload, existingOrder = null) => {
    const customerId = payload.customerId !== undefined ? payload.customerId : existingOrder?.customerId;
    const productId = payload.productId !== undefined ? payload.productId : existingOrder?.productId;
    const quantity = payload.quantity !== undefined ? payload.quantity : existingOrder?.quantity ?? 1;
    const status = payload.status !== undefined ? payload.status : existingOrder?.status ?? 'pending';
    const orderDate = payload.orderDate !== undefined ? payload.orderDate : existingOrder?.orderDate ?? null;
    const category = payload.category !== undefined ? payload.category : existingOrder?.category ?? null;
    const amountProvided = payload.amount !== undefined ? payload.amount : null;

    if (customerId === undefined || customerId === null) {
        throw new Error('customerId is required');
    }

    if (productId === undefined || productId === null) {
        throw new Error('productId is required');
    }

    const { customer, product } = await fetchOrderDetails(client, userId, customerId, productId);
    const resolvedAmount = amountProvided !== null ? amountProvided : Number(product.price || 0) * Number(quantity || 0);

    return {
        customerId,
        productId,
        customerName: customer.name,
        customerEmail: customer.email,
        productName: product.name,
        productSku: product.sku,
        productCategory: product.category,
        quantity,
        amount: resolvedAmount,
        orderDate,
        status,
        category: category ?? product.category ?? null,
    };
};

const listOrders = async (userId, { customer, startDate, endDate, limit, offset, sortBy, sortDir }) => {
    const safeUserId = userId || '';
    const whereValues = [safeUserId];
    const whereClauses = ['(user_id = $1 OR user_id IS NULL)'];

    if (customer) {
        whereValues.push(`%${customer}%`);
        whereClauses.push(
            `(customer_name ILIKE $${whereValues.length}
              OR customer_email ILIKE $${whereValues.length}
              OR product_name ILIKE $${whereValues.length}
              OR product_sku ILIKE $${whereValues.length})`
        );
    }

    if (startDate) {
        whereValues.push(startDate);
        whereClauses.push(`order_date >= $${whereValues.length}`);
    }

    if (endDate) {
        whereValues.push(endDate);
        whereClauses.push(`order_date <= $${whereValues.length}`);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
    const allowedSort = new Set([
        'customer_name',
        'product_name',
        'order_date',
        'quantity',
        'amount',
        'status',
        'category',
        'created_at',
    ]);
    const safeSortBy = allowedSort.has(sortBy) ? sortBy : 'order_date';
    const safeSortDir = sortDir === 'asc' ? 'ASC' : 'DESC';

    const countResult = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM orders
         ${whereSql}`,
        whereValues
    );

    const limitIndex = whereValues.length + 1;
    const offsetIndex = whereValues.length + 2;
    const listValues = [...whereValues, limit, offset];

    const listResult = await pool.query(
        `${ORDER_SELECT_SQL}
         ${whereSql}
         ORDER BY ${safeSortBy} ${safeSortDir}
         LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
        listValues
    );

    return {
        items: listResult.rows.map(mapOrder),
        total: countResult.rows[0]?.count || 0,
    };
};

const getOrderById = async (userId, id) => {
    const safeUserId = userId || '';
    const result = await pool.query(`${ORDER_SELECT_SQL} WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)`, [id, safeUserId]);
    return result.rows[0] ? mapOrder(result.rows[0]) : null;
};

const createOrder = async (userId, payload) => {
    const safeUserId = userId || '';
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const resolved = await buildOrderWritePayload(client, safeUserId, payload);

        const result = await client.query(
            `INSERT INTO orders (
                user_id,
                customer_id,
                product_id,
                customer_name,
                customer_email,
                product_name,
                product_sku,
                product_category,
                quantity,
                amount,
                order_date,
                status,
                category
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, CURRENT_DATE), $12, $13)
             RETURNING ${ORDER_COLUMNS.join(', ')}`,
            [
                safeUserId,
                resolved.customerId,
                resolved.productId,
                resolved.customerName,
                resolved.customerEmail,
                resolved.productName,
                resolved.productSku,
                resolved.productCategory,
                resolved.quantity,
                resolved.amount,
                resolved.orderDate,
                resolved.status,
                resolved.category,
            ]
        );

        if (resolved.status === 'completed') {
            await adjustProductStock(client, safeUserId, resolved.productId, -Number(resolved.quantity));
        }

        await syncOrderAnalyticsRecord(client, result.rows[0].id);

        await client.query('COMMIT');

        return mapOrder(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const updateOrder = async (userId, id, payload) => {
    const safeUserId = userId || '';
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const existingResult = await client.query(
            `SELECT
                id,
                user_id AS "userId",
                customer_id AS "customerId",
                product_id AS "productId",
                customer_name AS "customerName",
                customer_email AS "customerEmail",
                product_name AS "productName",
                product_sku AS "productSku",
                product_category AS "productCategory",
                quantity,
                amount,
                order_date AS "orderDate",
                status,
                category
             FROM orders
             WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)`,
            [id, safeUserId]
        );

        const existingOrder = existingResult.rows[0] || null;
        if (!existingOrder) {
            await client.query('ROLLBACK');
            return null;
        }

        const resolved = await buildOrderWritePayload(client, safeUserId, payload, existingOrder);
        const result = await client.query(
            `UPDATE orders
             SET customer_id = $1,
                 product_id = $2,
                 customer_name = $3,
                 customer_email = $4,
                 product_name = $5,
                 product_sku = $6,
                 product_category = $7,
                 quantity = $8,
                 amount = $9,
                 order_date = COALESCE($10, CURRENT_DATE),
                 status = $11,
                 category = $12,
                 updated_at = NOW()
             WHERE id = $13 AND (user_id = $14 OR user_id IS NULL)
             RETURNING ${ORDER_COLUMNS.join(', ')}`,
            [
                resolved.customerId,
                resolved.productId,
                resolved.customerName,
                resolved.customerEmail,
                resolved.productName,
                resolved.productSku,
                resolved.productCategory,
                resolved.quantity,
                resolved.amount,
                resolved.orderDate,
                resolved.status,
                resolved.category,
                id,
                safeUserId,
            ]
        );

        const oldStatus = existingOrder.status;
        const newStatus = resolved.status;
        const oldProductId = Number(existingOrder.productId);
        const newProductId = Number(resolved.productId);
        const oldQty = Number(existingOrder.quantity);
        const newQty = Number(resolved.quantity);

        if (oldStatus !== 'completed' && newStatus === 'completed') {
            await adjustProductStock(client, safeUserId, newProductId, -newQty);
        } else if (oldStatus === 'completed' && newStatus !== 'completed') {
            await adjustProductStock(client, safeUserId, oldProductId, oldQty);
        } else if (oldStatus === 'completed' && newStatus === 'completed') {
            if (oldProductId === newProductId) {
                await adjustProductStock(client, safeUserId, newProductId, oldQty - newQty);
            } else {
                await adjustProductStock(client, safeUserId, oldProductId, oldQty);
                await adjustProductStock(client, safeUserId, newProductId, -newQty);
            }
        }

        await syncOrderAnalyticsRecord(client, id);

        await client.query('COMMIT');

        return result.rows[0] ? mapOrder(result.rows[0]) : null;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const deleteOrder = async (userId, id) => {
    const safeUserId = userId || '';
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `DELETE FROM orders
             WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)
             RETURNING ${ORDER_COLUMNS.join(', ')}`,
            [id, safeUserId]
        );

        if (result.rows[0]) {
            const deletedOrder = result.rows[0];
            if (deletedOrder.status === 'completed' && deletedOrder.product_id) {
                await adjustProductStock(
                    client,
                    safeUserId,
                    Number(deletedOrder.product_id),
                    Number(deletedOrder.quantity || 1)
                );
            }
            await deleteOrderAnalyticsRecord(client, id);
        }

        await client.query('COMMIT');
        return result.rows[0] ? mapOrder(result.rows[0]) : null;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const bulkInsertOrders = async (userId, rows) => {
    const safeUserId = userId || '';
    const client = await pool.connect();
    const errors = [];
    let imported = 0;

    try {
        await client.query('BEGIN');

        for (let i = 0; i < rows.length; i += 1) {
            const row = rows[i];

            try {
                const resolved = await buildOrderWritePayload(client, safeUserId, row);
                const insertResult = await client.query(
                    `INSERT INTO orders (
                        user_id,
                        customer_id,
                        product_id,
                        customer_name,
                        customer_email,
                        product_name,
                        product_sku,
                        product_category,
                        quantity,
                        amount,
                        order_date,
                        status,
                        category
                    )
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, CURRENT_DATE), $12, $13)
                     RETURNING id`,
                    [
                        safeUserId,
                        resolved.customerId,
                        resolved.productId,
                        resolved.customerName,
                        resolved.customerEmail,
                        resolved.productName,
                        resolved.productSku,
                        resolved.productCategory,
                        resolved.quantity,
                        resolved.amount,
                        resolved.orderDate,
                        resolved.status,
                        resolved.category,
                    ]
                );

                if (resolved.status === 'completed') {
                    await adjustProductStock(client, safeUserId, resolved.productId, -Number(resolved.quantity));
                }

                await syncOrderAnalyticsRecord(client, insertResult.rows[0].id);
                imported += 1;
            } catch (error) {
                errors.push({ row: i + 1, message: error.message });
            }
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }

    return { imported, failed: errors.length, errors };
};

const getCustomerOrderStats = async (userId, customerEmail) => {
    const safeUserId = userId || '';
    const result = await pool.query(
        `SELECT
            COUNT(*)::int AS order_count,
            COALESCE(SUM(amount), 0) AS total_spend,
            MAX(order_date) AS last_order_date
         FROM orders
         WHERE (user_id = $1 OR user_id IS NULL) AND customer_email = $2`,
        [safeUserId, customerEmail]
    );

    const row = result.rows[0];
    const lastOrderDate = row?.last_order_date || null;
    const daysSinceLastOrder = lastOrderDate
        ? Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;

    return {
        orderCount: row?.order_count || 0,
        totalSpend: Number(row?.total_spend || 0),
        daysSinceLastOrder,
    };
};

module.exports = {
    ensureOrdersTable,
    ensureOrderAnalyticsTable,
    listOrders,
    getOrderById,
    createOrder,
    updateOrder,
    deleteOrder,
    bulkInsertOrders,
    getCustomerOrderStats,
};
