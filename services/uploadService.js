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
                    return res.status(400).send('No file uploaded.');
                }
                const extractedData = await getFileMetaData(req.file);
                try {
                    const dbResult = await imageQuery.addImageToDb(extractedData, result.userId);

                    await storeImage(req.file, dbResult.image_id)
                    res.status(200).json({message: 'Image uploaded successfully.'});
                } catch (error) {
                    console.error(error);
                }
            } else {
                res.status(400).json({message: 'You need to verify your email address first.'});
            }
        }
    })

}

async function getFileMetaData(file) {
    let requestData = [
        {key: 'height', tag: 'Image Height', method: 'value'},
        {key: 'width', tag: 'Image Width', method: 'value'},
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

    const tags = ExifReader.load(file.buffer);

    let extractedData = [];

    extractedData.fileExt = path.extname(file.originalname);
    extractedData.fileName = file.originalname;
    extractedData.fileSize = file.size;
    for (const key of requestData) {
        try {
            extractedData[key.key] = tags[key.tag][key.method];
        } catch (error) {
            extractedData[key.key] = null;
        }
    }
    try {
        extractedData.dateTimeOriginal = extractedData.dateTimeOriginal.replace(/:/, '-').replace(/:/, '-');
    } catch (error) {
    }
    return extractedData;
}

async function storeImage(file, imageId) {
    const uploadDir = path.join(__dirname, '../uploads');

    const fileExt = path.extname(file.originalname);
    const filename = imageId + fileExt;
    const filePath = path.join(uploadDir, filename);

    require('fs').writeFile(filePath, file.buffer, async (err) => {
        if (err) {
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
        } catch (error) {
            console.error(error);
        }
    });

}

module.exports = {
    uploadImage
};
