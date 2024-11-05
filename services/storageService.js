const jwt = require("jsonwebtoken");
const imageQuery = require("../queries/images");
const userQuery = require("../queries/users")
const authService = require("../services/authService");
const pool = require("../data-source");
const {join} = require("node:path");
const path = require('path');
const {isImageViewable} = require("../queries/images");

const showImageByName = async (request, response) => {
    const filename = request.params.filename;
    await authService.authorizeToken(request.headers.authorization).then(async result => {
        if (result.status === 'error') {
            if (await imageQuery.isImageViewable(filename, null)) {
                response.status(200).sendFile(filename, {root: path.join(__dirname, '../uploads')});
            } else {
                response.status(400).json({message: 'Access denied'});
            }
        } else {
            if (result.permissionLevel > 5 || await imageQuery.isImageViewable(filename, result.userId)) {
                response.status(200).sendFile(filename, {root: path.join(__dirname, '../uploads')});
            } else {
                response.status(400).json({message: 'Access denied'});
            }
        }
    })
}

module.exports = {
    showImageByName
}