const express = require('express');
const cors = require('cors')
const app = express();
const port = 3000
const imageQuery = require('./queries/images')
const userQuery = require('./queries/users')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const multer = require('multer');
const path = require('path');

const JWT_SECRET = 'your_secret_key'; //TODO Secret erstellen

app.options('*', cors())
app.use(express.json());
app.use(
    cors({
        origin: "*",
        credentials: true,
        allowedHeaders: true,
    })
);

app.get('/images', imageQuery.getImages)
app.get('/images/:id', imageQuery.getImageById)
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

// Statische Dateien bereitstellen
app.use('/uploads', express.static('uploads'));

//const users = []; //TODO Löschen

//login
app.post('/api/auth/login', async (req, res) => {
    const {username, encryptedPassword} = req.body;

    const user = await userQuery.getUserByUsername(username);

    if (user) {
        const isMatch = await bcrypt.compare(encryptedPassword, user[0].password);

        if (isMatch) {
            const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '1h' });
            // Wenn das Passwort korrekt ist, erstelle ein Token (hier ein Fake-JWT-Token als Beispiel)
            res.status(200).json({token});
        } else {
            res.status(400).json({message: 'Ungültige Anmeldeinformationen'});
        }
    } else {
        res.status(400).json({message: 'Benutzer nicht gefunden'});
    }
});

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

app.get('/api/protected', authenticateToken, (req, res) => {
    res.status(200).json({ message: `Willkommen, ${req.user.username}!` });
});


app.post('/api/register', async (req, res) => {
    const {email, username, encryptedPassword} = req.body;

    try {
        const saltRounds = 10;
        console.log(encryptedPassword);
        const hashedPassword = await bcrypt.hash(encryptedPassword, saltRounds);
        console.log(hashedPassword);

        // Speichere den neuen Benutzer mit dem gehashten Passwort (hier in einem Array simuliert)
        users.push({email, username, password: hashedPassword}); //TODO Datenbank
        console.log(users); // Zum Überprüfen der Benutzerdaten

        res.status(200).json({message: 'Registrierung erfolgreich'});
    } catch (error) {
        res.status(500).json({message: 'Fehler bei der Registrierung', error});
    }
});


app.listen(port, () => {
    console.log(`Server started on port ${port}`)
})