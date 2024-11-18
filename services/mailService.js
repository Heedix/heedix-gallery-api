const nodemailer = require('nodemailer');
const JWT_SECRET = process.env.JWT_SECRET;
const MAIL_PASSWORD =  process.env.MAIL_PASSWORD;

const jwt = require('jsonwebtoken');

// Generiere einen Token
const token = jwt.sign(
    { userId: user.id },
    JWT_SECRET,
    { expiresIn: '1h' }
);

// Konfiguration
const transporter = nodemailer.createTransport({
    host: 'mail.mailtwo24.de', // Hostname deines E-Mail-Servers
    port: 587,                  // Standard-Port für STARTTLS
    secure: true,              // true für Port 465, false für andere Ports
    auth: {
        user: 'admin@heedix.de', // Dein E-Mail-Benutzername
        pass: MAIL_PASSWORD               // Dein Passwort
    }
});

// E-Mail versenden
const mailOptions = {
    from: 'dein-email@gmail.com',
    to: 'jannis.austgen@gmail.com',
    subject: 'E-Mail-Verifizierung',
    html: `
    <h3>Verifiziere deine E-Mail</h3>
    <p>Klicke auf den folgenden Link, um deine E-Mail zu verifizieren:</p>
    <a href="https://heedix.de/verify?token=${token}">
      Jetzt verifizieren
    </a>
  `
};

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.error(error);
    } else {
        console.log('E-Mail gesendet: ' + info.response);
    }
});
