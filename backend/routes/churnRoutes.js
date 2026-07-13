const express = require('express');
const { predictChurnHandler } = require('../controllers/churnController');

const router = express.Router();

router.post('/predict', predictChurnHandler);

module.exports = router;
