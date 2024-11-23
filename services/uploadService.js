const multer = require("multer");
const path = require("path");
const ExifReader = require('exifreader');

const imageQuery = require('../queries/images');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Speicherort
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Dateiname
    }
});

// Route für den Upload
const uploadImage = async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    // Perform operations on the image buffer (req.file.buffer) here

    const extractedData = await getFileMetaData(req.file);

    try {
        const result = await imageQuery.addImageToDb(extractedData, '82e06593-f64b-4dfa-bd33-7d2b5ee3f86b');
    } catch (error) {
        console.error(error);
    }

    const fileExt = path.extname(req.file.originalname);
    const filename = Date.now() + fileExt;
    const filePath = path.join(__dirname, '../uploads/', filename);

    // Save the processed image to disk
    require('fs').writeFile(filePath, req.file.buffer, (err) => {
        if (err) {
            return res.status(500).send('Error saving the file.');
        }
        const imageUrl = `http://localhost:3000/uploads/${filename}`;
        res.send({imageUrl: imageUrl});
    });
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
        {key: 'dateTimeOriginal', tag: 'DateTimeOriginal', method: 'description'},
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
            extractedData[key.key] = tags[key.tag][key.method] //push({key: key.key, value: tags[key.tag][key.method]});
        } catch (error) {
            extractedData[key.key] = 'N/A';
        }
    }
    extractedData.dateTimeOriginal = extractedData.dateTimeOriginal.replace(/:/, '-').replace(/:/, '-');
    return extractedData;
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