const AnalyticsSnapshot = require('../models/AnalyticsSnapshot');
const { pool } = require('../config/postgres');

const DEFAULT_CACHE_TTL_SECONDS = Number(
    process.env.ANALYTICS_CACHE_TTL_SECONDS || 900
);

const ANALYTICS_SOURCE_SQL = `
    SELECT
        order_date,
        amount,
        quantity,
        category,
        status
    FROM order_analytics
`;

const buildCacheKey = (prefix, options) => {
    const { startDate, endDate, interval, limit } = options;
    const keyParts = [
        prefix,
        interval,
        startDate.toISOString(),
        endDate.toISOString(),
    ];

    if (limit !== undefined) {
        keyParts.push(String(limit));
    }

    return keyParts.join(':');
};

const getCachedSnapshot = async (key) => {
    const snapshot = await AnalyticsSnapshot.findOne({
        key,
        expiresAt: { $gt: new Date() },
    }).lean();

    return snapshot ? snapshot.payload : null;
};

const setCachedSnapshot = async (key, payload, ttlSeconds = DEFAULT_CACHE_TTL_SECONDS) => {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await AnalyticsSnapshot.updateOne(
        { key },
        { $set: { key, payload, expiresAt } },
        { upsert: true }
    );
};

const clearAnalyticsCache = async () => {
    await AnalyticsSnapshot.deleteMany({});
};

const buildMatchStage = (startDate, endDate) => ({
    order_date: {
        $gte: startDate,
        $lte: endDate,
    },
});

const fetchTrends = async ({ startDate, endDate, interval }) => {
    const bucketExpression =
        interval === 'week'
            ? `DATE_TRUNC('week', order_date::timestamp)`
            : interval === 'month'
                ? `DATE_TRUNC('month', order_date::timestamp)`
                : `DATE_TRUNC('day', order_date::timestamp)`;

    const result = await pool.query(
        `SELECT
            ${bucketExpression} AS bucket,
            COALESCE(SUM(amount), 0) AS revenue,
            COUNT(*)::int AS orders
         FROM order_analytics
         WHERE order_date >= $1::date AND order_date <= $2::date
         GROUP BY bucket
         ORDER BY bucket ASC`,
        [startDate.toISOString().slice(0, 10), endDate.toISOString().slice(0, 10)]
    );

    return result.rows.map((item) => ({
        date: new Date(item.bucket).toISOString(),
        revenue: Number(item.revenue || 0),
        orders: Number(item.orders || 0),
    }));
};

const fetchPeaks = async ({ startDate, endDate, interval, limit }) => {
    const bucketExpression =
        interval === 'week'
            ? `DATE_TRUNC('week', order_date::timestamp)`
            : interval === 'month'
                ? `DATE_TRUNC('month', order_date::timestamp)`
                : `DATE_TRUNC('day', order_date::timestamp)`;

    const result = await pool.query(
        `SELECT
            ${bucketExpression} AS bucket,
            COALESCE(SUM(amount), 0) AS revenue,
            COUNT(*)::int AS orders
         FROM order_analytics
         WHERE order_date >= $1::date AND order_date <= $2::date
         GROUP BY bucket
         ORDER BY revenue DESC
         LIMIT $3`,
        [startDate.toISOString().slice(0, 10), endDate.toISOString().slice(0, 10), limit]
    );

    return result.rows.map((item) => ({
        date: new Date(item.bucket).toISOString(),
        revenue: Number(item.revenue || 0),
        orders: Number(item.orders || 0),
    }));
};

const fetchKpis = async ({ startDate, endDate }) => {
    const { rows } = await pool.query(
        `SELECT
            COALESCE(SUM(amount), 0) AS total_revenue,
            COUNT(*)::int AS total_orders,
            COALESCE(AVG(amount), 0) AS avg_order_value
         FROM order_analytics
         WHERE order_date >= $1::date AND order_date <= $2::date`,
        [startDate.toISOString().slice(0, 10), endDate.toISOString().slice(0, 10)]
    );

    const result = rows[0];

    if (!result) {
        return {
            totalRevenue: 0,
            totalOrders: 0,
            avgOrderValue: 0,
        };
    }

    return {
        totalRevenue: Number(result.total_revenue || 0),
        totalOrders: Number(result.total_orders || 0),
        avgOrderValue: Number(result.avg_order_value || 0),
    };
};

const fetchCategoryBreakdown = async ({ startDate, endDate }) => {
    const { rows } = await pool.query(
        `SELECT
            COALESCE(category, 'Uncategorized') AS category,
            COALESCE(SUM(amount), 0) AS revenue,
            COUNT(*)::int AS orders
         FROM order_analytics
         WHERE order_date >= $1::date AND order_date <= $2::date
         GROUP BY COALESCE(category, 'Uncategorized')
         ORDER BY revenue DESC`,
        [startDate.toISOString().slice(0, 10), endDate.toISOString().slice(0, 10)]
    );

    const totalRevenue = rows.reduce((sum, item) => sum + Number(item.revenue || 0), 0);

    return rows.map((item) => ({
        category: item.category,
        revenue: Number(item.revenue || 0),
        orders: Number(item.orders || 0),
        percentage: totalRevenue > 0 ? Number(((Number(item.revenue || 0) / totalRevenue) * 100).toFixed(1)) : 0,
    }));
};

const getTrends = async (options) => {
    const cacheKey = buildCacheKey('trends', options);
    const cached = await getCachedSnapshot(cacheKey);
    if (cached) {
        return cached;
    }

    const payload = await fetchTrends(options);
    await setCachedSnapshot(cacheKey, payload);
    return payload;
};

const getPeaks = async (options) => {
    const cacheKey = buildCacheKey('peaks', options);
    const cached = await getCachedSnapshot(cacheKey);
    if (cached) {
        return cached;
    }

    const payload = await fetchPeaks(options);
    await setCachedSnapshot(cacheKey, payload);
    return payload;
};

const getKpis = async (options) => {
    const cacheKey = buildCacheKey('kpis', options);
    const cached = await getCachedSnapshot(cacheKey);
    if (cached) {
        return cached;
    }

    const payload = await fetchKpis(options);
    await setCachedSnapshot(cacheKey, payload);
    return payload;
};

const getCategoryBreakdown = async (options) => {
    const cacheKey = buildCacheKey('category-breakdown', options);
    const cached = await getCachedSnapshot(cacheKey);
    if (cached) {
        return cached;
    }

    const payload = await fetchCategoryBreakdown(options);
    await setCachedSnapshot(cacheKey, payload);
    return payload;
};

module.exports = {
    getTrends,
    getPeaks,
    getKpis,
    getCategoryBreakdown,
};
