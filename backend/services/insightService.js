const Insight = require('../models/Insight');
const { pool } = require('../config/postgres');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const generateInsightForCustomer = async (customer) => {
    const { id, name, churnScore, churnRisk,
            totalOrders, totalSpending, lastActive } = customer;

    console.log(`  Calling Groq for ${name}...`);

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
        const response = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model:       'llama-3.1-8b-instant',
                messages:    [{ role: 'user', content: prompt }],
                temperature: 0.4,
                max_tokens:  300,
            }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err?.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        raw = data.choices?.[0]?.message?.content?.trim();
        console.log(`  Groq response for ${name}:`, raw?.substring(0, 80));
    } catch (err) {
        console.error(`  Groq API call failed for ${name}:`, err.message);
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

    // ── High-value borderline customer override ───────────────
    // Catches customers who are medium risk but too valuable
    // to treat casually — escalate before they tip into high risk
    const isHighValue  = Number(totalSpending) > 8000;
    const isBorderline = churnScore >= 0.28 && churnScore < 0.40;

    if (isHighValue && isBorderline) {
        parsed.action   = `${parsed.action} — prioritise urgently, this is a high-value customer approaching high risk`;
        parsed.priority = 'high';
    }

    return {
        type:        parsed.type        || 'follow_up',
        title:       parsed.title       || `Insight for ${name}`,
        description: parsed.description || '',
        action:      parsed.action      || '',
        priority:    parsed.priority    || churnRisk || 'medium',
        customerId:  id,
    };
};

const rebuildInsights = async () => {
    const { rows } = await pool.query(
        `SELECT id, name,
                churn_score    AS "churnScore",
                churn_risk     AS "churnRisk",
                total_orders   AS "totalOrders",
                total_spending AS "totalSpending",
                last_active    AS "lastActive"
         FROM customers
         WHERE churn_risk IS NOT NULL`
    );

    console.log(`Found ${rows.length} customers to generate insights for`);
    rows.forEach(r => console.log(`  - ${r.name}, risk: ${r.churnRisk}`));

    const results = [];
    const batchSize = 2;

    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const settled = await Promise.allSettled(
            batch.map(r => generateInsightForCustomer(r))
        );
        settled.forEach((r, idx) => {
            if (r.status === 'fulfilled' && r.value) {
                console.log(`✓ ${batch[idx].name}`);
                results.push(r.value);
            } else if (r.status === 'rejected') {
                console.error(`✗ ${batch[idx].name}:`, r.reason?.message);
            } else {
                console.error(`✗ ${batch[idx].name}: returned null`);
            }
        });

        if (i + batchSize < rows.length) {
            await new Promise(res => setTimeout(res, 3000));
        }
    }

    console.log(`Saving ${results.length} insights to MongoDB`);
    await Insight.deleteMany({});
    if (results.length) await Insight.insertMany(results);

    return results.length;
};

const listInsights = async ({ type, priority } = {}) => {
    const filter = { dismissed: false };
    if (type)     filter.type     = type;
    if (priority) filter.priority = priority;
    return Insight.find(filter).sort({ priority: -1, createdAt: -1 }).lean();
};

const getInsightsByCustomer = async (customerId) => {
    return Insight.find({ customerId, dismissed: false }).lean();
};

const dismissInsight = async (id) => {
    return Insight.findByIdAndUpdate(id, { dismissed: true }, { new: true });
};

module.exports = {
    rebuildInsights,
    listInsights,
    getInsightsByCustomer,
    dismissInsight,
};