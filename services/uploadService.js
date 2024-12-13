const multer = require("multer");
const path = require("path");
const ExifReader = require('exifreader');
const sharp = require('sharp');


const imageQuery = require('../queries/images');
const userQuery = require('../queries/users');
const authService = require("./authService");

const uploadImage = async (req, res) => {
    await authService.authorizeToken(req.headers.authorization).then(async result => {
        if (result.status === 'error') {
            res.status(400).json({message: 'Access denied'});
        } else {
            if (await userQuery.isUserVerified(result.userId)) {
                if (!req.file) {
                    return res.status(400).json({message: 'No file uploaded.'});
                } else if (
                    path.extname(req.file.originalname) !== '.jpg' &&
                    path.extname(req.file.originalname) !== '.jpeg' &&
                    path.extname(req.file.originalname) !== '.png') {
                    return res.status(400).json({message: 'File is not an image.'});
                }
                try {
                    if (req.file.size > 5242880) {
                        return res.status(400).json({message: 'File is too large. Max file size is 5MB.'});
                    }
                    const extractedData = await getFileMetaData(req.file, req.body);
                    const dbResult = await imageQuery.addImageToDb(extractedData, result.userId);

                    await storeImage(req.file, dbResult.image_id);
                    res.status(200).json({message: 'Image uploaded successfully.'});
                } catch (error) {
                    console.error(error);
                    res.status(500).json({message: 'An error occurred while uploading the image.'});
                }
            } else {
                res.status(400).json({message: 'You need to verify your email address first.'});
            }
        }
    })

}

async function getFileMetaData(file, imageData) {
    let requestData = [
        {key: 'height', tag: 'Image Height', method: 'value'},
        {key: 'width', tag: 'Image Width', method: 'value'},
        {key: 'creationDate', tag: 'CreateDate', method: 'description'},
        {key: 'bitsPerSample', tag: 'Bits Per Sample', method: 'description'},
        {key: 'make', tag: 'Make', method: 'description'},
        {key: 'model', tag: 'Model', method: 'description'},
        {key: 'exposureTime', tag: 'ExposureTime', method: 'description'},
        {key: 'fNumber', tag: 'FNumber', method: 'description'},
        {key: 'isoSpeedRatings', tag: 'ISOSpeedRatings', method: 'description'},
        {key: 'colorSpace', tag: 'ColorSpace', method: 'description'},
        {key: 'whiteBalance', tag: 'WhiteBalance', method: 'description'},
        {key: 'focalLength', tag: 'FocalLength', method: 'description'},
        {key: 'focalLengthIn35mmFilm', tag: 'FocalLengthIn35mmFilm', method: 'description'},
        {key: 'lensModel', tag: 'LensModel', method: 'description'}
    ];

    let tags;

    imageData.name ? imageData.fileName = imageData.name : imageData.fileName = file.originalname;
    imageData.fileSize = file.size;
    imageData.fileExt = path.extname(file.originalname);

    try {
        tags = ExifReader.load(file.buffer);
        for (const key of requestData) {
            if (imageData[key] == null) {
                try {
                    imageData[key.key] = tags[key.tag][key.method];
                } catch (error) {
                    imageData[key.key] = null;
                }
            } else {
                imageData[key.key] = null
            }
        }
    } catch (error) {}

    return imageData;
}

async function storeImage(file, imageId) {
    const uploadDir = path.join(__dirname, '../uploads');

    const fileExt = path.extname(file.originalname);
    const filename = imageId + fileExt;
    const filePath = path.join(uploadDir, filename);

    return new Promise((resolve, reject) => {
        require('fs').writeFile(filePath, file.buffer, async (err) => {
            if (err) {
                reject(false);
            }

            try {
                const fileExt = path.extname(file.originalname);
                const fileName = imageId + fileExt;

                await sharp(file.buffer).toFile(filePath);

                const sizes = [
                    {folder: 'small', width: 300},
                    {folder: 'medium', width: 500},
                    {folder: 'large', width: 1000},
                ];

                for (const size of sizes) {
                    const resizedPath = path.join(uploadDir, size.folder, fileName);

                    await sharp(file.buffer)
                        .resize({width: size.width})
                        .toFile(resizedPath);
                }
                resolve(true);
            } catch (error) {
                const sizes = [
                    {folder: '', width: 0},
                    {folder: 'small', width: 300},
                    {folder: 'medium', width: 500},
                    {folder: 'large', width: 1000},
                ];

                for (const size of sizes) {
                    const filePathToRemove = path.join(uploadDir, size.folder, imageId + path.extname(file.originalname));
                    require('fs').unlink(filePathToRemove, (err) => {});
                }
                await imageQuery.removeImageById(imageId);
                console.error(error);
                reject(false);
            }
        });
    });
}

module.exports = {
    uploadImage
};
