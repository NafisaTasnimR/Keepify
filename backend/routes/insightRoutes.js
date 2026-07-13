const express = require('express');
const {
    listInsightsHandler,
    getInsightsByCustomerHandler,
    rebuildInsightsHandler,
    dismissInsightHandler,
} = require('../controllers/insightController');

const router = express.Router();

router.get('/',                          listInsightsHandler);
router.get('/customer/:customerId',      getInsightsByCustomerHandler);
router.post('/rebuild',                  rebuildInsightsHandler);     // called after ML runs
router.patch('/:id/dismiss',             dismissInsightHandler);

module.exports = router;