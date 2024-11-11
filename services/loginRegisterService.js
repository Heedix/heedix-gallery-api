const bcrypt = require("bcrypt");
const userQuery = require("../queries/users");
const jwt = require("jsonwebtoken");


const login = async(req, res) => {
    const {username, encryptedPassword} = req.body;

    const users = await userQuery.getUserByUsername(username);
    const user = users[0];

    if (user) {
        const isMatch = await bcrypt.compare(encryptedPassword, user.password);

        if (isMatch) {
            const token = jwt.sign({ sub: user.userid, username: user.username}, JWT_SECRET, { expiresIn: '3h' });
            res.status(200).json({token});
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

module.exports = {
    login,
    register
}