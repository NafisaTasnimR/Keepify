const { pool } = require('../config/postgres');

const CUSTOMER_COLUMNS = [
    'id', 'user_id', 'name', 'email', 'phone',
    'total_orders', 'total_spending',
    'last_active', 'churn_score', 'churn_risk',
    'created_at',
];

const mapCustomer = (row) => ({
    id:            row.id,
    userId:        row.user_id,
    name:          row.name,
    email:         row.email,
    phone:         row.phone || null,
    totalOrders:   row.total_orders   !== null ? Number(row.total_orders)   : 0,
    totalSpending: row.total_spending !== null ? Number(row.total_spending) : 0,
    lastActive:    row.last_active    || null,
    churnScore:    row.churn_score    !== null ? Number(row.churn_score)    : null,
    churnRisk:     row.churn_risk     || null,   // 'low' | 'medium' | 'high' | null
    createdAt:     row.created_at,
});

const ensureCustomersTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS customers (
            id              SERIAL PRIMARY KEY,
            user_id         TEXT NOT NULL,
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

        ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id TEXT;
        CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);

        -- Drop the old global unique constraint on email if it exists,
        -- since different users can have customers with the same email.
        DO $$ BEGIN
            ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_email_key;
        EXCEPTION WHEN undefined_object THEN NULL; END $$;

        -- Add a per-user unique constraint instead
        CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_user_email ON customers(user_id, email);
    `);
};

const listCustomers = async (userId, { search, risk, limit, offset, sortBy, sortDir }) => {
    const allowedSort = new Set([
        'name', 'email', 'total_orders',
        'total_spending', 'last_active', 'created_at', 'churn_score',
    ]);
    const safeSortBy  = allowedSort.has(sortBy) ? sortBy : 'created_at';
    const safeSortDir = sortDir === 'asc' ? 'ASC' : 'DESC';

    const whereValues  = [userId];
    const whereClauses = ['user_id = $1'];

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
    const { rows } = await pool.query(
        `SELECT ${CUSTOMER_COLUMNS.join(', ')} FROM customers WHERE id = $1 AND user_id = $2`,
        [id, userId]
    );
    return rows[0] ? mapCustomer(rows[0]) : null;
};

const createCustomer = async (userId, payload) => {
    const { name, email, phone } = payload;
    const { rows } = await pool.query(
        `INSERT INTO customers (user_id, name, email, phone)
         VALUES ($1, $2, $3, $4)
         RETURNING ${CUSTOMER_COLUMNS.join(', ')}`,
        [userId, name, email, phone || null]
    );
    return mapCustomer(rows[0]);
};

const updateCustomer = async (userId, id, payload) => {
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

    values.push(id, userId);
    const { rows } = await pool.query(
        `UPDATE customers SET ${fields.join(', ')}
         WHERE id = $${values.length - 1} AND user_id = $${values.length}
         RETURNING ${CUSTOMER_COLUMNS.join(', ')}`,
        values
    );
    return rows[0] ? mapCustomer(rows[0]) : null;
};

const deleteCustomer = async (userId, id) => {
    const { rows } = await pool.query(
        `DELETE FROM customers WHERE id = $1 AND user_id = $2
         RETURNING ${CUSTOMER_COLUMNS.join(', ')}`,
        [id, userId]
    );
    return rows[0] ? mapCustomer(rows[0]) : null;
};

// ─── Called by churnService after ML scoring ──────────────────
const saveChurnScore = async (userId, id, score) => {
    const risk = score >= 0.70 ? 'high' : score >= 0.30 ? 'medium' : 'low';
    const { rows } = await pool.query(
        `UPDATE customers
         SET churn_score = $1, churn_risk = $2
         WHERE id = $3 AND user_id = $4
         RETURNING ${CUSTOMER_COLUMNS.join(', ')}`,
        [score, risk, id, userId]
    );
    return rows[0] ? mapCustomer(rows[0]) : null;
};

const getCustomersByRisk = async (userId, riskLevels) => {
    const { rows } = await pool.query(
        `SELECT ${CUSTOMER_COLUMNS.join(', ')} FROM customers
         WHERE user_id = $1 AND churn_risk = ANY($2)
         ORDER BY churn_score DESC`,
        [userId, riskLevels]
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