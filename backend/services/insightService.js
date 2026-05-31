const Insight = require('../models/Insight');
const { getHighRiskCustomers } = require('./customerService');

// ─── Prescriptive rules engine ────────────────────────────────
// Call this after your ML teammate pushes churn scores.
const rebuildInsights = async () => {
    const highRisk = await getHighRiskCustomers();

    const freshInsights = highRisk.map((customer) => ({
        type:        'follow_up',
        customerId:  customer.id,
        title:       `Follow up with ${customer.name}`,
        description: `${customer.name} has a ${Math.round(customer.churnScore * 100)}% churn probability and may stop buying soon.`,
        action:      customer.totalSpending > 5000
            ? 'Offer a loyalty discount to retain this high-value customer'
            : 'Send a re-engagement message or small discount offer',
        priority:    'high',
    }));

    // Wipe stale follow_up insights, insert fresh ones
    await Insight.deleteMany({ type: 'follow_up' });
    if (freshInsights.length) {
        await Insight.insertMany(freshInsights);
    }

    return freshInsights.length;
};

const listInsights = async ({ type, priority } = {}) => {
    const filter = { dismissed: false };
    if (type)     filter.type     = type;
    if (priority) filter.priority = priority;

    // Sort: high priority first, then newest
    return Insight.find(filter).sort({ priority: -1, createdAt: -1 }).lean();
};

// Get all insights linked to one customer (for the detail drawer)
const getInsightsByCustomer = async (customerId) => {
    return Insight.find({ customerId, dismissed: false }).lean();
};

const dismissInsight = async (id) => {
    return Insight.findByIdAndUpdate(id, { dismissed: true }, { new: true });
};

module.exports = {
    rebuildInsights,
    listInsights,
    getInsightsByCustomer,
    dismissInsight,
};