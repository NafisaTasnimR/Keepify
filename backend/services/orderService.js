const { pool } = require('../config/postgres');

const ORDER_COLUMNS = [
    'id',
    'customer_name',
    'customer_email',
    'order_date',
    'amount',
    'status',
    'created_at',
    'updated_at',
];

const ORDER_SELECT_SQL = `SELECT ${ORDER_COLUMNS.join(', ')} FROM orders`;

const mapOrder = (row) => ({
    id: row.id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    orderDate: row.order_date,
    amount: row.amount !== null ? Number(row.amount) : null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const ensureOrdersTable = async () => {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      order_date DATE NOT NULL DEFAULT CURRENT_DATE,
      amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

const listOrders = async ({ customer, startDate, endDate, limit, offset, sortBy, sortDir }) => {
    const whereValues = [];
    const whereClauses = [];

    if (customer) {
        whereValues.push(`%${customer}%`);
        whereClauses.push(
            `(customer_name ILIKE $${whereValues.length} OR customer_email ILIKE $${whereValues.length})`
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

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const allowedSort = new Set(['customer_name', 'order_date', 'amount', 'status', 'created_at']);
    const safeSortBy = allowedSort.has(sortBy) ? sortBy : 'order_date';
    const safeSortDir = sortDir === 'asc' ? 'ASC' : 'DESC';

    const countResult = await pool.query(
        `SELECT COUNT(*)::int AS count FROM orders ${whereSql}`,
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

const getOrderById = async (id) => {
    const result = await pool.query(`${ORDER_SELECT_SQL} WHERE id = $1`, [id]);
    return result.rows[0] ? mapOrder(result.rows[0]) : null;
};

const createOrder = async (payload) => {
    const { customerName, customerEmail, orderDate, amount, status } = payload;

    const result = await pool.query(
        `INSERT INTO orders (customer_name, customer_email, order_date, amount, status)
         VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4, $5)
         RETURNING ${ORDER_COLUMNS.join(', ')}`,
        [customerName, customerEmail, orderDate, amount, status]
    );

    return mapOrder(result.rows[0]);
};

const updateOrder = async (id, payload) => {
    const fields = [];
    const values = [];

    const pushField = (field, value) => {
        values.push(value);
        fields.push(`${field} = $${values.length}`);
    };

    if (payload.customerName !== undefined) {
        pushField('customer_name', payload.customerName);
    }
    if (payload.customerEmail !== undefined) {
        pushField('customer_email', payload.customerEmail);
    }
    if (payload.orderDate !== undefined) {
        pushField('order_date', payload.orderDate);
    }
    if (payload.amount !== undefined) {
        pushField('amount', payload.amount);
    }
    if (payload.status !== undefined) {
        pushField('status', payload.status);
    }

    if (fields.length === 0) {
        return getOrderById(id);
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await pool.query(
        `UPDATE orders
         SET ${fields.join(', ')}
         WHERE id = $${values.length}
         RETURNING ${ORDER_COLUMNS.join(', ')}`,
        values
    );

    return result.rows[0] ? mapOrder(result.rows[0]) : null;
};

const deleteOrder = async (id) => {
    const result = await pool.query(
        `DELETE FROM orders WHERE id = $1 RETURNING ${ORDER_COLUMNS.join(', ')}`,
        [id]
    );

    return result.rows[0] ? mapOrder(result.rows[0]) : null;
};

const bulkInsertOrders = async (rows) => {
    const client = await pool.connect();
    const errors = [];
    let imported = 0;

    try {
        await client.query('BEGIN');

        for (let i = 0; i < rows.length; i += 1) {
            const row = rows[i];
            try {
                await client.query(
                    `INSERT INTO orders (customer_name, customer_email, order_date, amount, status)
                     VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4, $5)`,
                    [row.customerName, row.customerEmail, row.orderDate, row.amount, row.status || 'pending']
                );
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

const getCustomerOrderStats = async (customerEmail) => {
    const result = await pool.query(
        `SELECT
            COUNT(*)::int AS order_count,
            COALESCE(SUM(amount), 0) AS total_spend,
            MAX(order_date) AS last_order_date
         FROM orders
         WHERE customer_email = $1`,
        [customerEmail]
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
    listOrders,
    getOrderById,
    createOrder,
    updateOrder,
    deleteOrder,
    bulkInsertOrders,
    getCustomerOrderStats,
};
