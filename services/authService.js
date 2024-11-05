const jwt = require("jsonwebtoken");
const imageQuery = require("../queries/images");
const path = require("path");
const userQuery = require("../queries/users");
const {isImageViewable} = require("../queries/images");
JWT_SECRET = process.env.JWT_SECRET;

async function authorizeToken(token) {
    let authKey = null;
    if (token && token.startsWith("Bearer ")) {
        authKey = token.replace("Bearer ", "");
    }

    try {
        const decoded = await new Promise((resolve, reject) => {
            jwt.verify(authKey, JWT_SECRET, (err, decoded) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(decoded);
                }
            });
        });

        const decodedUsers = await userQuery.getUserById(decoded.sub);
        const decodedUser = decodedUsers[0];

        return {
            status: "success",
            userId: decodedUser.userid,
            permissionLevel: decodedUser.permissionlevel,
        };
    } catch (error) {
        return { status: "error", message: error.message };
    }
}

module.exports = {
    authorizeToken
}