const mongoose = require('mongoose');

const PredictionLogSchema = new mongoose.Schema(
    {
        customerEmail: { type: String, required: true, index: true },
        features: { type: mongoose.Schema.Types.Mixed, required: true },
        churnScore: { type: Number, required: true },
        riskLevel: { type: String, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('PredictionLog', PredictionLogSchema);
