const { pool } = require('../config/postgres');

const PRODUCT_SELECT_COLUMNS = [
    'p.id',
    'p.user_id',
    'p.name',
    'p.sku',
    'p.price',
    'p.stock',
    'p.category',
    'p.status',
    'p.created_at',
    'p.updated_at',
    'pi.image_url',
    'COALESCE(SUM(o.quantity), 0)::int AS units_sold',
    'COALESCE(SUM(CASE WHEN o.order_date >= CURRENT_DATE - INTERVAL \'30 days\' THEN o.quantity ELSE 0 END), 0)::int AS recent_units',
    'COALESCE(SUM(CASE WHEN o.order_date >= CURRENT_DATE - INTERVAL \'60 days\' AND o.order_date < CURRENT_DATE - INTERVAL \'30 days\' THEN o.quantity ELSE 0 END), 0)::int AS previous_units',
];

const PRODUCT_SELECT_SQL = `
    SELECT ${PRODUCT_SELECT_COLUMNS.join(', ')}
    FROM products p
    LEFT JOIN product_images pi ON pi.product_id = p.id
    LEFT JOIN orders o ON o.product_id = p.id
`;

const PRODUCT_GROUP_BY = `GROUP BY p.id, pi.image_url`;

const mapProduct = (row) => {
    const unitsSold = row.units_sold !== undefined ? Number(row.units_sold) : 0;
    const recentUnits = Number(row.recent_units || 0);
    const previousUnits = Number(row.previous_units || 0);

    let performance = '0%';
    let performanceType = 'neutral';

    if (unitsSold > 0) {
        if (previousUnits > 0) {
            const trend = Math.round(((recentUnits - previousUnits) / previousUnits) * 100);
            if (trend > 0) {
                performance = `+${trend}%`;
                performanceType = 'positive';
            } else if (trend < 0) {
                performance = `${trend}%`;
                performanceType = 'negative';
            } else {
                performance = '0%';
                performanceType = 'neutral';
            }
        } else if (recentUnits > 0) {
            performance = '+100%';
            performanceType = 'positive';
        } else {
            performance = 'Active';
            performanceType = 'positive';
        }
    }

    return {
        id: row.id,
        userId: row.user_id || null,
        name: row.name,
        sku: row.sku || null,
        price: row.price !== null ? Number(row.price) : null,
        stock: row.stock !== null ? Number(row.stock) : null,
        category: row.category || null,
        status: row.status || 'active',
        imageUrl: row.image_url || null,
        unitsSold,
        performance,
        performanceType,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
};

const ensureProductsTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                user_id TEXT,
                name TEXT NOT NULL,
                sku TEXT,
                price NUMERIC(10, 2) NOT NULL DEFAULT 0,
                stock INTEGER NOT NULL DEFAULT 0,
                category TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id TEXT;`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);`);
    } catch (err) {
        console.error('Error in ensureProductsTable:', err.message);
    }
};

const ensureProductImagesTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS product_images (
                product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
                image_url TEXT NOT NULL
            );
        `);
    } catch (err) {
        console.error('Error in ensureProductImagesTable:', err.message);
    }
};

const listProducts = async (userId, { search, limit, offset, sortBy, sortDir }) => {
    const safeUserId = userId || '';
    const whereValues = [safeUserId];
    const whereClauses = ['(p.user_id = $1 OR p.user_id IS NULL)'];

    if (search) {
        whereValues.push(`%${search}%`);
        whereClauses.push(
            `(p.name ILIKE $${whereValues.length} OR p.sku ILIKE $${whereValues.length})`
        );
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
    const allowedSort = new Set(['name', 'price', 'stock', 'created_at', 'updated_at', 'units_sold']);
    const safeSortBy = allowedSort.has(sortBy) ? sortBy : 'created_at';
    const safeSortDir = sortDir === 'asc' ? 'ASC' : 'DESC';
    const orderClause = safeSortBy === 'units_sold'
        ? `ORDER BY units_sold ${safeSortDir}`
        : `ORDER BY p.${safeSortBy} ${safeSortDir}`;

    const countResult = await pool.query(
        `SELECT COUNT(*)::int AS count FROM products p ${whereSql}`,
        whereValues
    );

    const limitIndex = whereValues.length + 1;
    const offsetIndex = whereValues.length + 2;
    const listValues = [...whereValues, limit, offset];

    const listResult = await pool.query(
        `${PRODUCT_SELECT_SQL}
         ${whereSql}
         ${PRODUCT_GROUP_BY}
         ${orderClause}
         LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
        listValues
    );

    return {
        items: listResult.rows.map(mapProduct),
        total: countResult.rows[0]?.count || 0,
    };
};

const getProductById = async (userId, id) => {
    const safeUserId = userId || '';
    const result = await pool.query(
        `${PRODUCT_SELECT_SQL} WHERE p.id = $1 AND (p.user_id = $2 OR p.user_id IS NULL) ${PRODUCT_GROUP_BY}`,
        [id, safeUserId]
    );

    return result.rows[0] ? mapProduct(result.rows[0]) : null;
};

const createProduct = async (userId, payload) => {
    const { name, sku, price, stock, category, status, imageUrl } = payload;
    const safeUserId = userId || '';
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO products (user_id, name, sku, price, stock, category, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
            [safeUserId, name, sku || null, price, stock, category || null, status || 'active']
        );

        const productId = result.rows[0].id;

        if (imageUrl) {
            await client.query(
                `INSERT INTO product_images (product_id, image_url)
         VALUES ($1, $2)`,
                [productId, imageUrl]
            );
        }

        const created = await client.query(
            `${PRODUCT_SELECT_SQL} WHERE p.id = $1 ${PRODUCT_GROUP_BY}`,
            [productId]
        );

        await client.query('COMMIT');
        return mapProduct(created.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const updateProduct = async (userId, id, payload) => {
    const safeUserId = userId || '';
    const fields = [];
    const values = [];

    const pushField = (field, value) => {
        values.push(value);
        fields.push(`${field} = $${values.length}`);
    };

    if (payload.name !== undefined) {
        pushField('name', payload.name);
    }
    if (payload.sku !== undefined) {
        pushField('sku', payload.sku);
    }
    if (payload.price !== undefined) {
        pushField('price', payload.price);
    }
    if (payload.stock !== undefined) {
        pushField('stock', payload.stock);
    }
    if (payload.category !== undefined) {
        pushField('category', payload.category);
    }
    if (payload.status !== undefined) {
        pushField('status', payload.status);
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        if (fields.length > 0) {
            fields.push('updated_at = NOW()');
            values.push(id, safeUserId);

            const result = await client.query(
                `UPDATE products
     SET ${fields.join(', ')}
     WHERE id = $${values.length - 1} AND (user_id = $${values.length} OR user_id IS NULL)`,
                values
            );

            if (result.rowCount === 0) {
                await client.query('ROLLBACK');
                return null;
            }
        } else {
            const exists = await client.query(
                'SELECT 1 FROM products WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)',
                [id, safeUserId]
            );

            if (exists.rowCount === 0) {
                await client.query('ROLLBACK');
                return null;
            }
        }

        if (payload.imageUrl !== undefined) {
            if (payload.imageUrl === null) {
                await client.query(
                    'DELETE FROM product_images WHERE product_id = $1',
                    [id]
                );
            } else {
                await client.query(
                    `INSERT INTO product_images (product_id, image_url)
         VALUES ($1, $2)
         ON CONFLICT (product_id) DO UPDATE SET image_url = EXCLUDED.image_url`,
                    [id, payload.imageUrl]
                );
            }
        }

        const updated = await client.query(
            `${PRODUCT_SELECT_SQL} WHERE p.id = $1 ${PRODUCT_GROUP_BY}`,
            [id]
        );

        await client.query('COMMIT');
        return updated.rows[0] ? mapProduct(updated.rows[0]) : null;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const deleteProduct = async (userId, id) => {
    const safeUserId = userId || '';
    const result = await pool.query(
        `DELETE FROM products WHERE id = $1 AND (user_id = $2 OR user_id IS NULL) RETURNING id, name`,
        [id, safeUserId]
    );

    return result.rows[0] || null;
};

module.exports = {
    ensureProductsTable,
    ensureProductImagesTable,
    listProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
};
