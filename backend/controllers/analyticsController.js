const {
    getTrends,
    getPeaks,
    getKpis,
} = require('../services/analyticsService');

const parseDate = (value, fallback) => {
    if (!value) {
        return fallback;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
};

const normalizeInterval = (value) => {
    const allowed = new Set(['day', 'week', 'month']);
    return allowed.has(value) ? value : 'day';
};

const buildRange = (query) => {
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const startDate = parseDate(query.start, defaultStart);
    const endDate = parseDate(query.end, now);

    if (!startDate || !endDate) {
        return null;
    }

    if (startDate > endDate) {
        return null;
    }

    return {
        startDate,
        endDate,
        interval: normalizeInterval(query.interval),
    };
};

const buildResponseMeta = (options) => ({
    range: {
        start: options.startDate.toISOString(),
        end: options.endDate.toISOString(),
    },
    interval: options.interval,
});

const getTrendsHandler = async (req, res, next) => {
    try {
        const options = buildRange(req.query);
        if (!options) {
            res.status(400);
            throw new Error('Invalid date range');
        }

        const data = await getTrends(options);
        res.json({
            ...buildResponseMeta(options),
            data,
        });
    } catch (error) {
        next(error);
    }
};

const getPeaksHandler = async (req, res, next) => {
    try {
        const options = buildRange(req.query);
        if (!options) {
            res.status(400);
            throw new Error('Invalid date range');
        }

        const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 30);

        const data = await getPeaks({
            ...options,
            limit,
        });

        res.json({
            ...buildResponseMeta(options),
            limit,
            data,
        });
    } catch (error) {
        next(error);
    }
};

const getKpisHandler = async (req, res, next) => {
    try {
        const options = buildRange(req.query);
        if (!options) {
            res.status(400);
            throw new Error('Invalid date range');
        }

        const data = await getKpis(options);
        res.json({
            ...buildResponseMeta(options),
            data,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getTrendsHandler,
    getPeaksHandler,
    getKpisHandler,
};
