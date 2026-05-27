const express = require('express');
const {
    getTrendsHandler,
    getPeaksHandler,
    getKpisHandler,
} = require('../controllers/analyticsController');

const router = express.Router();

router.get('/trends', getTrendsHandler);
router.get('/peaks', getPeaksHandler);
router.get('/kpis', getKpisHandler);

module.exports = router;
