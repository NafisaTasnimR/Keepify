const express = require('express');
const { getAIInsightsHandler } = require('../controllers/aiInsightsController');

const router = express.Router();

// GET /api/ai-insights          → get cached or fresh insights
// GET /api/ai-insights?refresh=true → force regenerate
router.get('/', getAIInsightsHandler);

module.exports = router;