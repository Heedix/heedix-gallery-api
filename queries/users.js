const {request, response} = require("express");
const pool = require('../data-source');

const getUserByUsername = (username) => {
    return pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username])
        .then(results => results.rows[0])
        .catch(error => {
            console.log(error)
        })
}

const getUserById = async (userId) => {
    try {
        const results = await pool.query('SELECT * FROM users WHERE userid = $1', [userId]);
        return results.rows;
    } catch (error) {
        console.log(error)
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
        console.log(error)
    } finally {
        client.release();
    }
};

const isUserVerified = async (userId) => {
    try {
        const query = `
            SELECT verified 
            FROM users 
            WHERE userid = $1
        `;
        const results = await pool.query(query, [userId]);
        let returnValue;
        results.rows[0] ? returnValue = results.rows[0].verified : returnValue = false;
        return returnValue;
    } catch (error) {
        console.log(error)
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
        console.log(error)
    } finally {
        client.release();
    }
};

module.exports = {
    getUserByUsername,
    getUserById,
    addUserToDb,
    isUserVerified,
    verifyUser
}