const pool = require("../data-source");


async function getAccountFolders(userId) {
    const query = `
        SELECT name, thumbnailsource, visibility, creation_date_time, username
        FROM folders left join users on folders.owner = users.userid
        WHERE visibility = 'Public'
           OR owner = $1
           OR $1 = ANY (viewers)
    `;
    try {
        const results = await pool.query(query, [userId]);
        return results.rows;
    } catch (error) {
        console.error(error);
    }
}

async function getAccountFoldersEditable(userId) {
    const query = `
        SELECT name, deletable, folder_id, owner
        FROM folders
        WHERE owner = $1
           OR $1 = ANY (editors)
    `;
    try {
        const results = await pool.query(query, [userId]);
        return results.rows;
    } catch (error) {
        console.error(error);
    }
}

async function getAllAccountFolders() {
    const query = `
        SELECT name, thumbnailsource, visibility, creation_date_time, username
        FROM folders left join users on folders.owner = users.userid
    `;
    try {
        const results = await pool.query(query);
        return results.rows;
    } catch (error) {
        console.error(error);
    }
}

async function addDraftFolderToDb(userId) {
    const client = await pool.connect();
    try {
        const query = `
            INSERT INTO folders (name, owner, visibility, creation_date_time, deletable)
            VALUES ('Drafts', $1, 'Private', NOW(), false)
            RETURNING folder_id;
        `;
        const values = [userId];
        const result = await client.query(query, values);

        const folderId = result.rows[0].folder_id;

        console.log("Folder added with ID:", folderId);
        return result.rows[0];
    } catch (error) {
        throw error;
    } finally {
        client.release();
    }
}

async function isFolderEditable(folderId, userId) {
    const query = `
        SELECT folder_id
        FROM folders
        WHERE folder_id = $1
          AND ($2 = ANY (editors) OR owner = $2)
    `;
    try {
        const result = await pool.query(query, [folderId, userId]);
        return !!result.rows[0];
    } catch (error) {
        console.error(error);
        return false
    }
}

module.exports = {
    getAccountFolders,
    getAccountFoldersEditable,
    getAllAccountFolders,
    addDraftFolderToDb,
    isFolderEditable
}