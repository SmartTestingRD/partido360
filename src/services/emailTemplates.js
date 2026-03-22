/**
 * Plantillas de Correo HTML basadas en el diseño UI/correo.html
 */

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

function getEmailWrapper(title, subtitle, contentHtml) {
    const year = new Date().getFullYear();
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>${title}</title>
    <style>
        body { font-family: 'Inter', 'Segoe UI', sans-serif; background-color: #f6f7f8; color: #1e293b; margin: 0; padding: 0; }
        .wrapper { width: 100%; padding: 40px 15px; background-color: #f6f7f8; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
        .header { background-color: #f8fafc; padding: 24px; text-align: center; border-bottom: 1px solid #f1f5f9; }
        .logo-box { display: inline-flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px; }
        .logo-icon { width: 32px; height: 32px; background-color: #136dec; border-radius: 8px; color: white; line-height: 32px; display: inline-block; font-weight: bold; }
        .brand-text { font-weight: 700; font-size: 18px; color: #1e293b; letter-spacing: -0.5px; }
        .subtitle { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 500; margin: 0; }
        .body { padding: 32px; }
        .footer { background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9; }
        .footer-text { font-size: 11px; color: #94a3b8; margin: 0 0 12px 0; }
        .btn-primary { display: inline-block; padding: 12px 32px; background-color: #136dec; color: #ffffff !important; font-weight: 600; text-decoration: none; border-radius: 9999px; text-align: center; }
        .btn-primary:hover { background-color: #105bc5; }
        .callout { display: flex; align-items: center; gap: 12px; padding: 12px; background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: 8px; margin-bottom: 24px; }
        .callout-title { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px 0; }
        .callout-value { color: #136dec; font-weight: 700; font-size: 14px; margin: 0; }
        .table-wrap { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 24px; }
        .table-header { background-color: #f8fafc; padding: 8px 16px; border-bottom: 1px solid #e2e8f0; }
        .table-header h3 { margin: 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; }
        td:first-child { color: #64748b; font-weight: 500; width: 35%; }
        td:last-child { color: #1e293b; font-weight: 600; }
        tr:last-child td { border-bottom: none; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <div class="logo-box">
                    <div class="logo-icon">&#x2713;</div>
                    <span class="brand-text">VOTO SEGURO</span>
                </div>
                <p class="subtitle">${subtitle}</p>
            </div>
            
            <div class="body">
                ${contentHtml}
            </div>

            <div class="footer">
                <p class="footer-text">CRM Político ${year}. Todos los derechos reservados.</p>
                <div style="font-size: 10px; color: #94a3b8;">
                    Este correo es generado automáticamente.
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
}

function buildWelcomeEmailHtml(nombre, email, tempPassword) {
    const loginUrl = `${FRONTEND_URL}/#login`;
    const content = `
        <p style="font-size: 18px; font-weight: 600; margin-top: 0; margin-bottom: 16px; color: #1e293b;">Hola, ${nombre}</p>
        <p style="color: #475569; line-height: 1.6; margin-bottom: 24px;">
            Te damos la bienvenida al CRM Político. Se ha creado una cuenta de usuario para ti.
            Utiliza las siguientes credenciales temporales para ingresar al sistema. Te recomendamos cambiar tu contraseña al iniciar sesión.
        </p>

        <div class="callout">
            <div>
                <p class="callout-title">Tus Credenciales</p>
                <p class="callout-value" style="color: #0f172a; margin-top: 8px;">Usuario / Correo: <span style="font-weight: normal;">${email}</span></p>
                <p class="callout-value" style="color: #0f172a; margin-top: 4px;">Contraseña: <span style="font-family: monospace; font-size: 16px; background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${tempPassword}</span></p>
            </div>
        </div>

        <div style="text-align: center; margin-bottom: 24px; margin-top: 32px;">
            <a href="${loginUrl}" class="btn-primary">Iniciar Sesión</a>
        </div>
        
        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; display: flex; gap: 12px; align-items: flex-start;">
            <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0;">Si no solicitaste esta cuenta, por favor notifícalo a tu coordinador o administrador del sistema.</p>
        </div>
    `;
    return getEmailWrapper('Bienvenido a CRM Político', 'Sistema de Gestión Electoral', content);
}

function buildResetPasswordHtml(resetUrl) {
    const content = `
        <p style="font-size: 18px; font-weight: 600; margin-top: 0; margin-bottom: 16px; color: #1e293b;">Restablecer Contraseña</p>
        <p style="color: #475569; line-height: 1.6; margin-bottom: 24px;">
            Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente botón para crear una nueva.
        </p>

        <div class="callout">
            <div>
                <p class="callout-title">Atención</p>
                <p class="callout-value" style="color: #0f172a;">Este enlace expirará en 30 minutos por motivos de seguridad.</p>
            </div>
        </div>

        <div style="text-align: center; margin-bottom: 24px; margin-top: 32px;">
            <a href="${resetUrl}" class="btn-primary">Cambiar Mi Contraseña</a>
        </div>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
            <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0; margin-bottom: 8px;">Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>
            <p style="font-size: 11px; word-break: break-all; color: #136dec; margin: 0;">${resetUrl}</p>
        </div>
    `;
    return getEmailWrapper('Restablecer tu contraseña', 'Sistema de Gestión Electoral', content);
}

function buildPasswordChangedHtml() {
    const loginUrl = `${FRONTEND_URL}/#login`;
    const content = `
        <p style="font-size: 18px; font-weight: 600; margin-top: 0; margin-bottom: 16px; color: #1e293b;">Contraseña Actualizada</p>
        <p style="color: #475569; line-height: 1.6; margin-bottom: 24px;">
            Te confirmamos que la contraseña de tu cuenta ha sido modificada con éxito.
        </p>

        <div style="text-align: center; margin-bottom: 24px; margin-top: 32px;">
            <a href="${loginUrl}" class="btn-primary">Ir al Área de Ingreso</a>
        </div>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
            <p style="font-size: 12px; color: #ef4444; line-height: 1.5; margin: 0;">Si tú no realizaste este cambio, contacta de inmediato con el administrador del sistema ya que tu cuenta podría estar comprometida.</p>
        </div>
    `;
    return getEmailWrapper('Contraseña Modificada', 'Sistema de Gestión Electoral', content);
}

function buildGoalAchievedHtml(liderNombre, porcentaje, meta) {
    const isOver = porcentaje >= 100;
    const titulo = isOver ? '¡Meta Cumplida!' : 'Avance de Meta';
    const content = `
        <p style="font-size: 18px; font-weight: 600; margin-top: 0; margin-bottom: 16px; color: #1e293b;">Hola, ${liderNombre}</p>
        <p style="color: #475569; line-height: 1.6; margin-bottom: 24px;">
            ${isOver
            ? '¡Felicidades! Has alcanzado exitosamente la meta de registro asignada. Este es un paso fundamental para consolidar el apoyo ciudadano.'
            : 'Queremos informarte sobre el estado actual de cumplimiento de la meta de validaciones y registro de tu perfil.'}
        </p>

        <div class="callout" style="background-color: ${isOver ? '#f0fdf4' : '#eff6ff'}; border-color: ${isOver ? '#bbf7d0' : '#dbeafe'};">
            <div>
                <p class="callout-title">Estado de la Meta</p>
                <p class="callout-value" style="color: ${isOver ? '#16a34a' : '#136dec'}; font-size: 18px;">${porcentaje.toFixed(2)}% Completado</p>
            </div>
        </div>

        <div class="table-wrap">
            <div class="table-header">
                <h3>Detalles de la Gestión</h3>
            </div>
            <table>
                <tbody>
                    <tr>
                        <td>Meta Original</td>
                        <td>${meta} militantes</td>
                    </tr>
                    <tr>
                        <td>Progreso</td>
                        <td>${porcentaje.toFixed(2)}%</td>
                    </tr>
                    <tr>
                        <td>Estatus</td>
                        <td style="color: ${isOver ? '#16a34a' : '#ea580c'};">${isOver ? 'Completada' : 'En Progreso'}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div style="text-align: center; margin-bottom: 24px; margin-top: 24px;">
            <a href="${FRONTEND_URL}/#dashboard" class="btn-primary">Ver Panel de Control</a>
        </div>
    `;
    return getEmailWrapper(titulo, 'Sistema Territorial', content);
}

module.exports = {
    buildWelcomeEmailHtml,
    buildResetPasswordHtml,
    buildPasswordChangedHtml,
    buildGoalAchievedHtml
};
