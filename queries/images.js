const {request, response} = require("express");
const pool = require('../data-source');
const results = require("pg/lib/query");
const mailService = require('../services/mailService')

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
    mailService.sendMail()
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
        WHERE visibility = 'Public'
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
        WHERE visibility = 'Public'
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
          AND (($2 = ANY (viewers) or owner = $2) OR visibility = 'Public')
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
    const image_id = parseInt(request.params.id)

    pool.query('SELECT * FROM images WHERE image_id = $1', [image_id], (error, results) => {
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

async function getAccountImages(userId) {
    const query = `
        SELECT name, source, downloads, visibility, upload_date, username
        FROM images left join users on images.owner = users.userid
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

async function getAllAccountImages() {
    const query = `
        SELECT name, source, downloads, visibility, upload_date, username
        FROM images left join users on images.owner = users.userid
    `;
    try {
        const results = await pool.query(query);
        return results.rows;
    } catch (error) {
        console.error(error);
    }
}

const addImageToDb = async (extractedData, userId) => {
    const client = await pool.connect();
    try {
        const query = `
            INSERT INTO images (name,
                                size,
                                height,
                                width,
                                bits_per_sample,
                                make,
                                model,
                                exposure_time,
                                f_number,
                                iso,
                                creation_date_time,
                                color_space,
                                white_balance,
                                focal_length,
                                focal_length_equivalent,
                                lens_model,
                                owner,
                                upload_date
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
            RETURNING image_id
        `;
        const values = [
            extractedData.filename,
            extractedData.fileSize,
            extractedData.height,
            extractedData.width,
            extractedData.bitsPerSample,
            extractedData.make,
            extractedData.model,
            extractedData.exposureTime,
            extractedData.fNumber,
            extractedData.isoSpeedRatings,
            extractedData.dateTimeOriginal,
            extractedData.colorSpace,
            extractedData.whiteBalance,
            extractedData.focalLength,
            extractedData.focalLengthIn35mmFilm,
            extractedData.lensModel,
            userId
        ];
        const result = await client.query(query, values);

        updateQuery = `
            UPDATE images
            SET source = $2
            WHERE image_id = $1
        `;
        await client.query(updateQuery, [result, result + extractedData.fileExt]);

        console.log("User added with ID:", result.rows[0].userid);
        return result.rows[0];
    } catch (error) {
        throw error;
    } finally {
        client.release();
    }
};


/**
 * Exports the functions for retrieving and updating images for use in other modules.
 */
module.exports = {
    getAllImages,
    getPublicImages,
    getViewableImages,
    isImageViewable,
    getImageById,
    getAccountImages,
    getAllAccountImages,
    addImageToDb
    //updateImage}
}