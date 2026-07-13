const express = require('express');
const {
    listCustomersHandler,
    getCustomerByIdHandler,
    createCustomerHandler,
    updateCustomerHandler,
    deleteCustomerHandler,
} = require('../controllers/customerController');
const { saveChurnScore } = require('../services/customerService');
const { rebuildInsights } = require('../services/insightService');
const { scoreCustomer, scoreAllCustomers } = require('../services/churnService');

const router = express.Router();

// ─── Collection routes ─────────────────────────────────────────
router.get('/',  listCustomersHandler);
router.post('/', createCustomerHandler);

// ─── Named routes (MUST come before /:id) ─────────────────────

// Score all customers via ML service, then rebuild insights
router.post('/score-all', async (req, res, next) => {
    try {
        const result = await scoreAllCustomers();
        res.json({ message: 'Scoring complete', ...result });
    } catch (error) { next(error); }
});

// ─── Param routes ──────────────────────────────────────────────
router.get('/:id',    getCustomerByIdHandler);
router.put('/:id',    updateCustomerHandler);
router.delete('/:id', deleteCustomerHandler);

// Score a single customer via ML service, then rebuild insights
router.post('/:id/score', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) { res.status(400); throw new Error('Invalid customer id'); }

        const updated = await scoreCustomer(id);
        if (!updated) { res.status(404); throw new Error('Customer not found'); }

        res.json(updated);
    } catch (error) { next(error); }
});

// Manually post a churn score (used by ML teammate directly)
// Body: { score: 0.85 }
router.post('/:id/churn-score', async (req, res, next) => {
    try {
        const id    = Number(req.params.id);
        const score = Number(req.body.score);

        if (Number.isNaN(id)) {
            res.status(400); throw new Error('Invalid customer id');
        }
        if (Number.isNaN(score) || score < 0 || score > 1) {
            res.status(400); throw new Error('score must be a number between 0 and 1');
        }

        const updated = await saveChurnScore(id, score);
        if (!updated) { res.status(404); throw new Error('Customer not found'); }

        await rebuildInsights();
        res.json(updated);
    } catch (error) { next(error); }
});

module.exports = router;