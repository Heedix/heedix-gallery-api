const express = require('express');
const cors = require('cors')
const app = express();
const port = 3000

require('dotenv').config();

const imageService = require('./services/imageService');
const storageService = require('./services/storageService');
const loginRegisterService = require('./services/loginRegisterService')
const folderService = require('./services/folderService')
const emailVerificationService = require('./services/emailVerificationService')
const uploadService = require('./services/uploadService')

const imageQuery = require('./queries/images')
const userQuery = require('./queries/users')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const multer = require('multer');
const path = require('path');

const SITE_URL = process.env.SITE_URL;

const version = 'v1'

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.options('*', cors())
app.use(express.json());
app.use(
    cors({
        origin: `*${SITE_URL}`,
        credentials: true,
        allowedHeaders: true,
    })
);

app.set('trust proxy', true);

/**
 * Route to retrieve all images.
 */
app.get(`/${version}/health`, (req, res) => {
    res.status(200).json({message: 'Server is running.'})
});

app.get(`/${version}/images`, imageService.getAllViewableImages);

app.get(`/${version}/images/:filename`, storageService.getSignedImage);

app.get(`/${version}/getSignedImageUrl/:filename`, storageService.getSignedImageUrl);

app.get(`/${version}/account/images`, imageService.getAccountImages)

app.get(`/${version}/account/folders`, folderService.getAccountFolders)

app.get(`/${version}/account/folders/editable`, folderService.getAccountFoldersEditable)

app.use(`/${version}/account/profile-picture`, express.static(path.join(__dirname, `uploads/profile-pictures`)));

app.post(`/${version}/upload`, upload.single(`image`), uploadService.uploadImage);

app.get(`/${version}/uploads/:filename`, storageService.showImageByName);

/**
 * Login endpoint to authenticate a user.
 * Creates a JWT token if authentication is successful.
 */
app.post(`/${version}/auth/login`, loginRegisterService.login);

/**
 * Registration endpoint to create a new user.
 * Hashes the password and saves user data to the database.
 */
app.post(`/${version}/register`, loginRegisterService.register);

app.get(`/${version}/verify`, emailVerificationService.verifyEmail);

app.get(`/${version}/auth/email-verified`, loginRegisterService.emailVerified);

app.get(`/${version}/auth/authorize`, loginRegisterService.authorizeToken);

/**
 * Starts the server and listens on the specified port.
 */
app.listen(port, () => {
    console.log(`Server started on port ${port}`)
})