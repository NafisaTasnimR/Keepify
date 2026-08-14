const { getCustomerById, saveChurnScore } = require('./customerService');
const { rebuildInsights } = require('./insightService');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

const scoreCustomer = async (userId, customerId) => {
    const customer = await getCustomerById(userId, customerId);
    if (!customer) return null;

    const recencyDays = customer.lastActive
        ? Math.floor((Date.now() - new Date(customer.lastActive).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

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
    return saveChurnScore(userId, customerId, score);
};

const scoreAllCustomers = async (userId) => {
    const { pool } = require('../config/postgres');
    const { rows } = await pool.query(
        'SELECT id FROM customers WHERE user_id = $1 OR user_id IS NULL',
        [userId]
    );

    const results = await Promise.allSettled(
        rows.map((r) => scoreCustomer(userId, r.id))
    );

    await rebuildInsights(userId);

    const failed  = results.filter((r) => r.status === 'rejected').length;
    const success = results.filter((r) => r.status === 'fulfilled').length;
    return { total: rows.length, success, failed };
};

module.exports = { scoreCustomer, scoreAllCustomers };
