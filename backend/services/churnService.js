const { getCustomerById, saveChurnScore } = require('./customerService');
const { rebuildInsights } = require('./insightService');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

const scoreCustomer = async (customerId) => {
    const customer = await getCustomerById(customerId);
    if (!customer) return null;

    // Recency: days since last_active (same as notebook's InvoiceDate recency)
    const recencyDays = customer.lastActive
        ? Math.floor((Date.now() - new Date(customer.lastActive).getTime()) / (1000 * 60 * 60 * 24))
        : 999;  // never purchased = very high recency = high churn risk

    const response = await fetch(`${ML_SERVICE_URL}/predict`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            total_orders:   customer.totalOrders,
            total_spending: customer.totalSpending,
            recency_days:   recencyDays,
        }),
    });

    if (!response.ok) {
        throw new Error(`ML service returned ${response.status}`);
    }

    const { score } = await response.json();
    return saveChurnScore(customerId, score);
};

const scoreAllCustomers = async () => {
    const { pool } = require('../config/postgres');
    const { rows } = await pool.query('SELECT id FROM customers');

    const results = await Promise.allSettled(
        rows.map((r) => scoreCustomer(r.id))
    );

    await rebuildInsights();

    const failed  = results.filter((r) => r.status === 'rejected').length;
    const success = results.filter((r) => r.status === 'fulfilled').length;
    return { total: rows.length, success, failed };
};

module.exports = { scoreCustomer, scoreAllCustomers };