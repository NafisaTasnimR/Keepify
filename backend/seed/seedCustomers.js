/**
 * seed/seedCustomers.js
 * Run with: node seed/seedCustomers.js
 *
 * Inserts sample customers with realistic stats so churn scoring
 * produces a proper mix of low / medium / high risk results.
 * Safe to re-run — clears existing customers first.
 */

require('dotenv').config();
const { connectPostgres } = require('../config/postgres');
const { ensureCustomersTable } = require('../services/customerService');

const { pool } = require('../config/postgres');

const now = new Date();
const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

// Mix of customers designed to produce all 3 risk levels after ML scoring:
// Low risk  → recent activity, high orders, high spending
// Medium    → moderate activity
// High risk → inactive 45+ days, low orders, low spending
const SAMPLE_CUSTOMERS = [
    // ── Low risk ──────────────────────────────────────────────
    {
        name: 'Nadia Rahman',
        email: 'nadia.rahman@example.com',
        phone: '01711-000001',
        total_orders: 24,
        total_spending: 18400.00,
        last_active: daysAgo(3),
    },
    {
        name: 'Karim Hossain',
        email: 'karim.hossain@example.com',
        phone: '01711-000002',
        total_orders: 18,
        total_spending: 12750.50,
        last_active: daysAgo(7),
    },
    {
        name: 'Fatema Begum',
        email: 'fatema.begum@example.com',
        phone: '01711-000003',
        total_orders: 31,
        total_spending: 24200.00,
        last_active: daysAgo(2),
    },
    {
        name: 'Arif Chowdhury',
        email: 'arif.chowdhury@example.com',
        phone: '01711-000004',
        total_orders: 15,
        total_spending: 9800.00,
        last_active: daysAgo(10),
    },

    // ── Medium risk ────────────────────────────────────────────
    {
        name: 'Mitu Akter',
        email: 'mitu.akter@example.com',
        phone: '01711-000005',
        total_orders: 7,
        total_spending: 3200.00,
        last_active: daysAgo(22),
    },
    {
        name: 'Tanvir Hasan',
        email: 'tanvir.hasan@example.com',
        phone: '01711-000006',
        total_orders: 5,
        total_spending: 2100.00,
        last_active: daysAgo(25),
    },
    {
        name: 'Ruma Khatun',
        email: 'ruma.khatun@example.com',
        phone: '01711-000007',
        total_orders: 9,
        total_spending: 4500.00,
        last_active: daysAgo(18),
    },
    {
        name: 'Shohel Rana',
        email: 'shohel.rana@example.com',
        phone: '01711-000008',
        total_orders: 6,
        total_spending: 2800.00,
        last_active: daysAgo(30),
    },

    // ── High risk ──────────────────────────────────────────────
    {
        name: 'Sarah Islam',
        email: 'sarah.islam@example.com',
        phone: '01711-000009',
        total_orders: 2,
        total_spending: 650.00,
        last_active: daysAgo(48),
    },
    {
        name: 'Rafiq Uddin',
        email: 'rafiq.uddin@example.com',
        phone: '01711-000010',
        total_orders: 1,
        total_spending: 300.00,
        last_active: daysAgo(41),
    },
    {
        name: 'Jahanara Noor',
        email: 'jahanara.noor@example.com',
        phone: '01711-000011',
        total_orders: 3,
        total_spending: 980.00,
        last_active: daysAgo(55),
    },
    {
        name: 'Babul Mia',
        email: 'babul.mia@example.com',
        phone: '01711-000012',
        total_orders: 1,
        total_spending: 150.00,
        last_active: daysAgo(70),
    },
    {
        name: 'Nasrin Sultana',
        email: 'nasrin.sultana@example.com',
        phone: '01711-000013',
        total_orders: 2,
        total_spending: 420.00,
        last_active: daysAgo(60),
    },

    // ── Never purchased (worst case) ───────────────────────────
    {
        name: 'Imran Khan',
        email: 'imran.khan@example.com',
        phone: '01711-000014',
        total_orders: 0,
        total_spending: 0,
        last_active: null,
    },
    {
        name: 'Poly Begum',
        email: 'poly.begum@example.com',
        phone: '01711-000015',
        total_orders: 0,
        total_spending: 0,
        last_active: null,
    },
];

const seed = async () => {
    await connectPostgres();
    await ensureCustomersTable();

    console.log('Clearing existing customers…');
    await pool.query('DELETE FROM customers');

    console.log(`Inserting ${SAMPLE_CUSTOMERS.length} sample customers…`);

    for (const c of SAMPLE_CUSTOMERS) {
        await pool.query(
            `INSERT INTO customers
                (name, email, phone, total_orders, total_spending, last_active)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [c.name, c.email, c.phone, c.total_orders, c.total_spending, c.last_active]
        );
        console.log(`  ✓ ${c.name}`);
    }

    console.log('\nDone. Now run:');
    console.log('  POST /api/customers/score-all');
    console.log('to score all customers and generate AI insights.\n');

    await pool.end();
    process.exit(0);
};

seed().catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
});