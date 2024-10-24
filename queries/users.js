const {request, response} = require("express");
const dataSource = require('../data-source');
const pool = dataSource;

const getUserByUsername = (username) => {
    return pool.query('SELECT * FROM users WHERE username = $1', [username])
        .then(results => results.rows)
        .catch(error => {
            throw error // Fehlerbehandlung kann angepasst werden
        })
}

module.exports = {
    getUserByUsername
}