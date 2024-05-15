const {request, response} = require("express");
const Pool = require('pg').Pool
const pool = new Pool({
    user: 'admin',
    host: 'heedix.de',
    database: 'heedix-gallery',
    password: 'YaPfgnD2uwY0',
    port: 5432,
})

const getImages = (request, response) => {
    pool.query('SELECT * FROM images ORDER BY imageid DESC ', (error, results) => {
        if (error) {
            throw error
        }
        response.status(200).json(results.rows)
    })
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