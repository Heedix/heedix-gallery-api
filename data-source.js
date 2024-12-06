const DB_USER = process.env.DB_USER;
const DB_HOST = process.env.DB_HOST;
const DB_DATABASE = process.env.DB_DATABASE;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_PORT = process.env.DB_PORT;

const Pool = require('pg').Pool
const pool = new Pool({
    user: DB_USER,
    host: DB_HOST,
    database: DB_DATABASE,
    password: DB_PASSWORD,
    port: DB_PORT,
})

console.log(pool)
console.log('DB_USER: ' + DB_USER)
console.log('DB_HOST: ' + DB_HOST)
console.log('DB_DATABASE: ' + DB_DATABASE)
console.log('DB_PASSWORD: ' + DB_PASSWORD)
console.log('DB_PORT: ' + DB_PORT)

module.exports = pool