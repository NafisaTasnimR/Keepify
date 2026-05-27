const AnalyticsSnapshot = require('../models/AnalyticsSnapshot');
const Sale = require('../models/Sale');
const { pool } = require('../config/postgres');

const DEFAULT_CACHE_TTL_SECONDS = Number(
    process.env.ANALYTICS_CACHE_TTL_SECONDS || 900
);

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

const buildMatchStage = (startDate, endDate) => ({
    createdAt: {
        $gte: startDate,
        $lte: endDate,
    },
});

const fetchTrends = async ({ startDate, endDate, interval }) => {
    const pipeline = [
        { $match: buildMatchStage(startDate, endDate) },
        {
            $group: {
                _id: {
                    $dateTrunc: {
                        date: '$createdAt',
                        unit: interval,
                    },
                },
                revenue: { $sum: '$amount' },
                orders: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ];

    const results = await Sale.aggregate(pipeline);
    return results.map((item) => ({
        date: item._id.toISOString(),
        revenue: Number(item.revenue || 0),
        orders: Number(item.orders || 0),
    }));
};

const fetchPeaks = async ({ startDate, endDate, interval, limit }) => {
    const pipeline = [
        { $match: buildMatchStage(startDate, endDate) },
        {
            $group: {
                _id: {
                    $dateTrunc: {
                        date: '$createdAt',
                        unit: interval,
                    },
                },
                revenue: { $sum: '$amount' },
                orders: { $sum: 1 },
            },
        },
        { $sort: { revenue: -1 } },
        { $limit: limit },
    ];

    const results = await Sale.aggregate(pipeline);
    return results.map((item) => ({
        date: item._id.toISOString(),
        revenue: Number(item.revenue || 0),
        orders: Number(item.orders || 0),
    }));
};

const fetchKpis = async ({ startDate, endDate }) => {
    const pipeline = [
        { $match: buildMatchStage(startDate, endDate) },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: '$amount' },
                totalOrders: { $sum: 1 },
                avgOrderValue: { $avg: '$amount' },
            },
        },
    ];

    const [result] = await Sale.aggregate(pipeline);

    if (!result) {
        return {
            totalRevenue: 0,
            totalOrders: 0,
            avgOrderValue: 0,
        };
    }

    return {
        totalRevenue: Number(result.totalRevenue || 0),
        totalOrders: Number(result.totalOrders || 0),
        avgOrderValue: Number(result.avgOrderValue || 0),
    };
};

const fetchCategoryBreakdown = async ({ startDate, endDate }) => {
    const salesPipeline = [
        { $match: buildMatchStage(startDate, endDate) },
        {
            $group: {
                _id: '$productId',
                revenue: { $sum: '$amount' },
                orders: { $sum: 1 },
            },
        },
        { $sort: { revenue: -1 } },
    ];

    const [salesByProduct, productsResult] = await Promise.all([
        Sale.aggregate(salesPipeline),
        pool.query('SELECT id::text AS id, sku, category FROM products'),
    ]);

    const categoryLookup = new Map();

    productsResult.rows.forEach((product) => {
        const category = product.category || 'Uncategorized';

        if (product.id) {
            categoryLookup.set(String(product.id), category);
        }

        if (product.sku) {
            categoryLookup.set(String(product.sku), category);
        }
    });

    const categoryTotals = new Map();

    salesByProduct.forEach((item) => {
        const categoryKey = categoryLookup.get(String(item._id)) || 'Uncategorized';
        const current = categoryTotals.get(categoryKey) || {
            category: categoryKey,
            revenue: 0,
            orders: 0,
        };

        current.revenue += Number(item.revenue || 0);
        current.orders += Number(item.orders || 0);
        categoryTotals.set(categoryKey, current);
    });

    const totals = Array.from(categoryTotals.values()).sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = totals.reduce((sum, item) => sum + item.revenue, 0);

    return totals.map((item) => ({
        category: item.category,
        revenue: Number(item.revenue || 0),
        orders: Number(item.orders || 0),
        percentage: totalRevenue > 0 ? Number(((item.revenue / totalRevenue) * 100).toFixed(1)) : 0,
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
