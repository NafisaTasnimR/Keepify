const express = require('express');
const { generateHandler, sendHandler } = require('../controllers/outreachController');

const router = express.Router();

router.post('/generate', generateHandler);
router.post('/send', sendHandler);

module.exports = router;
