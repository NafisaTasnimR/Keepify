const express = require('express');
const {
    getSettingsHandler,
    createSettingsHandler,
    updateSettingsHandler,
} = require('../controllers/settingsController');

const router = express.Router();

router.get('/me', getSettingsHandler);
router.put('/me', updateSettingsHandler);
router.post('/me', createSettingsHandler);

// Fallback for root or param routes so frontend works smoothly
router.get('/', getSettingsHandler);
router.put('/', updateSettingsHandler);
router.post('/', createSettingsHandler);
router.get('/:email', getSettingsHandler);
router.put('/:email', updateSettingsHandler);

module.exports = router;