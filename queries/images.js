const {request, response} = require("express");
const pool = require('../data-source');
const results = require("pg/lib/query");

/**
 * Retrieves all images from the database without filtering by visibility or ownership.
 *
 * @returns {Promise<Array>} A promise that resolves to an array of all image records.
 * @throws {Error} If an error occurs during the database query.
 */
async function getAllImages() {
    let query = `
        SELECT *
        FROM images
    `;
    try {
        const results = await pool.query(query);
        return results.rows;
    } catch (error) {
        throw error;
    }
}

/**
 * Retrieves images that the specified user is allowed to view.
 *
 * - Returns images that are public, owned by the user, or have the user listed as a viewer.
 *
 * @param {number} userId - The ID of the user requesting to view images.
 * @returns {Promise<Array>} A promise that resolves to an array of viewable image records.
 * @throws {Error} If an error occurs during the database query.
 */
async function getViewableImages(userId) {
    const query = `
        SELECT *
        FROM images
        WHERE public = true
           OR owner = $1
           OR $1 = ANY (viewers)
    `;
    try {
        const results = await pool.query(query, [userId]);
        return results.rows;
    } catch (error) {
        throw error;
    }
}

/**
 * Retrieves only public images from the database.
 *
 * @returns {Promise<Array>} A promise that resolves to an array of public image records.
 * @throws {Error} If an error occurs during the database query.
 */
async function getPublicImages() {
    const query = `
        SELECT *
        FROM images
        WHERE public = true
    `;
    try {
        const results = await pool.query(query);
        return results.rows;
    } catch (error) {
        console.error(error);
    }
}

async function isImageViewable(source, userId) {
    const query = `
        SELECT source
        FROM images
        WHERE source = $1
          AND (($2 = ANY (viewers) or owner = $2) OR public = true)
    `;
    try {
        const result = await pool.query(query, [source, userId]);
        return !!result.rows[0];
    } catch (error) {
        console.error(error);
        return false
    }
}

/**
 * Retrieves a specific image by its ID.
 *
 * - Fetches an image from the database based on the provided image ID in the request.
 *
 * @param {Object} request - The HTTP request object, containing the image ID as a route parameter.
 * @param {Object} response - The HTTP response object used to return the image data.
 */
const getImageById = (request, response) => {
    const imageid = parseInt(request.params.id)

    pool.query('SELECT * FROM images WHERE imageid = $1', [imageid], (error, results) => {
        if (error) {
            throw error
        }
        response.status(200).json(results.rows)
    })
}

/*const updateImage= (request, response) => {
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
}*/

/**
 * Exports the functions for retrieving and updating images for use in other modules.
 */
module.exports = {
    getAllImages,
    getPublicImages,
    getViewableImages,
    isImageViewable,
    getImageById
    //updateImage
}