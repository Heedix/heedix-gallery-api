const jwt = require("jsonwebtoken");
const imageQuery = require("../queries/images");
const userQuery = require("../queries/users");
const pool = require("../data-source");
const {join} = require("node:path");
const JWT_SECRET = process.env.JWT_SECRET;
const path = require('path');

const showImageByName = (request, response) => {
    const filename = request.params.filename;
    console.log(filename);
    let authKey = null;
    if(request.headers.authorization && request.headers.authorization.startsWith("Bearer ")){
        authKey = request.headers['authorization'].replace('Bearer ', '');
    }
    jwt.verify(authKey, JWT_SECRET, async (err) => {
        if (err) {
            const query = `
                    SELECT source 
                    FROM images 
                    WHERE source = $1 
                    AND public = true
                `
            const results = await pool.query(query, [filename]);
            const result = results.rows[0];
            console.log(result);
            if(result) {
                response.status(200).sendFile(result.source, { root: path.join(__dirname, '../uploads') });
                //response.sendFile('../uploads/' + result.source);
            } else {
                response.status(400).json({message: 'Access denied'});
            }
        } else {
            try {
                const decoded = jwt.decode(authKey);
                let decodedUsers = await userQuery.getUserById(decoded.sub);
                let decodedUser = decodedUsers[0];

                const query = `
                    SELECT source 
                    FROM images 
                    WHERE source = $1 
                    AND ($2 = ANY(viewers) or owner = $2)
                `
                const result = await pool.query(query, [filename, decodedUser.userId]);

                if (result.rows.length === 0) {
                    // Falls keine Berechtigung vorhanden, Zugriff verweigern
                    return response.status(403).send('You do not have permission to view this image.');
                }

                // Datei pfad
                const filePath = path.join(__dirname, 'uploads', filename);
                response.sendFile(filePath);
            } catch (error) {
                console.error('Database error:', error);
                response.status(500).send('Internal server error');
            }
        }
    });
}

module.exports = {
    showImageByName
}