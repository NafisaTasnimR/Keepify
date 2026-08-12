const { pool } = require('../config/postgres');

const USER_SETTINGS_COLUMNS = [
    'id',
    'user_id',
    'email',
    'name',
    'created_at',
    'updated_at',
];

const mapUserSettings = (row) => ({
    id: row.id,
    userId: row.user_id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const ensureUserSettingsTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS user_settings (
            id          SERIAL PRIMARY KEY,
            user_id     TEXT UNIQUE NOT NULL,
            email       TEXT NOT NULL,
            name        TEXT NOT NULL,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS user_id TEXT;
        
        -- Drop old unique constraint on email if exists
        DO $$ BEGIN
            ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_email_key;
        EXCEPTION WHEN undefined_object THEN NULL; END $$;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
    `);
};

const getUserSettingsByUserId = async (userId) => {
    const { rows } = await pool.query(
        `SELECT ${USER_SETTINGS_COLUMNS.join(', ')}
         FROM user_settings
         WHERE user_id = $1`,
        [userId]
    );

    return rows[0] ? mapUserSettings(rows[0]) : null;
};

const getUserSettingsByEmail = async (email) => {
    const { rows } = await pool.query(
        `SELECT ${USER_SETTINGS_COLUMNS.join(', ')}
         FROM user_settings
         WHERE email = $1`,
        [email]
    );

    return rows[0] ? mapUserSettings(rows[0]) : null;
};

const createUserSettings = async ({ userId, email, name }) => {
    const { rows } = await pool.query(
        `INSERT INTO user_settings (user_id, email, name)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            updated_at = NOW()
         RETURNING ${USER_SETTINGS_COLUMNS.join(', ')}`,
        [userId, email, name]
    );

    return mapUserSettings(rows[0]);
};

const updateUserSettings = async (userId, payload) => {
    const fields = [];
    const values = [];

    const pushField = (column, value) => {
        values.push(value);
        fields.push(`${column} = $${values.length}`);
    };

    if (payload.name !== undefined) {
        pushField('name', payload.name);
    }

    if (!fields.length) {
        return null;
    }

    values.push(userId);
    const { rows } = await pool.query(
        `UPDATE user_settings
         SET ${fields.join(', ')}, updated_at = NOW()
         WHERE user_id = $${values.length}
         RETURNING ${USER_SETTINGS_COLUMNS.join(', ')}`,
        values
    );

    return rows[0] ? mapUserSettings(rows[0]) : null;
};

module.exports = {
    ensureUserSettingsTable,
    getUserSettingsByUserId,
    getUserSettingsByEmail,
    createUserSettings,
    updateUserSettings,
};