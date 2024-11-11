const express = require('express');
const cors = require('cors')
const app = express();
const port = 3000

require('dotenv').config();

const imageService = require('./services/imageService');
const storageService = require('./services/storageService');
const loginRegisterService = require('./services/loginRegisterService')

const imageQuery = require('./queries/images')
const userQuery = require('./queries/users')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const multer = require('multer');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET

app.options('*', cors())
app.use(express.json());
app.use(
    cors({
        origin: "*",
        credentials: true,
        allowedHeaders: true,
    })
);

/**
 * Route to retrieve all images.
 */
app.get('/images', imageService.getAllViewableImages);

app.get('/api/images/:filename', storageService.getSignedImage);

app.get('/api/getSignedImageUrl/:filename', storageService.getSignedImageUrl);

app.get('/api/account/images', imageService.getAccountImages)

//app.get('/api/account/folders', folderService.getAccountFolders) TODO


//Imgae processing

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
});

app.get('/uploads/:filename', storageService.showImageByName);

/**
 * Login endpoint to authenticate a user.
 * Creates a JWT token if authentication is successful.
 */
app.post('/api/auth/login', loginRegisterService.login);

/**
 * Registration endpoint to create a new user.
 * Hashes the password and saves user data to the database.
 */
app.post('/api/register', loginRegisterService.register);

/**
 * Starts the server and listens on the specified port.
 */
app.listen(port, () => {
    console.log(`Server started on port ${port}`)
})