const { getCustomerById } = require('../services/customerService');
const { generateOutreachMessage, sendEmail } = require('../services/outreachService');

const generateHandler = async (req, res, next) => {
    try {
        const customerId = Number(req.body.customerId);
        if (Number.isNaN(customerId)) {
            res.status(400);
            throw new Error('customerId is required');
        }

        const customer = await getCustomerById(req.user.uid, customerId);
        if (!customer) {
            res.status(404);
            throw new Error('Customer not found');
        }

        const message = await generateOutreachMessage(customer);
        if (!message) {
            res.status(502);
            throw new Error('Failed to generate outreach message');
        }

        res.json(message);
    } catch (error) {
        next(error);
    }
};

const sendHandler = async (req, res, next) => {
    try {
        const customerId = Number(req.body.customerId);
        const { channel, subject, message } = req.body;

        if (Number.isNaN(customerId)) {
            res.status(400);
            throw new Error('customerId is required');
        }

        if (channel !== 'email') {
            res.status(400);
            throw new Error('channel must be "email" (WhatsApp is sent client-side via wa.me)');
        }

        if (!message || typeof message !== 'string') {
            res.status(400);
            throw new Error('message is required');
        }

        if (!subject || typeof subject !== 'string') {
            res.status(400);
            throw new Error('subject is required for email');
        }

        const customer = await getCustomerById(req.user.uid, customerId);
        if (!customer) {
            res.status(404);
            throw new Error('Customer not found');
        }

        await sendEmail(customer, subject, message);

        res.json({ success: true, channel, customerId });
    } catch (error) {
        next(error);
    }
};

module.exports = { generateHandler, sendHandler };
