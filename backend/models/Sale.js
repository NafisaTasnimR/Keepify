const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema(
    {
        orderId: { type: String },
        productId: { type: String },
        customerId: { type: String },
        quantity: { type: Number, default: 1 },
        amount: { type: Number, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Sale', SaleSchema);
