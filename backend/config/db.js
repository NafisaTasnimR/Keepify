const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
    if (!process.env.MONGO_URL) {
        console.warn('MONGO_URL not set. Skipping MongoDB connection.');
        return;
    }

    try {
        const conn = await mongoose.connect(process.env.MONGO_URL);
        console.log('MongoDB Connected!');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        // don't exit the process to keep the API available during local dev
    }
}


module.exports = connectDB;