const bcrypt = require("bcrypt");
const userQuery = require("../queries/users");
const jwt = require("jsonwebtoken");
const authService = require("./authService");
const imageQuery = require("../queries/images");
const path = require("path");
const mailService = require("../services/mailService")

const JWT_SECRET = process.env.JWT_SECRET

const login = async(req, res) => {
    const {username, encryptedPassword} = req.body;

    const user = await userQuery.getUserByUsername(username);

    if (user) {
        const isMatch = await bcrypt.compare(encryptedPassword, user.password);

        if (isMatch) {
            const token = jwt.sign({ sub: user.userid, username: user.username}, JWT_SECRET, { expiresIn: '3h' });
            res.status(200).json({token: token, username: user.username});
        } else {
            res.status(400).json({errorCode: 'CREDENTIALS_INVALID', message: 'Username or password is incorrect.'});
            console.log('Password is wrong.')
        }
    } else {
        res.status(400).json({errorCode: 'CREDENTIALS_INVALID', message: 'Username or password is incorrect.'});
        console.error('User not found')
    }
}

const register = async(req, res) => {
    const {email, username, encryptedPassword} = req.body;

    try {
        const saltRounds = 10;
        console.log(encryptedPassword);
        const hashedPassword = await bcrypt.hash(encryptedPassword, saltRounds);
        console.log(hashedPassword);

        let userId = await userQuery.addUserToDb(email, username, hashedPassword);

        mailService.sendMail(userId.userid, username ,email);

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
    }
}

const authorizeToken = async(request, response) => {
    await authService.authorizeToken(request.headers.authorization).then(async result => {
        if (result.status === 'error') {
            response.status(400).json({message: 'Token is invalid'});
        } else {
            response.status(200).json({message: 'Token in valid', userId: result.userId});
        }
    })
}

const emailVerified = async(req, res) => {
    await authService.authorizeToken(res.headers.authorization).then(async result => {
        if (result.status === 'error') {
            res.status(400).json({message: 'Token is invalid'});
        } else {
            res.status(200).json({message: 'Email verification status', userId: await userQuery.isUserVerified(result.userId)});
        }
    })
}

module.exports = {
    login,
    register,
    authorizeToken,
    emailVerified
}