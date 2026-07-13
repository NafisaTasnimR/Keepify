const { predictChurn } = require('../services/churnService');
const PredictionLog = require('../models/PredictionLog');

const predictChurnHandler = async (req, res, next) => {
    try {
        const { customerEmail } = req.body;

        if (!customerEmail || typeof customerEmail !== 'string') {
            res.status(400);
            throw new Error('customerEmail is required');
        }

        const { features, churnScore, riskLevel } = await predictChurn(customerEmail);

        const log = await PredictionLog.create({
            customerEmail,
            features,
            churnScore,
            riskLevel,
        });

        res.json({
            customerEmail,
            features,
            churnScore,
            riskLevel,
            logId: log._id,
        });
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            res.status(502);
            next(new Error('Churn prediction service is unavailable'));
            return;
        }
        next(error);
    }
};

module.exports = { predictChurnHandler };
