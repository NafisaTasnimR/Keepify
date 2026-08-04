const { getAIInsights } = require('../services/aiInsightsService');

const getAIInsightsHandler = async (req, res, next) => {
    try {
        const forceRefresh = req.query.refresh === 'true';
        const data = await getAIInsights(forceRefresh);
        res.json(data);
    } catch (error) {
        next(error);
    }
};

module.exports = { getAIInsightsHandler };