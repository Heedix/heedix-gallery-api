const multer = require("multer");
const path = require("path");
const ExifReader = require('exifreader');
const sharp = require('sharp');


const imageQuery = require('../queries/images');

// Route für den Upload
const uploadImage = async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    // Perform operations on the image buffer (req.file.buffer) here

    const extractedData = await getFileMetaData(req.file);



    try {
        const result = await imageQuery.addImageToDb(extractedData, '82e06593-f64b-4dfa-bd33-7d2b5ee3f86b');

        await storeImage(req.file, result.image_id)

    } catch (error) {
        console.error(error);
    }

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
    } catch (error) {}
    return extractedData;
}

async function storeImage(file, imageId) {

    const uploadDir = path.join(__dirname, '../uploads');
    //            const filePath = path.join(__dirname, '../uploads/', filename);

    const fileExt = path.extname(file.originalname);
    const filename = imageId + fileExt;
    const filePath = path.join(uploadDir, filename);

    // Save the processed image to disk


    require('fs').writeFile(filePath, file.buffer, async (err) => {
        if (err) {
        }

        try {

            const fileExt = path.extname(file.originalname);
            const fileName = imageId + fileExt;

            const originalPath = path.join(uploadDir, fileName);

            // Original speichern
            await sharp(file.buffer).toFile(filePath);

            // Definiere verschiedene Größen
            const sizes = [
                { folder: 'small', width: 300 },
                { folder: 'medium', width: 500 },
                { folder: 'large', width: 1000 },
            ];

            const resizedImagePaths = [];

            // Iteriere über die Größen und speichere jede Version
            for (const size of sizes) {
                const resizedPath = path.join(uploadDir, size.folder , fileName);

                await sharp(file.buffer)
                    .resize({ width: size.width })
                    .toFile(resizedPath);

                resizedImagePaths.push({
                    size: size.suffix,
                    url: `http://localhost:3000/uploads/${fileName}`,
                });
            }

            // URL für das Original und die Größen zurückgeben
            /*res.send({
                original: `http://localhost:3000/uploads/${fileName}`,
                sizes: resizedImagePaths,
            });*/
        } catch (error) {
            console.error(error);
        }
    });

}

module.exports = {
    uploadImage
};

/*
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Speicherort
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Dateiname
    }
});

const upload = multer({ storage: storage });

// Route für den Upload
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    const imageUrl = `http://localhost:3000/uploads/${req.file.filename}`; //TODO ändern zu url
    res.send({ imageUrl: imageUrl });
});*/