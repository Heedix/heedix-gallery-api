const express = require('express');
const cors = require('cors')
const app = express();
const port = 3000

require('dotenv').config();

const imageService = require('./services/imageService');

const imageQuery = require('./queries/images')
const userQuery = require('./queries/users')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const multer = require('multer');
const path = require('path');
const e = require("express");

const JWT_SECRET = process.env.JWT_SECRET //TODO Secret erstellen

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
app.get('/images', imageService.getAllViewableImages)

/**
 * Route to retrieve an image by ID.
 */
app.get('/images/:id', imageQuery.getImageById)

/**
 * Route to update an image by ID.
 */
app.put('/images/:imageid', imageQuery.updateImage)


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

app.use('/uploads', express.static('uploads'));

/**
 * Login endpoint to authenticate a user.
 * Creates a JWT token if authentication is successful.
 */
app.post('/api/auth/login', async (req, res) => {
    const {username, encryptedPassword} = req.body;

    const users = await userQuery.getUserByUsername(username);
    const user = users[0];

    if (user) {
        const isMatch = await bcrypt.compare(encryptedPassword, user.password);

        if (isMatch) {
            const token = jwt.sign({ sub: user.userid, username: user.username}, JWT_SECRET, { expiresIn: '1h' });
            console.log(jwt.decode(token))
            res.status(200).json({token});
        } else {
            res.status(400).json({errorCode: 'CREDENTIALS_INVALID', message: 'Username or password is incorrect.'});
            console.log('Password is wrong.')
        }
    } else {
        res.status(400).json({errorCode: 'CREDENTIALS_INVALID', message: 'Username or password is incorrect.'});
        console.error('User not found')
    }
});

/**
 * Middleware to authenticate tokens in protected routes.
 * Adds the authenticated user to the request if the token is valid.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 */
function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token fehlt' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Ungültiger Token' });
        }

        req.user = user; // Den Benutzer zur Anforderung hinzufügen
        next();
    });
}

/**
 * Protected endpoint (accessible only with a valid token).
 */
app.get('/api/protected', authenticateToken, (req, res) => {
    res.status(200).json({ message: `Willkommen, ${req.user.username}!` });
});

/**
 * Registration endpoint to create a new user.
 * Hashes the password and saves user data to the database.
 */
app.post('/api/register', async (req, res) => {
    const {email, username, encryptedPassword} = req.body;

    try {
        const saltRounds = 10;
        console.log(encryptedPassword);
        const hashedPassword = await bcrypt.hash(encryptedPassword, saltRounds);
        console.log(hashedPassword);

        let userId = await userQuery.addUserToDb(email, username, hashedPassword);

        res.status(200).json({message: 'Registration successful', userId: userId});
    } catch (error) {
        if (error.detail.includes('email')) {
            res.status(400).send({ errorCode: 'EMAIL_TAKEN', message: 'This email-address is already taken.' });
        } else if (error.detail.includes('username')) {
            res.status(400).send({ errorCode: 'USERNAME_TAKEN', message: 'This username is already taken.' });
        } else {
            res.status(500).send({ message: 'An unexpected error occurred .' });
        }
        console.log(error.detail);

        //res.status(500).json({message: 'Registration failed', error});
    }
});

/**
 * Starts the server and listens on the specified port.
 */
app.listen(port, () => {
    console.log(`Server started on port ${port}`)
})