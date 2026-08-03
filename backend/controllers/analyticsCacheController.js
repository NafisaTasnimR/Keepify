const { clearAnalyticsCache } = require('../services/analyticsService');

const clearCacheHandler = async (req, res) => {
    try {
        await clearAnalyticsCache();
        res.status(200).json({ message: 'Analytics cache cleared successfully' });
    } catch (error) {
        console.error('Error clearing analytics cache:', error);
        res.status(500).json({ error: 'Failed to clear analytics cache' });
    }
};

module.exports = {
    clearCacheHandler,
};
