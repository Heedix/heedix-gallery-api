const express = require('express');
const cors = require('cors')
const app = express();
const port = 3000
const db = require('./queries')

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

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})