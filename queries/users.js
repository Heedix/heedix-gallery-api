const {request, response} = require("express");
const pool = require('../data-source');

const getUserByUsername = (username) => {
    return pool.query('SELECT * FROM users WHERE username = $1', [username])
        .then(results => results.rows)
        .catch(error => {
            throw error
        })
}

const addUserToDb = async (email, username, password) => {
    const client = await pool.connect();
    try {
        const query = `
            INSERT INTO users (email, username, password)
            VALUES ($1, $2, $3)
            RETURNING userid
        `;
        const values = [email, username, password];
        const result = await client.query(query, values);

        console.log("User added with ID:", result.rows[0].userid);
        return result.rows[0];
    } catch (error) {
        //console.error("Error adding user:", error);
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    getUserByUsername,
    addUserToDb
}