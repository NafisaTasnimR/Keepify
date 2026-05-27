const express = require('express');
const {
    getTrendsHandler,
    getPeaksHandler,
    getKpisHandler,
    getCategoryBreakdownHandler,
} = require('../controllers/analyticsController');

const router = express.Router();

router.get('/trends', getTrendsHandler);
router.get('/peaks', getPeaksHandler);
router.get('/kpis', getKpisHandler);
router.get('/category-breakdown', getCategoryBreakdownHandler);

module.exports = router;
