const express = require('express');
const cors = require('cors')
const app = express();
const port = 3000
const db = require('./queries')

const multer = require('multer');
const path = require('path');

app.options('*', cors())
app.use(
    cors({
        origin: "*",
        credentials: true,
        allowedHeaders: true,
    })
);

app.get('/images', db.getImages)
app.get('/images/:id', db.getImageById)
app.put('/images/:imageid', db.updateImage)


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

// Statische Dateien bereitstellen
app.use('/uploads', express.static('uploads'));


//login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    // Überprüfe den Benutzer in der Datenbank
    if (username === 'admin' && password === 'admin') {
        res.status(200).json({ token: 'fake-jwt-token' });
    } else {
        res.status(400).json({ message: 'Ungültige Anmeldeinformationen' });
    }
});


app.listen(port, () => {
    console.log(`Server started on port ${port}`)
})