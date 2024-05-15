const Pool = require('pg').Pool
const pool = new Pool({
    user: 'admin',
    host: 'heedix.de',
    database: 'heedix-gallery',
    password: 'YaPfgnD2uwY0',
    port: 5432,
})

export function getPool() {
    return pool
}