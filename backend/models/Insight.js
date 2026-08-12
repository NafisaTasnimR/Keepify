const mongoose = require('mongoose');

const InsightSchema = new mongoose.Schema(
    {
        userId:     { type: String, required: true, index: true },
        type:       {
            type: String,
            enum: ['follow_up', 'restock', 'promotion', 'upsell'],
            required: true,
        },
        customerId: { type: Number, default: null },
        productId:  { type: Number, default: null },
        title:      { type: String, required: true },
        description:{ type: String, required: true },
        action:     { type: String, required: true },
        priority:   { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
        dismissed:  { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Insight', InsightSchema);