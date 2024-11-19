const {request, response} = require("express");
const pool = require('../data-source');

const getUserByUsername = (username) => {
    return pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username])
        .then(results => results.rows)
        .catch(error => {
            throw error
        })
}

const getUserById = async (userId) => {
    try {
        const results = await pool.query('SELECT * FROM users WHERE userid = $1', [userId]);
        return results.rows;
    } catch (error) {
        throw error;
    }
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
        throw error;
    } finally {
        client.release();
    }
};

const verifyUser = async (userId) => {
    const client = await pool.connect();
    try {
        const query = `
            UPDATE users
            SET verified = true
            WHERE userid = $1
        `;
        await client.query(query, [userId]);

        console.log("User verified with ID:", userId);
    } catch (error) {
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    getUserByUsername,
    getUserById,
    addUserToDb,
    verifyUser
}