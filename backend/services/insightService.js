const Insight = require('../models/Insight');
const { pool } = require('../config/postgres');

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent';

const generateInsightForCustomer = async (userId, customer) => {
    const { id, name, churnScore, churnRisk,
            totalOrders, totalSpending, lastActive } = customer;

    console.log(`  Calling Gemini for ${name}...`);

    const recencyDays = lastActive
        ? Math.floor((Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const prompt = `You are a CRM analyst. Given a customer profile, output ONE JSON recommendation.

CUSTOMER:
- Name: ${name}
- Churn probability: ${Math.round((churnScore ?? 0) * 100)}%
- Risk: ${churnRisk}
- Orders: ${totalOrders}
- Total spent: ৳${Number(totalSpending).toLocaleString()}
- Inactive for: ${recencyDays !== null ? `${recencyDays} days` : 'never purchased'}

RULES:
- If risk is "low" AND spending > 5000: type="upsell", priority="low", suggest premium product
- If risk is "low" AND orders > 10: type="upsell", priority="low", suggest loyalty reward
- If risk is "medium": type="promotion", priority="medium", suggest a time-limited offer
- If risk is "high" AND totalOrders === 0: type="promotion", priority="high", suggest first purchase incentive
- If risk is "high" AND inactive > 45 days: type="follow_up", priority="high", suggest personal outreach
- If risk is "high" AND inactive <= 45 days: type="follow_up", priority="high", suggest discount offer

Write the description and action as advice TO the business owner ABOUT the customer, not as a message to the customer.
Use the customer's name and specific numbers in the description.

OUTPUT only this JSON, no markdown:
{"type":"...","title":"...","description":"...","action":"...","priority":"..."}`;

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
                    temperature:      0.4,
                    maxOutputTokens:  500,
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
        console.log(`  Gemini response for ${name}:`, raw?.substring(0, 80));
    } catch (err) {
        console.error(`  Gemini API call failed for ${name}:`, err.message);
        return null;
    }

    if (!raw) {
        console.error(`  Empty response for ${name}`);
        return null;
    }

    const clean = raw.replace(/```json|```/g, '').trim();

    let parsed;
    try {
        parsed = JSON.parse(clean);
    } catch {
        console.error(`  Failed to parse response for ${name}:`, raw);
        return null;
    }

    const isHighValue  = Number(totalSpending) > 8000;
    const isBorderline = churnScore >= 0.28 && churnScore < 0.40;

    if (isHighValue && isBorderline) {
        parsed.action   = `${parsed.action} — prioritise urgently, this is a high-value customer approaching high risk`;
        parsed.priority = 'high';
    }

    return {
        userId,
        type:        parsed.type        || 'follow_up',
        title:       parsed.title       || `Insight for ${name}`,
        description: parsed.description || '',
        action:      parsed.action      || '',
        priority:    parsed.priority    || churnRisk || 'medium',
        customerId:  id,
    };
};

const rebuildInsights = async (userId) => {
    const { rows } = await pool.query(
        `SELECT id, name,
                churn_score    AS "churnScore",
                churn_risk     AS "churnRisk",
                total_orders   AS "totalOrders",
                total_spending AS "totalSpending",
                last_active    AS "lastActive"
         FROM customers
         WHERE (user_id = $1 OR user_id IS NULL) AND churn_risk IS NOT NULL`,
        [userId]
    );

    console.log(`Found ${rows.length} customers to generate insights for user ${userId}`);

    const results = [];
    const batchSize = 2;

    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const settled = await Promise.allSettled(
            batch.map(r => generateInsightForCustomer(userId, r))
        );
        settled.forEach((r, idx) => {
            if (r.status === 'fulfilled' && r.value) {
                results.push(r.value);
            }
        });

        if (i + batchSize < rows.length) {
            await new Promise(res => setTimeout(res, 3000));
        }
    }

    if (rows.length && results.length === 0) {
        console.error(`All insight generations failed for user ${userId} (${rows.length} customers attempted) — keeping existing insights, not wiping.`);
        return 0;
    }

    console.log(`Saving ${results.length} insights to MongoDB for user ${userId}`);
    await Insight.deleteMany({ userId });
    if (results.length) await Insight.insertMany(results);

    return results.length;
};

const listInsights = async (userId, { type, priority } = {}) => {
    const filter = { userId, dismissed: false };
    if (type)     filter.type     = type;
    if (priority) filter.priority = priority;
    return Insight.find(filter).sort({ priority: -1, createdAt: -1 }).lean();
};

const getInsightsByCustomer = async (userId, customerId) => {
    return Insight.find({ userId, customerId, dismissed: false }).lean();
};

const generateInsightForSingleCustomer = async (userId, customer) => {
    const insight = await generateInsightForCustomer(userId, customer);

    if (insight) {
        await Insight.deleteMany({ userId, customerId: customer.id });
        await Insight.create(insight);
    }

    return insight;
};

const dismissInsight = async (userId, id) => {
    return Insight.findOneAndUpdate({ _id: id, userId }, { dismissed: true }, { new: true });
};

module.exports = {
    rebuildInsights,
    listInsights,
    getInsightsByCustomer,
    dismissInsight,
    generateInsightForSingleCustomer,
};