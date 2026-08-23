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

// Every bucket in [startDate, endDate] at the given interval, so a sparse
// result set (days/weeks/months with no orders) still produces a contiguous
// series instead of skipping straight to the next date that has data.
const buildBucketKeys = (startDate, endDate, interval) => {
    const keys = [];
    const cursor = new Date(startDate);
    cursor.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(0, 0, 0, 0);

    if (interval === 'week') {
        const day = cursor.getUTCDay();
        const diffToMonday = day === 0 ? 6 : day - 1;
        cursor.setUTCDate(cursor.getUTCDate() - diffToMonday);
    } else if (interval === 'month') {
        cursor.setUTCDate(1);
    }

    while (cursor <= end) {
        keys.push(cursor.toISOString().slice(0, 10));
        if (interval === 'week') {
            cursor.setUTCDate(cursor.getUTCDate() + 7);
        } else if (interval === 'month') {
            cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        } else {
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
    }

    return keys;
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
            TO_CHAR(${bucketExpression}, 'YYYY-MM-DD') AS bucket_key,
            COALESCE(SUM(amount), 0) AS revenue,
            COUNT(*)::int AS orders
         FROM order_analytics
         WHERE user_id = $1 AND order_date >= $2::date AND order_date <= $3::date AND status = 'completed'
         GROUP BY bucket_key
         ORDER BY bucket_key ASC`,
        [safeUserId, startDate.toISOString().slice(0, 10), endDate.toISOString().slice(0, 10)]
    );

    // bucket_key comes back as a plain 'YYYY-MM-DD' string (via TO_CHAR) so it
    // can be matched against buildBucketKeys() directly — going through a JS
    // Date here would have pg's driver reinterpret the timestamp-without-tz
    // value as local server time, shifting it onto the wrong calendar day.
    const byDateKey = new Map(
        result.rows.map((item) => [
            item.bucket_key,
            { revenue: Number(item.revenue || 0), orders: Number(item.orders || 0) },
        ])
    );

    return buildBucketKeys(startDate, endDate, interval).map((dateKey) => {
        const bucket = byDateKey.get(dateKey);
        return {
            date: `${dateKey}T00:00:00.000Z`,
            revenue: bucket?.revenue ?? 0,
            orders: bucket?.orders ?? 0,
        };
    });
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
         WHERE user_id = $1 AND order_date >= $2::date AND order_date <= $3::date AND status = 'completed'
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
         WHERE user_id = $1 AND order_date >= $2::date AND order_date <= $3::date AND status = 'completed'`,
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
         WHERE user_id = $1 AND order_date >= $2::date AND order_date <= $3::date AND status = 'completed'
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
