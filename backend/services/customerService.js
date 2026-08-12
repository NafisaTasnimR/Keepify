const { pool } = require('../config/postgres');

const CUSTOMER_COLUMNS = [
    'id', 'user_id', 'name', 'email', 'phone',
    'total_orders', 'total_spending',
    'last_active', 'churn_score', 'churn_risk',
    'created_at',
];

const mapCustomer = (row) => ({
    id:            row.id,
    userId:        row.user_id || null,
    name:          row.name,
    email:         row.email,
    phone:         row.phone || null,
    totalOrders:   row.total_orders   !== null ? Number(row.total_orders)   : 0,
    totalSpending: row.total_spending !== null ? Number(row.total_spending) : 0,
    lastActive:    row.last_active    || null,
    churnScore:    row.churn_score    !== null ? Number(row.churn_score)    : null,
    churnRisk:     row.churn_risk     || null,
    createdAt:     row.created_at,
});

const ensureCustomersTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id              SERIAL PRIMARY KEY,
                user_id         TEXT,
                name            TEXT NOT NULL,
                email           TEXT NOT NULL,
                phone           TEXT,
                total_orders    INTEGER        NOT NULL DEFAULT 0,
                total_spending  NUMERIC(12,2)  NOT NULL DEFAULT 0.00,
                last_active     TIMESTAMPTZ,
                churn_score     NUMERIC(5,4),
                churn_risk      TEXT CHECK (churn_risk IN ('low','medium','high')),
                created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
            );
        `);
        await pool.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id TEXT;`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);`);
    } catch (err) {
        console.error('Error in ensureCustomersTable:', err.message);
    }
};

const listCustomers = async (userId, { search, risk, limit, offset, sortBy, sortDir }) => {
    const safeUserId = userId || '';
    const allowedSort = new Set([
        'name', 'email', 'total_orders',
        'total_spending', 'last_active', 'created_at', 'churn_score',
    ]);
    const safeSortBy  = allowedSort.has(sortBy) ? sortBy : 'created_at';
    const safeSortDir = sortDir === 'asc' ? 'ASC' : 'DESC';

    const whereValues  = [safeUserId];
    const whereClauses = ['(user_id = $1 OR user_id IS NULL)'];

    if (search) {
        whereValues.push(`%${search}%`);
        whereClauses.push(
            `(name ILIKE $${whereValues.length} OR email ILIKE $${whereValues.length})`
        );
    }

    if (risk && risk.length) {
        whereValues.push(risk);
        whereClauses.push(`churn_risk = ANY($${whereValues.length})`);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const countResult = await pool.query(
        `SELECT COUNT(*)::int AS count FROM customers ${whereSql}`,
        whereValues
    );

    const listValues = [...whereValues, limit, offset];
    const listResult = await pool.query(
        `SELECT ${CUSTOMER_COLUMNS.join(', ')} FROM customers
         ${whereSql}
         ORDER BY ${safeSortBy} ${safeSortDir}
         LIMIT $${whereValues.length + 1} OFFSET $${whereValues.length + 2}`,
        listValues
    );

    return {
        items: listResult.rows.map(mapCustomer),
        total: countResult.rows[0]?.count || 0,
    };
};

const getCustomerById = async (userId, id) => {
    const safeUserId = userId || '';
    const { rows } = await pool.query(
        `SELECT ${CUSTOMER_COLUMNS.join(', ')} FROM customers WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)`,
        [id, safeUserId]
    );
    return rows[0] ? mapCustomer(rows[0]) : null;
};

const createCustomer = async (userId, payload) => {
    const safeUserId = userId || '';
    const { name, email, phone } = payload;
    const { rows } = await pool.query(
        `INSERT INTO customers (user_id, name, email, phone)
         VALUES ($1, $2, $3, $4)
         RETURNING ${CUSTOMER_COLUMNS.join(', ')}`,
        [safeUserId, name, email, phone || null]
    );
    return mapCustomer(rows[0]);
};

const updateCustomer = async (userId, id, payload) => {
    const safeUserId = userId || '';
    const fields = [];
    const values = [];

    const pushField = (col, val) => {
        values.push(val);
        fields.push(`${col} = $${values.length}`);
    };

    if (payload.name         !== undefined) pushField('name',          payload.name);
    if (payload.email        !== undefined) pushField('email',         payload.email);
    if (payload.phone        !== undefined) pushField('phone',         payload.phone);
    if (payload.lastActive   !== undefined) pushField('last_active',   payload.lastActive);
    if (payload.totalOrders  !== undefined) pushField('total_orders',  payload.totalOrders);
    if (payload.totalSpending!== undefined) pushField('total_spending',payload.totalSpending);

    if (!fields.length) return null;

    values.push(id, safeUserId);
    const { rows } = await pool.query(
        `UPDATE customers SET ${fields.join(', ')}
         WHERE id = $${values.length - 1} AND (user_id = $${values.length} OR user_id IS NULL)
         RETURNING ${CUSTOMER_COLUMNS.join(', ')}`,
        values
    );
    return rows[0] ? mapCustomer(rows[0]) : null;
};

const deleteCustomer = async (userId, id) => {
    const safeUserId = userId || '';
    const { rows } = await pool.query(
        `DELETE FROM customers WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)
         RETURNING ${CUSTOMER_COLUMNS.join(', ')}`,
        [id, safeUserId]
    );
    return rows[0] ? mapCustomer(rows[0]) : null;
};

const saveChurnScore = async (userId, id, score) => {
    const safeUserId = userId || '';
    const risk = score >= 0.70 ? 'high' : score >= 0.30 ? 'medium' : 'low';
    const { rows } = await pool.query(
        `UPDATE customers
         SET churn_score = $1, churn_risk = $2
         WHERE id = $3 AND (user_id = $4 OR user_id IS NULL)
         RETURNING ${CUSTOMER_COLUMNS.join(', ')}`,
        [score, risk, id, safeUserId]
    );
    return rows[0] ? mapCustomer(rows[0]) : null;
};

const getCustomersByRisk = async (userId, riskLevels) => {
    const safeUserId = userId || '';
    const { rows } = await pool.query(
        `SELECT ${CUSTOMER_COLUMNS.join(', ')} FROM customers
         WHERE (user_id = $1 OR user_id IS NULL) AND churn_risk = ANY($2)
         ORDER BY churn_score DESC`,
        [safeUserId, riskLevels]
    );
    return rows.map(mapCustomer);
};

const getHighRiskCustomers = (userId) => getCustomersByRisk(userId, ['high']);

module.exports = {
    ensureCustomersTable,
    listCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    saveChurnScore,
    getHighRiskCustomers,
    getCustomersByRisk,
};