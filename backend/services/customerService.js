const { pool } = require('../config/postgres');

const CUSTOMER_COLUMNS = [
    'id', 'name', 'email', 'phone',
    'total_orders', 'total_spending',
    'last_active', 'churn_score', 'churn_risk',
    'created_at',
];

const mapCustomer = (row) => ({
    id:            row.id,
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
            name            TEXT NOT NULL,
            email           TEXT UNIQUE NOT NULL,
            phone           TEXT,
            total_orders    INTEGER        NOT NULL DEFAULT 0,
            total_spending  NUMERIC(12,2)  NOT NULL DEFAULT 0.00,
            last_active     TIMESTAMPTZ,
            churn_score     NUMERIC(5,4),
            churn_risk      TEXT CHECK (churn_risk IN ('low','medium','high')),
            created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
        );
    `);
};

const listCustomers = async ({ search, risk, limit, offset, sortBy, sortDir }) => {
    const allowedSort = new Set([
        'name', 'email', 'total_orders',
        'total_spending', 'last_active', 'created_at', 'churn_score',
    ]);
    const safeSortBy  = allowedSort.has(sortBy) ? sortBy : 'created_at';
    const safeSortDir = sortDir === 'asc' ? 'ASC' : 'DESC';

    const whereValues  = [];
    const whereClauses = [];

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

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

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

const getCustomerById = async (id) => {
    const { rows } = await pool.query(
        `SELECT ${CUSTOMER_COLUMNS.join(', ')} FROM customers WHERE id = $1`,
        [id]
    );
    return rows[0] ? mapCustomer(rows[0]) : null;
};

const createCustomer = async (payload) => {
    const { name, email, phone } = payload;
    const { rows } = await pool.query(
        `INSERT INTO customers (name, email, phone)
         VALUES ($1, $2, $3)
         RETURNING ${CUSTOMER_COLUMNS.join(', ')}`,
        [name, email, phone || null]
    );
    return mapCustomer(rows[0]);
};

const updateCustomer = async (id, payload) => {
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

    values.push(id);
    const { rows } = await pool.query(
        `UPDATE customers SET ${fields.join(', ')}
         WHERE id = $${values.length}
         RETURNING ${CUSTOMER_COLUMNS.join(', ')}`,
        values
    );
    return rows[0] ? mapCustomer(rows[0]) : null;
};

const deleteCustomer = async (id) => {
    const { rows } = await pool.query(
        `DELETE FROM customers WHERE id = $1
         RETURNING ${CUSTOMER_COLUMNS.join(', ')}`,
        [id]
    );
    return rows[0] ? mapCustomer(rows[0]) : null;
};

// ─── Called by churnService after ML scoring ──────────────────
const saveChurnScore = async (id, score) => {
    const risk = score >= 0.70 ? 'high' : score >= 0.30 ? 'medium' : 'low';
    const { rows } = await pool.query(
        `UPDATE customers
         SET churn_score = $1, churn_risk = $2
         WHERE id = $3
         RETURNING ${CUSTOMER_COLUMNS.join(', ')}`,
        [score, risk, id]
    );
    return rows[0] ? mapCustomer(rows[0]) : null;
};

const getCustomersByRisk = async (riskLevels) => {
    const { rows } = await pool.query(
        `SELECT ${CUSTOMER_COLUMNS.join(', ')} FROM customers
         WHERE churn_risk = ANY($1)
         ORDER BY churn_score DESC`,
        [riskLevels]
    );
    return rows.map(mapCustomer);
};

const getHighRiskCustomers = () => getCustomersByRisk(['high']);

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