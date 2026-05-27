const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db.js');
const { connectPostgres } = require('./config/postgres');
const productRoutes = require('./routes/productRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const {
    ensureProductsTable,
    ensureProductImagesTable,
} = require('./services/productService');

dotenv.config();

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    res.send('Keepify API');
});

app.use('/api/products', productRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
    try {
        await connectDB();
        await connectPostgres();
        await ensureProductsTable();
        await ensureProductImagesTable();

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