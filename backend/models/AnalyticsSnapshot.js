const mongoose = require('mongoose');

const AnalyticsSnapshotSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true, index: true },
        payload: { type: mongoose.Schema.Types.Mixed, required: true },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
);

AnalyticsSnapshotSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AnalyticsSnapshot', AnalyticsSnapshotSchema);
