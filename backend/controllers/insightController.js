const {
    rebuildInsights,
    listInsights,
    getInsightsByCustomer,
    dismissInsight,
} = require('../services/insightService');

const listInsightsHandler = async (req, res, next) => {
    try {
        const insights = await listInsights(req.user.uid, {
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
        const insights = await getInsightsByCustomer(req.user.uid, customerId);
        res.json(insights);
    } catch (error) { next(error); }
};

const rebuildInsightsHandler = async (req, res, next) => {
    try {
        const count = await rebuildInsights(req.user.uid);
        res.json({ message: `${count} insights generated` });
    } catch (error) { next(error); }
};

const dismissInsightHandler = async (req, res, next) => {
    try {
        const updated = await dismissInsight(req.user.uid, req.params.id);
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