const jwt = require("jsonwebtoken");
const imageQuery = require("../queries/images");
const userQuery = require("../queries/users")
const authService = require("../services/authService");
const pool = require("../data-source");
const {join} = require("node:path");
const path = require('path');
const fs = require("node:fs");
const {query} = require("express");

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

const getSignedImageUrl = async (req, res) => {
    const filename = req.params.filename;

    await authService.authorizeToken(req.headers.authorization).then(async result => {
        if (result.status === 'error') {
            if (await imageQuery.isImageViewable(filename, null)) {
                await authService.getSingleUseToken(filename).then(result => {
                    const signedUrl = `${req.protocol}://${req.get('host')}/api/images/${filename}?token=${result}`;
                    res.json({signedUrl});
                })
            } else {
                res.status(400).json({message: 'Access denied'});
            }
        } else {
            if (result.permissionLevel > 5 || await imageQuery.isImageViewable(filename, result.userId)) {
                await authService.getSingleUseToken(filename).then(result => {
                    const signedUrl = `${req.protocol}://${req.get('host')}/api/images/${filename}?token=${result}`;
                    res.json({signedUrl});
                })
            } else {
                res.status(400).json({message: 'Access denied'});
            }
        }
    })
}

const getSignedImage = async (req, res) => {
    const filename = req.params.filename;
    const {token, size} = req.query;

    await authService.isSingleUseTokenValid(token, filename).then(async result => {
        if (result || await imageQuery.isImageViewable(filename, null)) {
            let imagePath;
            if (size === 'small' || size === 'medium' || size === 'large') {
                imagePath = path.join(__dirname, '../uploads', size, filename);
            } else {
                imagePath = path.join(__dirname, '../uploads', filename);
            }


            fs.access(imagePath, fs.constants.F_OK, (err) => {
                if (err) {
                    return res.status(404).json({message: 'Image not found'});
                }
                res.status(200).sendFile(imagePath);
            });
        } else {
            res.status(400).json({message: 'Token invalid, please try getting a new access token'});
        }
    })
}



module.exports = {
    showImageByName,
    getSignedImageUrl,
    getSignedImage
}