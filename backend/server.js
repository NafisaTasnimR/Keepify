const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db.js');
const { connectPostgres } = require('./config/postgres');
const productRoutes = require('./routes/productRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const orderRoutes = require('./routes/orderRoutes');
const churnRoutes = require('./routes/churnRoutes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const {
    ensureProductsTable,
    ensureProductImagesTable,
} = require('./services/productService');
const { ensureOrdersTable } = require('./services/orderService');

dotenv.config();

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    res.send('Keepify API');
});

app.use('/api/products', productRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/churn', churnRoutes);

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
    try {
        await connectDB();
        await connectPostgres();
        await ensureProductsTable();
        await ensureProductImagesTable();
        await ensureOrdersTable();

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