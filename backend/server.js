const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db.js');
const { connectPostgres } = require('./config/postgres');
const productRoutes = require('./routes/productRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const customerRoutes = require('./routes/customerRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const insightRoutes = require('./routes/insightRoutes');
const orderRoutes = require('./routes/orderRoutes');
const outreachRoutes = require('./routes/outreachRoutes');
const aiInsightsRoutes = require('./routes/aiInsightsRoutes');
const authRoutes = require('./routes/authRoutes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const {
    ensureProductsTable,
    ensureProductImagesTable,
} = require('./services/productService');
const { ensureCustomersTable } = require('./services/customerService');
const { ensureUserSettingsTable } = require('./services/settingsService');
const { ensureOrdersTable, ensureOrderAnalyticsTable } = require('./services/orderService');
const { initializeFirebase } = require('./config/firebase');
const { verifyToken } = require('./middlewares/authMiddleware');

dotenv.config();

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
const cors = require('cors');

// Allow requests from the frontend (Vite dev server) and handle preflight
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));

app.get('/', (req, res) => {
    res.send('Keepify API');
});

app.use('/api/auth', authRoutes);

app.use(verifyToken);

app.use('/api/products', productRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/ai-insights', aiInsightsRoutes);

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
    try {
        await initializeFirebase();
        await connectDB();
        await connectPostgres();
        await ensureProductsTable();
        await ensureProductImagesTable();
        await ensureCustomersTable();
        await ensureUserSettingsTable();
        await ensureOrdersTable();
        await ensureOrderAnalyticsTable();

        const port = process.env.PORT || 5000;
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();