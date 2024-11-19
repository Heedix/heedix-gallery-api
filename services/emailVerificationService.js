const userQuery = require('../queries/users');
const {verify} = require("jsonwebtoken");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

const verifyEmail = async (req, res) => {
    const {token} = req.query;

    try {
        const decoded = await new Promise((resolve, reject) => {
            jwt.verify(token, JWT_SECRET, (err, decoded) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(decoded);
                }
            });
        });
        const userId = await decoded.sub;;

        await userQuery.verifyUser(userId);

        res.status(200).json({message: 'E-Mail successfully verified.'});
    } catch (error) {
        console.log('token invalid')
        res.status(400).json({errorCode: 'TOKEN_INVALID', message: 'The provided token is invalid.'});
    }
}

module.exports = {
    verifyEmail
}