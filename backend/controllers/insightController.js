const {
    rebuildInsights,
    listInsights,
    getInsightsByCustomer,
    dismissInsight,
} = require('../services/insightService');

const listInsightsHandler = async (req, res, next) => {
    try {
        const insights = await listInsights({
            type:     req.query.type,
            priority: req.query.priority,
        });
        res.json(insights);
    } catch (error) { next(error); }
};

const getInsightsByCustomerHandler = async (req, res, next) => {
    try {
        const customerId = Number(req.params.customerId);
        if (Number.isNaN(customerId)) {
            res.status(400);
            throw new Error('Invalid customer id');
        }
        const insights = await getInsightsByCustomer(customerId);
        res.json(insights);
    } catch (error) { next(error); }
};

const rebuildInsightsHandler = async (req, res, next) => {
    try {
        const count = await rebuildInsights();
        res.json({ message: `${count} insights generated` });
    } catch (error) { next(error); }
};

const dismissInsightHandler = async (req, res, next) => {
    try {
        const updated = await dismissInsight(req.params.id);
        if (!updated) { res.status(404); throw new Error('Insight not found'); }
        res.json(updated);
    } catch (error) { next(error); }
};

module.exports = {
    listInsightsHandler,
    getInsightsByCustomerHandler,
    rebuildInsightsHandler,
    dismissInsightHandler,
};