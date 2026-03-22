require('dotenv').config();
const { pool } = require('../src/config/db');
const bcrypt = require('bcryptjs');

const email = 'ejguerrero@smarttestingrd.com';
const new_password = 'Password123!';

async function resetPassword() {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);

        // reset password, login attempts, and unlock account
        const res = await pool.query(
            `UPDATE usuarios 
       SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL 
       WHERE email_login = $2 
       RETURNING usuario_id`,
            [hashedPassword, email]
        );

        if (res.rowCount > 0) {
            console.log(`Password for ${email} reset successfully to: ${new_password}`);
        } else {
            console.log(`User ${email} not found`);
        }
    } catch (err) {
        console.error('Error resetting password:', err);
    } finally {
        process.exit();
    }
}

resetPassword();
