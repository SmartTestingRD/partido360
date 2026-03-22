const nodemailer = require('nodemailer');
const {
    buildWelcomeEmailHtml,
    buildResetPasswordHtml,
    buildPasswordChangedHtml,
    buildGoalAchievedHtml
} = require('./emailTemplates');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || '"Partido360 Admin" <noreply@partido360.com>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT == 465,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
});

async function sendMailWrapper(to, subject, htmlContent) {
    if (!SMTP_HOST || !SMTP_USER) {
        console.warn(`⚠️ MOCK EMAIL SENT to ${to}`);
        console.warn(`Subject: ${subject}`);
        console.warn(`HTML Length: ${htmlContent.length} chars (See emailTemplates.js)`);
        return true;
    }

    try {
        await transporter.sendMail({
            from: SMTP_FROM,
            to,
            subject,
            html: htmlContent,
        });
        return true;
    } catch (error) {
        console.error('Failed to send email:', error);
        throw error;
    }
}

/**
 * Enviar correo de bienvenida con credenciales
 */
async function sendWelcomeEmail(to, nombre, tempPassword) {
    const html = buildWelcomeEmailHtml(nombre, to, tempPassword);
    return sendMailWrapper(to, 'Bienvenido a CRM Político', html);
}

/**
 * Enviar correo de reseteo de contraseña
 */
async function sendPasswordResetEmail(to, plainToken) {
    const resetUrl = `${FRONTEND_URL}/#reset-password?token=${plainToken}`;
    const html = buildResetPasswordHtml(resetUrl);
    return sendMailWrapper(to, 'Partido360 - Restablece tu contraseña', html);
}

/**
 * Enviar correo de contraseña actualizada exitosamente
 */
async function sendPasswordChangedEmail(to) {
    const html = buildPasswordChangedHtml();
    return sendMailWrapper(to, 'Partido360 - Contraseña Modificada', html);
}

/**
 * Enviar correo de felicitación por meta cumplida
 */
async function sendGoalAchievedEmail(to, liderNombre, porcentaje, meta) {
    const html = buildGoalAchievedHtml(liderNombre, porcentaje, meta);
    return sendMailWrapper(to, '¡Felicidades! Meta de Registro Alcanzada', html);
}

module.exports = {
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendPasswordChangedEmail,
    sendGoalAchievedEmail
};
