const axios = require('axios');
const { getCustomerOrderStats } = require('./orderService');

const FLASK_URL = process.env.FLASK_URL || 'http://localhost:5001';

const predictChurn = async (customerEmail) => {
    const features = await getCustomerOrderStats(customerEmail);

    const response = await axios.post(`${FLASK_URL}/predict`, features, {
        timeout: 5000,
    });

    return {
        features,
        churnScore: response.data.churnScore,
        riskLevel: response.data.riskLevel,
    };
};

module.exports = { predictChurn };
