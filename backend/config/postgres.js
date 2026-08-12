const { Pool } = require('pg');

const buildPoolConfig = () => {
    if (process.env.POSTGRES_URL) {
        return {
            connectionString: process.env.POSTGRES_URL,
            ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
        };
    }

    return {
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT ? Number(process.env.POSTGRES_PORT) : 5432,
        database: process.env.POSTGRES_DB,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };
};

const pool = new Pool(buildPoolConfig());

const connectPostgres = async () => {
    const hasConfig = process.env.POSTGRES_URL || process.env.POSTGRES_HOST || process.env.POSTGRES_USER;
    if (!hasConfig) {
        console.warn('Postgres connection info not found in environment. Skipping Postgres connection.');
        return;
    }
    const client = await pool.connect();
    try {
        await client.query('SELECT 1');
        console.log('PostgreSQL Connected!');
    } catch (err) {
        console.error('Error connecting to Postgres:', err.message);
    } finally {
        client.release();
    }
};

module.exports = { pool, connectPostgres };
