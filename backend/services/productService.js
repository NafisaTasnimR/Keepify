const { pool } = require('../config/postgres');

const PRODUCT_COLUMNS = [
    'id',
    'name',
    'sku',
    'price',
    'stock',
    'category',
    'status',
    'created_at',
    'updated_at',
];

const PRODUCT_SELECT_COLUMNS = [
    'p.id',
    'p.name',
    'p.sku',
    'p.price',
    'p.stock',
    'p.category',
    'p.status',
    'p.created_at',
    'p.updated_at',
    'pi.image_url',
];

const PRODUCT_SELECT_SQL = `
    SELECT ${PRODUCT_SELECT_COLUMNS.join(', ')}
    FROM products p
    LEFT JOIN product_images pi ON pi.product_id = p.id
`;

const mapProduct = (row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    price: row.price !== null ? Number(row.price) : null,
    stock: row.stock !== null ? Number(row.stock) : null,
    category: row.category,
    status: row.status,
    imageUrl: row.image_url || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const ensureProductsTable = async () => {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      sku TEXT UNIQUE,
      price NUMERIC(10, 2) NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      category TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

const ensureProductImagesTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS product_images (
            product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
            image_url TEXT NOT NULL
        );
    `);
};

const listProducts = async ({ search, limit, offset, sortBy, sortDir }) => {
    const whereValues = [];
    const whereClauses = [];

    if (search) {
        whereValues.push(`%${search}%`);
        whereClauses.push(
            `(p.name ILIKE $${whereValues.length} OR p.sku ILIKE $${whereValues.length})`
        );
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const allowedSort = new Set(['name', 'price', 'stock', 'created_at', 'updated_at']);
    const safeSortBy = allowedSort.has(sortBy) ? sortBy : 'created_at';
    const safeSortDir = sortDir === 'asc' ? 'ASC' : 'DESC';

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
     ORDER BY p.${safeSortBy} ${safeSortDir}
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
        listValues
    );

    return {
        items: listResult.rows.map(mapProduct),
        total: countResult.rows[0]?.count || 0,
    };
};

const getProductById = async (id) => {
    const result = await pool.query(
        `${PRODUCT_SELECT_SQL} WHERE p.id = $1`,
        [id]
    );

    return result.rows[0] ? mapProduct(result.rows[0]) : null;
};

const createProduct = async (payload) => {
    const { name, sku, price, stock, category, status, imageUrl } = payload;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO products (name, sku, price, stock, category, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
            [name, sku, price, stock, category, status]
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
            `${PRODUCT_SELECT_SQL} WHERE p.id = $1`,
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

const updateProduct = async (id, payload) => {
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
            values.push(id);

            const result = await client.query(
                `UPDATE products
     SET ${fields.join(', ')}
     WHERE id = $${values.length}`,
                values
            );

            if (result.rowCount === 0) {
                await client.query('ROLLBACK');
                return null;
            }
        } else {
            const exists = await client.query(
                'SELECT 1 FROM products WHERE id = $1',
                [id]
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
            `${PRODUCT_SELECT_SQL} WHERE p.id = $1`,
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

const deleteProduct = async (id) => {
    const result = await pool.query(
        `DELETE FROM products WHERE id = $1 RETURNING ${PRODUCT_COLUMNS.join(', ')}`,
        [id]
    );

    return result.rows[0] ? mapProduct(result.rows[0]) : null;
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
