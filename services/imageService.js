const jwt = require("jsonwebtoken");

const imageQuery = require("../queries/images");
const userQuery = require("../queries/users");
const authService = require("./authService");
const path = require("path");

/**
 * Fetches all images viewable by the requesting user based on their permission level.
 *
 * - If an authorization token is provided and valid, the user's permissions are checked.
 * - Users with permission level > 5 can view all images.
 * - Users with lower permissions see only viewable images specific to them.
 * - If no valid token is provided, only public images are returned.
 *
 * @param {Object} request - The HTTP request object, expected to contain an authorization header.
 * @param {Object} response - The HTTP response object used to return image data.
 */

const getAllViewableImages =  async (request, response) => {
    console.log('image abfrage von: $1\n time: $2', request.ip, new Date().toLocaleString());
    await authService.authorizeToken(request.headers.authorization).then(async result => {
        if (result.status === 'error') {
            response.status(200).json(await imageQuery.getPublicImages());
        } else {
            if (result.permissionLevel > 5) {
                response.status(200).json(await imageQuery.getAllImages());
            } else {
                response.status(200).json(await imageQuery.getViewableImages(result.userId));
            }
        }
    });
}

const getAccountImages = async (request, response) => {
    await authService.authorizeToken(request.headers.authorization).then(async result => {
        if (result.status === 'error') {
            response.status(400).json({message: 'Access denied'});
        } else {
            if (result.permissionLevel > 5) {
                response.status(200).json(await imageQuery.getAllAccountImages());
            } else {
                response.status(200).json(await imageQuery.getAccountImages(result.userId));
            }
        }
    });
}

/**
 * Exports the function for retrieving viewable images for use in other modules.
 */
module.exports = {
    getAllViewableImages,
    getAccountImages
}