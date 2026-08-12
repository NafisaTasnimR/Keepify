const AnalyticsSnapshot = require('../models/AnalyticsSnapshot');
const { pool } = require('../config/postgres');

const DEFAULT_CACHE_TTL_SECONDS = Number(
    process.env.ANALYTICS_CACHE_TTL_SECONDS || 900
);

const buildCacheKey = (userId, prefix, options) => {
    const { startDate, endDate, interval, limit } = options;
    const keyParts = [
        `user:${userId || 'all'}`,
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

const clearAnalyticsCache = async (userId = null) => {
    if (userId) {
        await AnalyticsSnapshot.deleteMany({ key: new RegExp(`^user:${userId}:`) });
    } else {
        await AnalyticsSnapshot.deleteMany({});
    }
};

const fetchTrends = async (userId, { startDate, endDate, interval }) => {
    const safeUserId = userId || '';
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
         WHERE (user_id = $1 OR user_id IS NULL) AND order_date >= $2::date AND order_date <= $3::date
         GROUP BY bucket
         ORDER BY bucket ASC`,
        [safeUserId, startDate.toISOString().slice(0, 10), endDate.toISOString().slice(0, 10)]
    );

    return result.rows.map((item) => ({
        date: new Date(item.bucket).toISOString(),
        revenue: Number(item.revenue || 0),
        orders: Number(item.orders || 0),
    }));
};

const fetchPeaks = async (userId, { startDate, endDate, interval, limit }) => {
    const safeUserId = userId || '';
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
         WHERE (user_id = $1 OR user_id IS NULL) AND order_date >= $2::date AND order_date <= $3::date
         GROUP BY bucket
         ORDER BY revenue DESC
         LIMIT $4`,
        [safeUserId, startDate.toISOString().slice(0, 10), endDate.toISOString().slice(0, 10), limit]
    );

    return result.rows.map((item) => ({
        date: new Date(item.bucket).toISOString(),
        revenue: Number(item.revenue || 0),
        orders: Number(item.orders || 0),
    }));
};

const fetchKpis = async (userId, { startDate, endDate }) => {
    const safeUserId = userId || '';
    const { rows } = await pool.query(
        `SELECT
            COALESCE(SUM(amount), 0) AS total_revenue,
            COUNT(*)::int AS total_orders,
            COALESCE(AVG(amount), 0) AS avg_order_value
         FROM order_analytics
         WHERE (user_id = $1 OR user_id IS NULL) AND order_date >= $2::date AND order_date <= $3::date`,
        [safeUserId, startDate.toISOString().slice(0, 10), endDate.toISOString().slice(0, 10)]
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

const fetchCategoryBreakdown = async (userId, { startDate, endDate }) => {
    const safeUserId = userId || '';
    const { rows } = await pool.query(
        `SELECT
            COALESCE(category, 'Uncategorized') AS category,
            COALESCE(SUM(amount), 0) AS revenue,
            COUNT(*)::int AS orders
         FROM order_analytics
         WHERE (user_id = $1 OR user_id IS NULL) AND order_date >= $2::date AND order_date <= $3::date
         GROUP BY COALESCE(category, 'Uncategorized')
         ORDER BY revenue DESC`,
        [safeUserId, startDate.toISOString().slice(0, 10), endDate.toISOString().slice(0, 10)]
    );

    const totalRevenue = rows.reduce((sum, item) => sum + Number(item.revenue || 0), 0);

    return rows.map((item) => ({
        category: item.category,
        revenue: Number(item.revenue || 0),
        orders: Number(item.orders || 0),
        percentage: totalRevenue > 0 ? Number(((Number(item.revenue || 0) / totalRevenue) * 100).toFixed(1)) : 0,
    }));
};

const getTrends = async (userId, options) => {
    const cacheKey = buildCacheKey(userId, 'trends', options);
    const cached = await getCachedSnapshot(cacheKey);
    if (cached) {
        return cached;
    }

    const payload = await fetchTrends(userId, options);
    await setCachedSnapshot(cacheKey, payload);
    return payload;
};

const getPeaks = async (userId, options) => {
    const cacheKey = buildCacheKey(userId, 'peaks', options);
    const cached = await getCachedSnapshot(cacheKey);
    if (cached) {
        return cached;
    }

    const payload = await fetchPeaks(userId, options);
    await setCachedSnapshot(cacheKey, payload);
    return payload;
};

const getKpis = async (userId, options) => {
    const cacheKey = buildCacheKey(userId, 'kpis', options);
    const cached = await getCachedSnapshot(cacheKey);
    if (cached) {
        return cached;
    }

    const payload = await fetchKpis(userId, options);
    await setCachedSnapshot(cacheKey, payload);
    return payload;
};

const getCategoryBreakdown = async (userId, options) => {
    const cacheKey = buildCacheKey(userId, 'category-breakdown', options);
    const cached = await getCachedSnapshot(cacheKey);
    if (cached) {
        return cached;
    }

    const payload = await fetchCategoryBreakdown(userId, options);
    await setCachedSnapshot(cacheKey, payload);
    return payload;
};

module.exports = {
    getTrends,
    getPeaks,
    getKpis,
    getCategoryBreakdown,
    clearAnalyticsCache,
};
