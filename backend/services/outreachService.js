const nodemailer = require('nodemailer');

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent';

const generateOutreachMessage = async (customer) => {
    const { name, churnRisk, totalOrders, totalSpending, lastActive } = customer;

    const recencyDays = lastActive
        ? Math.floor((Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const prompt = `You are a CRM marketing copywriter. Write a retention/promotional outreach message for one customer who is at risk of churning.

CUSTOMER:
- Name: ${name}
- Risk: ${churnRisk}
- Orders: ${totalOrders}
- Total spent: ৳${Number(totalSpending).toLocaleString()}
- Inactive for: ${recencyDays !== null ? `${recencyDays} days` : 'never purchased'}

Write two versions of the SAME retention message:
1. An email version: a subject line and a warm, slightly longer body (2-4 short paragraphs), signed off generically (e.g. "The Team").
2. A WhatsApp version: short, casual, friendly, may use 1-2 emojis, no more than 3-4 sentences.

Both should address the customer by name, reference their history where natural, and include a clear incentive or reason to come back (discount, new arrivals, etc — invent something plausible and generic, do not invent fake discount codes/percentages as fact, phrase as example offer).

OUTPUT only this JSON, no markdown, no commentary:
{"emailSubject":"...","emailBody":"...","whatsappText":"..."}`;

    let raw;
    try {
        const response = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature:      0.6,
                    maxOutputTokens:  800,
                    responseMimeType: 'application/json',
                },
            }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err?.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    } catch (err) {
        console.error(`Gemini outreach generation failed for ${name}:`, err.message);
        return null;
    }

    if (!raw) {
        console.error(`Empty outreach response for ${name}`);
        return null;
    }

    const clean = raw.replace(/```json|```/g, '').trim();

    let parsed;
    try {
        parsed = JSON.parse(clean);
    } catch {
        console.error(`Failed to parse outreach response for ${name}:`, raw);
        return null;
    }

    return {
        emailSubject: parsed.emailSubject || `A special offer for ${name}`,
        emailBody:    parsed.emailBody    || '',
        whatsappText: parsed.whatsappText || '',
    };
};

const sendEmail = async (customer, subject, body) => {
    if (!customer.email) {
        throw new Error('Customer has no email on file');
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });

    await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: customer.email,
        subject,
        text: body,
    });
};

module.exports = { generateOutreachMessage, sendEmail };