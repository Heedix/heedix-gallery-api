const DEFAULT_MAINTENANCE_MESSAGE = 'We are updating Heedix Gallery. Please check back later.';

function createSiteSettingsStore(pool) {
    const select = `SELECT login_enabled AS "loginEnabled", maintenance_mode AS "maintenanceMode",
        maintenance_message AS "maintenanceMessage", updated_at AS "updatedAt"
        FROM site_settings WHERE id = 1`;

    return {
        async initialize() {
            await pool.query(`CREATE TABLE IF NOT EXISTS site_settings (
                id SMALLINT PRIMARY KEY CHECK (id = 1),
                login_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
                maintenance_message VARCHAR(500) NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )`);
            await pool.query(`INSERT INTO site_settings (id, maintenance_message)
                VALUES (1, $1) ON CONFLICT (id) DO NOTHING`, [DEFAULT_MAINTENANCE_MESSAGE]);
        },
        async get() {
            const result = await pool.query(select);
            if (!result.rows[0]) throw new Error('Site settings have not been initialized.');
            return result.rows[0];
        },
        async update(settings) {
            const result = await pool.query(`UPDATE site_settings SET login_enabled = $1,
                maintenance_mode = $2, maintenance_message = $3, updated_at = NOW()
                WHERE id = 1 RETURNING login_enabled AS "loginEnabled", maintenance_mode AS "maintenanceMode",
                maintenance_message AS "maintenanceMessage", updated_at AS "updatedAt"`,
            [settings.loginEnabled, settings.maintenanceMode, settings.maintenanceMessage]);
            if (!result.rows[0]) throw new Error('Site settings have not been initialized.');
            return result.rows[0];
        }
    };
}

module.exports = {createSiteSettingsStore, DEFAULT_MAINTENANCE_MESSAGE};
