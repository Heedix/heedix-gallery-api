const multer = require("multer");
const path = require("path");
const ExifReader = require('exifreader');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Speicherort
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Dateiname
    }
});

// Route für den Upload
const uploadImage = (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    // Perform operations on the image buffer (req.file.buffer) here

    getFileMetaData(req.file);

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

function getFileMetaData(file) {
    let requstData = [
        {key: 'Image Height', },
        'Image Width',
        'Bits Per Sample',
        'Make',
        'Model',
        'ExposureTime',
        'FNumber',
        'ISOSpeedRatings',
        'DateTimeOriginal',
        'ColorSpace',
        'WhiteBalance',
        'FocalLength',
        'FocalLengthIn35mmFilm',
        'LensModel'
    ]
    const tags = ExifReader.load(file.buffer);
    console.log(tags);
    for (const key of requstData) {
        try {
            console.log(tags[key].description);
        } catch (error) {
            console.log('No Data');
        }
    }
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