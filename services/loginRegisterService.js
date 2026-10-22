const bcrypt = require("bcrypt");
const userQuery = require("../queries/users");
const folderQuery = require("../queries/folders");
const jwt = require("jsonwebtoken");
const authService = require("./authService");
const imageQuery = require("../queries/images");
const path = require("path");
const mailService = require("../services/mailService")
const {isAdmin} = require('./siteAccessService');

const JWT_SECRET = process.env.JWT_SECRET

const authenticate = async(req, res, adminOnly = false) => {
    const {username, encryptedPassword} = req.body || {};
    if (typeof username !== 'string' || typeof encryptedPassword !== 'string' ||
        !username.trim() || !/^[a-f0-9]{64}$/i.test(encryptedPassword)) {
        return res.status(400).json({errorCode: 'CREDENTIALS_INVALID', message: 'Username or password is incorrect.'});
    }
    res.set('Cache-Control', 'no-store');
    try {
        const user = await userQuery.getUserByUsername(username);
        if (!user || !await bcrypt.compare(encryptedPassword, user.password)) {
            return res.status(400).json({errorCode: 'CREDENTIALS_INVALID', message: 'Username or password is incorrect.'});
        }
        if (adminOnly && !isAdmin({status: 'success', permissionLevel: user.permissionlevel})) {
            return res.status(403).json({errorCode: 'ADMIN_REQUIRED', message: 'Administrator permissions are required.'});
        }
        const token = jwt.sign({sub: user.userid, username: user.username}, JWT_SECRET, {expiresIn: '14d'});
        res.status(200).json({token, username: user.username, userId: user.userid});
    } catch (error) {
        console.error('Login failed:', error.message);
        res.status(500).json({message: 'An unexpected error occurred.'});
    }
}

const login = (req, res) => authenticate(req, res);
const adminLogin = (req, res) => authenticate(req, res, true);

const register = async(req, res) => {
    const {email, username, encryptedPassword} = req.body;
    let userId

    try {
        const saltRounds = 10;
        console.log(encryptedPassword);
        const hashedPassword = await bcrypt.hash(encryptedPassword, saltRounds);
        console.log(hashedPassword);

        userId = await userQuery.addUserToDb(email, username, hashedPassword);

        await folderQuery.addDraftFolderToDb(userId);

        mailService.sendMail(userId.userid, username ,email);

        res.status(200).json({message: 'Registration successful', userId: userId});
    } catch (error) {
        if (error.detail.includes('email')) {
            res.status(400).send({ errorCode: 'EMAIL_TAKEN', message: 'This email-address is already taken.' });
        } else if (error.detail.includes('username')) {
            res.status(400).send({ errorCode: 'USERNAME_TAKEN', message: 'This username is already taken.' });
        } else {
            res.status(500).send({ message: 'An unexpected error occurred .' }); //TODO: add deletion when failed
        }
        await userQuery.removeUserById(userId);
        console.log(error.detail);
    }
}

const authorizeToken = async(request, response) => {
    await authService.authorizeToken(request.headers.authorization).then(async result => {
        if (result.status === 'error') {
            response.status(400).json({message: 'Token is invalid'});
        } else {
            response.set('Cache-Control', 'no-store').status(200).json({message: 'Token is valid',
                userId: result.userId, username: result.username, isAdmin: isAdmin(result)});
        }
    })
}

const emailVerified = async(req, res) => {
    await authService.authorizeToken(req.headers.authorization).then(async result => {
        if (result.status === 'error') {
            res.status(400).json({message: 'Token is invalid'});
        } else {
            res.status(200).json({message: 'Email verification status', verificationStatus: await userQuery.isUserVerified(result.userId)});
        }
    })
}

module.exports = {
    login,
    adminLogin,
    register,
    authorizeToken,
    emailVerified
}
