const jwt = require("jsonwebtoken");

const imageQuery = require("../queries/images");
const userQuery = require("../queries/users");

const JWT_SECRET = process.env.JWT_SECRET;

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
const getAllViewableImages = async (request, response) => {
    if (request.headers['authorization'] && request.headers['authorization'].startsWith('Bearer ')) {
        let authKey = request.headers['authorization'].replace('Bearer ', '');
        jwt.verify(authKey, JWT_SECRET, async (err) => {
            if (err) {
                let publicImages = await imageQuery.getPublicImages();
                response.status(200).json(publicImages);
            } else {
                try {
                    const decoded = jwt.decode(authKey);
                    let decodedUsers = await userQuery.getUserById(decoded.sub);
                    let decodedUser = decodedUsers[0];
                    if(decodedUser.permissionlevel > 5) {
                        response.status(200).json(await imageQuery.getAllImages());
                    } else {
                        response.status(200).json(await imageQuery.getViewableImages(decodedUser.userid));
                    }
                } catch (err) {
                    console.log(err);
                    response.status(400).json({errorCode: 'TOKEN_DECODE',message: 'Token could not be decoded'});
                }
            }
        });
    } else {
        let publicImages = await imageQuery.getPublicImages();
        response.status(200).json(publicImages);
    }
}

/**
 * Exports the function for retrieving viewable images for use in other modules.
 */
module.exports = {
    getAllViewableImages
}