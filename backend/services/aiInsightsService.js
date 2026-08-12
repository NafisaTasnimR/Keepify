const AnalyticsSnapshot = require('../models/AnalyticsSnapshot');
const { pool } = require('../config/postgres');
const { getKpis, getTrends, getCategoryBreakdown } = require('./analyticsService');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const CACHE_TTL_SECONDS = 60 * 60; // 1 hour

// ─── Fetch raw data for specific user ─────────────────────────
const fetchAnalyticsData = async (userId) => {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [kpis, trends, categories] = await Promise.all([
        getKpis(userId, { startDate, endDate }),
        getTrends(userId, { startDate, endDate, interval: 'week' }),
        getCategoryBreakdown(userId, { startDate, endDate }),
    ]);

    // Customer stats from postgres for this user
    const { rows: customerRows } = await pool.query(`
        SELECT
            COUNT(*)                                            AS total,
            COUNT(*) FILTER (WHERE churn_risk = 'high')        AS high_risk,
            COUNT(*) FILTER (WHERE churn_risk = 'medium')      AS medium_risk,
            COUNT(*) FILTER (WHERE churn_risk = 'low')         AS low_risk,
            COALESCE(SUM(total_spending), 0)                   AS total_spending,
            COALESCE(SUM(total_orders), 0)                     AS total_orders,
            COALESCE(AVG(total_spending), 0)                   AS avg_spending,
            COUNT(*) FILTER (WHERE last_active < NOW() - INTERVAL '30 days') AS inactive_30
        FROM customers
        WHERE user_id = $1
    `, [userId]);

    const customerStats = customerRows[0] || {
        total: 0, high_risk: 0, medium_risk: 0, low_risk: 0,
        total_spending: 0, total_orders: 0, avg_spending: 0, inactive_30: 0
    };

    return { kpis, trends, categories, customerStats };
};

// ─── Call Groq for one section ────────────────────────────────
const generateSection = async (sectionName, dataContext, instruction) => {
    const prompt = `You are a business analyst for a small e-commerce business called Keepify.

${dataContext}

${instruction}

Respond ONLY with a JSON array of exactly 3 insight objects, no markdown:
[
  {"insight": "one clear business observation using specific numbers from the data", "severity": "positive|warning|neutral"},
  {"insight": "...", "severity": "..."},
  {"insight": "...", "severity": "..."}
]
severity must be: "positive" for good news, "warning" for problems/risks, "neutral" for general observations.
Always use specific numbers from the data. Never be vague.`;

    const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model:       'llama-3.1-8b-instant',
            messages:    [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens:  500,
        }),
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`Groq error for ${sectionName}: ${err?.error?.message}`);
    }

    const data  = await response.json();
    const raw   = data.choices?.[0]?.message?.content?.trim();
    const clean = raw.replace(/```json|```/g, '').trim();

    try {
        return JSON.parse(clean);
    } catch {
        console.error(`Failed to parse ${sectionName} response:`, raw);
        return [];
    }
};

// ─── Build all 4 sections for user ─────────────────────────────
const buildAllInsights = async (userId) => {
    console.log(`Fetching analytics data for user ${userId}...`);
    const { kpis, trends, categories, customerStats } = await fetchAnalyticsData(userId);

    // Compute trend direction
    const trendRevenues = (trends || []).map(t => t.revenue);
    const firstHalf  = trendRevenues.slice(0, Math.floor(trendRevenues.length / 2));
    const secondHalf = trendRevenues.slice(Math.floor(trendRevenues.length / 2));
    const firstAvg   = firstHalf.reduce((a, b) => a + b, 0) / (firstHalf.length || 1);
    const secondAvg  = secondHalf.reduce((a, b) => a + b, 0) / (secondHalf.length || 1);
    const trendPct   = firstAvg > 0 ? (((secondAvg - firstAvg) / firstAvg) * 100).toFixed(1) : 0;

    // Best day
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dayTotals = {};
    (trends || []).forEach(t => {
        const day = dayNames[new Date(t.date).getDay()];
        dayTotals[day] = (dayTotals[day] || 0) + t.revenue;
    });
    const bestDay = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    console.log(`Calling Groq for 4 sections (user ${userId})...`);

    const [salesInsights, productInsights, customerInsights, categoryInsights] = await Promise.all([
        generateSection('sales',
            `Sales data for the last 30 days:
- Total revenue: ৳${Number(kpis?.totalRevenue || 0).toLocaleString()}
- Total orders: ${kpis?.totalOrders || 0}
- Average order value: ৳${Number(kpis?.avgOrderValue || 0).toFixed(2)}
- Revenue trend (first half vs second half of period): ${trendPct > 0 ? '+' : ''}${trendPct}%
- Best performing day: ${bestDay}
- Weekly revenue data: ${(trends || []).map(t => `৳${t.revenue} (${new Date(t.date).toLocaleDateString('en-GB', { day:'numeric', month:'short' })})`).join(', ')}`,
            'Generate 3 sales performance insights. Focus on revenue trends, order patterns, and actionable timing suggestions.'
        ),

        generateSection('products',
            `Product and sales data:
- Total orders in last 30 days: ${kpis?.totalOrders || 0}
- Total revenue: ৳${Number(kpis?.totalRevenue || 0).toLocaleString()}
- Average order value: ৳${Number(kpis?.avgOrderValue || 0).toFixed(2)}
- Peak revenue days: ${Object.entries(dayTotals).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([d,r])=>`${d} (৳${r.toFixed(0)})`).join(', ')}`,
            'Generate 3 product performance insights. Focus on order value optimization, restock suggestions, and product mix recommendations.'
        ),

        generateSection('customers',
            `Customer health data:
- Total customers: ${customerStats.total}
- High churn risk: ${customerStats.high_risk} customers
- Medium churn risk: ${customerStats.medium_risk} customers
- Low churn risk: ${customerStats.low_risk} customers
- Customers inactive 30+ days: ${customerStats.inactive_30}
- Total customer spending: ৳${Number(customerStats.total_spending).toLocaleString()}
- Average customer spending: ৳${Number(customerStats.avg_spending).toFixed(2)}
- Total orders across all customers: ${customerStats.total_orders}`,
            'Generate 3 customer health insights. Focus on churn risk, retention opportunities, and customer value.'
        ),

        generateSection('categories',
            `Category breakdown for last 30 days:
${(categories || []).slice(0, 6).map(c => `- ${c.category}: ৳${c.revenue.toLocaleString()} revenue, ${c.orders} orders, ${c.percentage}% of total`).join('\n')}
- Total categories: ${(categories || []).length}`,
            'Generate 3 category performance insights. Focus on top performers, underperformers, and diversification opportunities.'
        ),
    ]);

    return {
        generatedAt: new Date().toISOString(),
        sections: [
            {
                id:       'sales',
                title:    'Sales Performance',
                insights: salesInsights,
            },
            {
                id:       'products',
                title:    'Product Performance',
                insights: productInsights,
            },
            {
                id:       'customers',
                title:    'Customer Health',
                insights: customerInsights,
            },
            {
                id:       'categories',
                title:    'Category Breakdown',
                insights: categoryInsights,
            },
        ],
    };
};

// ─── Public functions ─────────────────────────────────────────
const getAIInsights = async (userId, forceRefresh = false) => {
    const cacheKey = `ai-insights:${userId}`;

    if (!forceRefresh) {
        const cached = await AnalyticsSnapshot.findOne({
            key:       cacheKey,
            expiresAt: { $gt: new Date() },
        }).lean();

        if (cached) {
            console.log(`Returning cached AI insights for user ${userId}`);
            return { ...cached.payload, fromCache: true };
        }
    }

    console.log(`Generating fresh AI insights for user ${userId}...`);
    const payload   = await buildAllInsights(userId);
    const expiresAt = new Date(Date.now() + CACHE_TTL_SECONDS * 1000);

    await AnalyticsSnapshot.updateOne(
        { key: cacheKey },
        { $set: { key: cacheKey, payload, expiresAt } },
        { upsert: true }
    );

    return { ...payload, fromCache: false };
};

module.exports = { getAIInsights };