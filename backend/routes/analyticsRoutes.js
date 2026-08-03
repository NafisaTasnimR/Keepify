const express = require('express');
const {
    getTrendsHandler,
    getPeaksHandler,
    getKpisHandler,
    getCategoryBreakdownHandler,
} = require('../controllers/analyticsController');
const { clearCacheHandler } = require('../controllers/analyticsCacheController');

const router = express.Router();

router.get('/trends', getTrendsHandler);
router.get('/peaks', getPeaksHandler);
router.get('/kpis', getKpisHandler);
router.get('/category-breakdown', getCategoryBreakdownHandler);
router.delete('/cache', clearCacheHandler);

module.exports = router;
