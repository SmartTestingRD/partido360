const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { JWT_SECRET, normalizeRole, authenticate } = require('../middleware/auth');
const { sendPasswordResetEmail, sendPasswordChangedEmail } = require('../services/emailService');

// --- Rate Limiters ---
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // Límite de 10 intentos de login por IP
    message: { ok: false, code: 'TOO_MANY_REQUESTS', message: 'Demasiados intentos de inicio de sesión desde esta IP. Intenta más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // Máximo 3 solicitudes por IP
    message: { ok: true, message: 'Si el usuario existe, recibirá un correo con las instrucciones para restablecer su contraseña.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * POST /api/auth/login
 */
router.post('/login', loginLimiter, async (req, res, next) => {
    try {
        const { login, password } = req.body;

        if (!login || !password) {
            return res.status(400).json({
                ok: false, code: 'VALIDATION_ERROR',
                message: 'login y password son requeridos'
            });
        }

        // Buscar el usuario
        const result = await pool.query(
            `SELECT
u.usuario_id, u.persona_id, u.password_hash,
    u.failed_login_attempts, u.locked_until,
    p.nombres || ' ' || p.apellidos AS nombre_completo,
        r.nombre AS rol_nombre_db,
            eu.nombre AS estado_usuario_nombre
             FROM usuarios u
             JOIN personas p       ON u.persona_id = p.persona_id
             JOIN roles r          ON u.rol_id = r.rol_id
             JOIN estado_usuario eu ON u.estado_usuario_id = eu.estado_usuario_id
             WHERE u.email_login = $1 OR u.username = $1
             LIMIT 1`,
            [login]
        );

        if (result.rows.length === 0) {
            // Emular tiempo de bcrypt para mitigar timing attacks
            await bcrypt.compare(password, '$2a$10$somesaltxxxxxxxxxxxxxxxxxxxxxx');
            return res.status(401).json({ ok: false, code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas' });
        }

        const user = result.rows[0];

        // 1. Validar si está bloqueado por intentos
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            return res.status(423).json({ ok: false, code: 'ACCOUNT_LOCKED', message: 'Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intenta más tarde.' });
        }

        // 2. Estado de usuario Activo
        if (user.estado_usuario_nombre !== 'Activo') {
            return res.status(403).json({ ok: false, code: 'USER_INACTIVE', message: 'Usuario inactivo o bloqueado por el administrador' });
        }

        // 3. Verificar password
        if (!user.password_hash) {
            return res.status(401).json({ ok: false, code: 'NO_PASSWORD', message: 'Este usuario no tiene contraseña configurada' });
        }

        const passwordOk = await bcrypt.compare(password, user.password_hash);

        if (!passwordOk) {
            // Incrementar intentos fallidos
            const failedAttempts = (user.failed_login_attempts || 0) + 1;
            if (failedAttempts >= 5) {
                // Bloquear cuenta por 15 minutos
                await pool.query(
                    `UPDATE usuarios SET failed_login_attempts = $1, locked_until = NOW() + INTERVAL '15 minutes' WHERE usuario_id = $2`,
                    [failedAttempts, user.usuario_id]
                );
                return res.status(423).json({ ok: false, code: 'ACCOUNT_LOCKED', message: 'Cuenta bloqueada temporalmente por múltiples intentos fallidos.' });
            } else {
                await pool.query(
                    `UPDATE usuarios SET failed_login_attempts = $1 WHERE usuario_id = $2`,
                    [failedAttempts, user.usuario_id]
                );
                return res.status(401).json({ ok: false, code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas' });
            }
        }

        // Login Exitoso — resetear contadores y actualizar last_login_at
        await pool.query(
            `UPDATE usuarios SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW(), ultimo_login = NOW() WHERE usuario_id = $1`,
            [user.usuario_id]
        );

        const rol_nombre = normalizeRole(user.rol_nombre_db);

        // Emitir JWT
        const jwtPayload = { usuario_id: user.usuario_id, persona_id: user.persona_id, rol_nombre };

        // Resolver lider_id si es LIDER
        let lider_id = null;
        if (rol_nombre === 'LIDER') {
            const liderRes = await pool.query('SELECT lider_id FROM lideres WHERE persona_id = $1 LIMIT 1', [user.persona_id]);
            if (liderRes.rows.length > 0) {
                lider_id = liderRes.rows[0].lider_id;
                jwtPayload.lider_id = lider_id;
            } else {
                return res.status(403).json({ ok: false, code: 'USER_NOT_LIDER', message: 'Usuario marcado como LIDER pero sin registro de líder asociado' });
            }
        }

        const token = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: '24h' });

        return res.json({
            ok: true,
            data: {
                token,
                user: {
                    usuario_id: user.usuario_id,
                    persona_id: user.persona_id,
                    nombre_completo: user.nombre_completo,
                    rol_nombre,
                    lider_id
                }
            }
        });

    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', forgotPasswordLimiter, async (req, res, next) => {
    try {
        const { login } = req.body;

        // Por seguridad, SIEMPRE devolvemos el mismo 200 aunque el usuario no exista
        const successMessage = { ok: true, message: 'Si el usuario existe, recibirá un correo con las instrucciones para restablecer su contraseña.' };

        if (!login) {
            return res.status(200).json(successMessage);
        }

        const userRes = await pool.query(
            `SELECT u.usuario_id, u.email_login, eu.nombre AS estado 
             FROM usuarios u 
             JOIN estado_usuario eu ON u.estado_usuario_id = eu.estado_usuario_id
WHERE(u.email_login = $1 OR u.username = $1)
             LIMIT 1`,
            [login]
        );

        if (userRes.rows.length === 0) {
            return res.status(200).json(successMessage);
        }

        const user = userRes.rows[0];

        // Solo procesamos si el email no es nulo y la cuenta está activa
        if (user.estado === 'Activo' && user.email_login) {
            // Generar token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

            // Guardar el hash en base de datos. Expira en 30 minutos.
            await pool.query(
                `INSERT INTO password_resets(usuario_id, token_hash, expires_at)
                 VALUES($1, $2, NOW() + INTERVAL '30 minutes')`,
                [user.usuario_id, tokenHash]
            );

            // Enviar correo
            sendPasswordResetEmail(user.email_login, resetToken).catch(e => console.error(e));
        }

        return res.status(200).json(successMessage);

    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/auth/reset-password
 */
router.post('/reset-password', async (req, res, next) => {
    try {
        const { token, new_password } = req.body;

        if (!token || !new_password) {
            return res.status(400).json({ ok: false, code: 'VALIDATION_ERROR', message: 'token y new_password son requeridos' });
        }

        // Validar política de contraseña (mínimo 8 chars, 1 mayúscula, 1 número)
        if (new_password.length < 8 || !/[A-Z]/.test(new_password) || !/[0-9]/.test(new_password)) {
            return res.status(400).json({
                ok: false,
                code: 'WEAK_PASSWORD',
                message: 'La contraseña debe tener al menos 8 caracteres, 1 mayúscula y 1 número'
            });
        }

        // Hashing the token exactly as we did when creating it
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Buscar token válido
        const resetRes = await pool.query(
            `SELECT p.reset_id, p.usuario_id, u.email_login 
             FROM password_resets p
             JOIN usuarios u ON u.usuario_id = p.usuario_id
             WHERE p.token_hash = $1 AND p.used_at IS NULL AND p.expires_at > NOW()
             LIMIT 1`,
            [tokenHash]
        );

        if (resetRes.rows.length === 0) {
            return res.status(400).json({ ok: false, code: 'INVALID_OR_EXPIRED_TOKEN', message: 'Enlace inválido o expirado' });
        }

        const resetData = resetRes.rows[0];

        // Hashear nueva pass
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Actualizar contraseña y resetear bloqueos
            await client.query(
                `UPDATE usuarios 
                 SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL 
                 WHERE usuario_id = $2`,
                [hashedPassword, resetData.usuario_id]
            );

            // 2. Marcar token como usado
            await client.query(
                `UPDATE password_resets SET used_at = NOW() WHERE reset_id = $1`,
                [resetData.reset_id]
            );

            await client.query('COMMIT');
        } catch (txnErr) {
            await client.query('ROLLBACK');
            throw txnErr;
        } finally {
            client.release();
        }

        // Enviar correo de confirmación
        if (resetData.email_login) {
            sendPasswordChangedEmail(resetData.email_login)
                .catch(err => console.error("Error enviando email de password cambiado:", err));
        }

        res.json({ ok: true, message: 'Contraseña actualizada exitosamente' });

    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/auth/me
 * Retorna datos del usuario autenticado actual.
 */
router.get('/me', authenticate, async (req, res, next) => {
    try {
        const { usuario_id, persona_id, rol_nombre, lider_id } = req.user;

        const userRes = await pool.query(
            `SELECT p.nombres || ' ' || p.apellidos AS nombre_completo, u.email_login, u.username
             FROM usuarios u
             JOIN personas p ON u.persona_id = p.persona_id
             WHERE u.usuario_id = $1`,
            [usuario_id]
        );

        if (userRes.rows.length === 0) {
            return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
        }

        const dbUser = userRes.rows[0];

        res.json({
            ok: true,
            data: {
                usuario_id,
                persona_id,
                rol_nombre,
                lider_id,
                nombre_completo: dbUser.nombre_completo,
                email_login: dbUser.email_login,
                username: dbUser.username
            }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
