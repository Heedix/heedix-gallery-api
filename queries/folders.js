const pool = require("../data-source");


async function getAccountFolders() {
    const query = `
        SELECT name, thumbnailsource, visibility, creationdate, username
        FROM folders left join users on folders.owner = users.userid
        WHERE visibility = 'Public'
           OR owner = $1
           OR $1 = ANY (viewers)
    `;
    try {
        const results = await pool.query(query);
        return results.rows;
    } catch (error) {
        console.error(error);
    }
}

async function getAllAccountFolders() {
    const query = `
        SELECT name, thumbnailsource, visibility, creationdate, username
        FROM folders left join users on folders.owner = users.userid
    `;
    try {
        const results = await pool.query(query);
        return results.rows;
    } catch (error) {
        console.error(error);
    }
}

module.exports = {
    getAccountFolders,
    getAllAccountFolders
}