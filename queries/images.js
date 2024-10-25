const {request, response} = require("express");
const pool = require('../data-source');

const getImages = (request, response) => {
    let query = 'SELECT * FROM images';

    // Check for query params
    if (request.query.public === 'true') {
        query += ' WHERE public = true';
    }

    query += ' ORDER BY imageid DESC';

    pool.query(query, (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    });
}

const getImageById = (request, response) => {
    const imageid = parseInt(request.params.id)

    pool.query('SELECT * FROM images WHERE imageid = $1', [imageid], (error, results) => {
        if (error) {
            throw error
        }
        response.status(200).json(results.rows)
    })
}

const updateImage= (request, response) => {
    const imageId = parseInt(request.params.imageid);
    const downloads = parseInt(request.params.downloads);
    const visible = request.params.visible;

    pool.query('UPDATE images SET downloads = $1, visible = $2 WHERE imageid = $3',
        [downloads, visible, imageId],
    (error, results) => {
        if (error) {
            throw error
        }
        response.status(200).send(`User modified with ID: ${imageId}`)
    })
}

module.exports = {
    getImages,
    getImageById,
    updateImage
}