import env from '../../config/env';
import { EmailParams } from './EmailProviderInterface';

/**
 * Plantillas de correo (asunto, HTML y texto plano) independientes del
 * proveedor que las envía. Son funciones puras: reciben los `EmailParams`
 * y devuelven strings, así se pueden probar sin red.
 */

/** Logo público y estable del frontend (no depende del hash de Vite). */
const logoUrl = (): string => `${env.frontendUrl}/icon-512.png`;

/** Primer nombre para saludar en la tarjeta ("Valentina Pérez" -> "Valentina"). */
const firstName = (fullName: string): string =>
  (fullName || '').trim().split(/\s+/)[0] || fullName;

/** Escapa texto que viene de la base de datos antes de interpolarlo en HTML. */
const escapeHtml = (value: string | number | null | undefined): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const buildSubject = (params: EmailParams): string => {
  switch (params.type) {
    case 'registration_request':
      return `Nueva Solicitud de Registro - ${params.toName}`;
    case 'approval':
      return `¡Solicitud Aprobada! - Bienvenido a JA Manager`;
    case 'rejection':
      return `Solicitud de Registro - Actualización`;
    case 'birthday':
      return `¡Feliz cumpleaños, ${firstName(params.toName)}! Tienes ${params.birthdayPoints || 100} puntos de regalo`;
    case 'welcome':
      return `¡Bienvenido a JA Manager! - Cuenta creada exitosamente`;
    case 'new_user_notification':
      return `Nuevo Usuario Registrado - ${params.applicantName || params.toName}`;
    default:
      return params.subject || params.message;
  }
};

/* ------------------------------------------------------------------------ */
/* Tarjeta de cumpleaños                                                    */
/* ------------------------------------------------------------------------ */

const birthdayCtaUrl = (params: EmailParams): string =>
  params.birthdayCtaUrl ||
  (params.placa
    ? `${env.frontendUrl}/login?placa=${encodeURIComponent(params.placa)}`
    : `${env.frontendUrl}/login`);

const generateBirthdayText = (params: EmailParams): string => {
  const points = params.birthdayPoints || 100;
  const lines = [
    `¡Feliz cumpleaños, ${firstName(params.toName)}!`,
    '',
    'Desde el Ministerio Juvenil Modelia te enviamos un fuerte abrazo y nuestros mejores deseos en este día tan especial. Que Dios siga guiando tu vida y llenándola de bendiciones.',
    '',
    `Tienes ${points} puntos de regalo. Ya están cargados en tu cuenta: súmalos al ranking de esta temporada.`,
    '',
    `Visita el sitio: ${birthdayCtaUrl(params)}`,
  ];
  if (params.placa) {
    lines.push(`Entra con tu placa ${params.placa}. Si ya tienes la sesión abierta, te llevamos directo a tu panel.`);
  }
  lines.push('', 'Jóvenes Modelia Bogotá · Ministerio Juvenil Modelia');
  return lines.join('\n');
};

/**
 * Iniciales para el avatar cuando el joven no tiene foto: primera letra del
 * primer nombre y primera del último apellido ("Valentina Pérez" -> "VP").
 * Con un solo nombre devuelve una sola letra.
 */
export const getInitials = (fullName: string): string => {
  const words = (fullName || '')
    .split(/\s+/)
    .map(word => Array.from(word).find(ch => /\p{L}/u.test(ch)) || '')
    .filter(Boolean);
  if (words.length === 0) return '';
  const letters = words.length === 1 ? [words[0]] : [words[0], words[words.length - 1]];
  return letters.join('').toLocaleUpperCase('es');
};

/**
 * URL de la foto lista para correo. Si está en Cloudinary pide un recorte
 * cuadrado centrado en la cara y en JPG (algunos clientes no leen WebP);
 * cualquier otra URL se usa tal cual.
 */
export const avatarPhotoUrl = (url?: string | null): string | null => {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  const marker = '/image/upload/';
  if (/^https?:\/\/res\.cloudinary\.com\//i.test(url) && url.includes(marker)) {
    return url.replace(marker, `${marker}c_fill,g_face,w_240,h_240,f_jpg,q_auto/`);
  }
  return url;
};

/** Círculo de 118px con aro dorado: foto del joven o sus iniciales. */
const birthdayAvatar = (params: EmailParams): string => {
  const photo = avatarPhotoUrl(params.profileImage);
  const ring =
    'background-color:#F9A23B; border-radius:59px; width:118px; height:118px; padding:0;';
  if (photo) {
    return `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
                <tr>
                  <td align="center" valign="middle" width="118" height="118" bgcolor="#F9A23B" style="${ring}">
                    <img src="${escapeHtml(photo)}" width="106" height="106" alt="${escapeHtml(params.toName)}" style="display:block; width:106px; height:106px; border-radius:53px; border:0; background-color:#FFF8F1;">
                  </td>
                </tr>
              </table>`;
  }
  const initials = escapeHtml(getInitials(params.toName));
  return `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
                <tr>
                  <td align="center" valign="middle" width="118" height="118" bgcolor="#F9A23B" style="${ring}">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                      <tr>
                        <td align="center" valign="middle" width="106" height="106" bgcolor="#FFF8F1" style="width:106px; height:106px; border-radius:53px; background-color:#FFF8F1; font-family:Arial, Helvetica, sans-serif; font-size:46px; line-height:106px; font-weight:bold; color:#8A1C45;">${initials}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>`;
};

/**
 * Tarjeta de cumpleaños. Maquetada con tablas y estilos inline porque Gmail
 * ignora <style> en gran parte y no carga fuentes web ni SVG: la decoración
 * (degradado, confeti y globos) viene en un JPG de fondo con color de
 * respaldo (ver frontend/scripts/generate-email-assets.mjs).
 */
const generateBirthdayTemplate = (params: EmailParams): string => {
  const name = escapeHtml(firstName(params.toName));
  const points = escapeHtml(params.birthdayPoints || 100);
  const placa = params.placa ? escapeHtml(params.placa) : '';
  const ctaUrl = escapeHtml(birthdayCtaUrl(params));
  const headerBg = `${env.frontendUrl}/email/birthday-header.jpg`;
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>¡Feliz cumpleaños, ${name}!</title>
</head>
<body style="margin:0; padding:0; background-color:#FFF8F1;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">Tienes ${points} puntos de regalo ya cargados en tu cuenta.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFF8F1" style="background-color:#FFF8F1;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:600px; background-color:#FFFFFF; border-radius:20px; overflow:hidden; font-family:Arial, Helvetica, sans-serif; color:#140B10;">

          <!-- Cabecera -->
          <tr>
            <td align="center" valign="top" bgcolor="#7A1B40" background="${headerBg}" style="background-color:#7A1B40; background-image:url('${headerBg}'); background-size:cover; background-position:center; padding:40px 24px 34px;">
              ${birthdayAvatar(params)}
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:18px auto 0;">
                <tr>
                  <td align="center" valign="middle" width="34" height="34" bgcolor="#FFF8F1" style="width:34px; height:34px; border-radius:10px; background-color:#FFF8F1;">
                    <img src="${env.frontendUrl}/icon-512.png" width="26" height="26" alt="" style="display:block; width:26px; height:26px; border:0; margin:0 auto;">
                  </td>
                  <td style="padding-left:12px; font-size:15px; letter-spacing:4px; text-transform:uppercase; color:#FFE4C7; font-weight:bold;">Jóvenes Modelia Bogotá</td>
                </tr>
              </table>
              <h1 style="margin:14px 0 0; font-size:46px; line-height:1.05; color:#FFFFFF; font-weight:bold;">¡Feliz cumpleaños!</h1>
              <p style="margin:6px 0 0; font-size:34px; line-height:1.15; color:#F9A23B; font-weight:bold;">${name}</p>
            </td>
          </tr>

          <!-- Contenido -->
          <tr>
            <td style="padding:32px 40px 36px;">
              <p style="margin:0 0 26px; font-size:17px; line-height:1.65; color:#140B10; text-align:center;">
                Hoy toda la familia del <strong>Ministerio Juvenil Modelia</strong> celebra tu vida. Gracias por ser parte de este grupo, ¡Dios te bendiga en este nuevo año!
              </p>

              <!-- Cupón de puntos -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;">
                <tr>
                  <td bgcolor="#F9A23B" style="background-color:#F9A23B; background-image:linear-gradient(135deg, #FFE4C7 0%, #F9A23B 100%); border-radius:18px; padding:8px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;">
                      <tr>
                        <td align="center" style="border:2px dashed #8A1C45; border-radius:12px; padding:20px 16px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                            <tr>
                              <td valign="middle" style="padding-right:20px; font-size:78px; line-height:1; font-weight:bold; color:#8A1C45;">${points}</td>
                              <td valign="middle" align="left">
                                <div style="font-size:22px; line-height:1.15; font-weight:bold; color:#4E0F3A; text-transform:uppercase; letter-spacing:1px;">Puntos de regalo</div>
                                <div style="margin-top:4px; font-size:15px; line-height:1.4; color:#4E0F3A;">Ya están en tu cuenta, esperándote.</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Botón -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:26px;">
                <tr>
                  <td align="center" bgcolor="#B3243B" style="background-color:#B3243B; background-image:linear-gradient(90deg, #C2410F 0%, #B3243B 55%, #8A1C45 100%); border-radius:14px;">
                    <a href="${ctaUrl}" style="display:block; padding:19px 32px; font-size:19px; font-weight:bold; color:#FFFFFF; text-decoration:none;">Visitar el sitio</a>
                  </td>
                </tr>
              </table>

              <p style="margin:16px 0 0; font-size:14px; line-height:1.5; color:#5B4A50; text-align:center;">
                ${placa ? `Entra con tu placa <strong style="color:#8A1C45;">${placa}</strong>. ` : ''}Si ya tienes la sesión abierta, te llevamos directo a tu panel.
              </p>
            </td>
          </tr>

          <!-- Pie -->
          <tr>
            <td align="center" bgcolor="#4E0F3A" style="background-color:#4E0F3A; padding:22px 36px;">
              <p style="margin:0; font-size:15px; font-weight:bold; color:#FFF8F1;">Jóvenes Modelia Bogotá</p>
              <p style="margin:4px 0 0; font-size:13px; color:#E8D6DD;">Ministerio Juvenil Modelia · jovenesmodelia.com · ${year}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

/* ------------------------------------------------------------------------ */
/* Plantillas heredadas (registro, aprobación, rechazo, bienvenida, admin)  */
/* ------------------------------------------------------------------------ */

const generateTextContent = (params: EmailParams): string => {
  switch (params.type) {
    case 'registration_request':
      return `Nueva Solicitud de Registro\n\nHola Administrador,\n\nSe ha recibido una nueva solicitud de registro:\n\nNombre: ${params.toName}\nEmail: ${params.toEmail}\n${params.placa ? `Placa: ${params.placa}\n` : ''}\nFecha: ${new Date().toLocaleDateString('es-CO')}\n\nPor favor, revisa la solicitud en el panel de administración.`;
    case 'approval':
      return `¡Solicitud Aprobada!\n\nHola ${params.toName},\n\nTu solicitud de registro ha sido aprobada.\n\nPlaca asignada: ${params.placa || 'N/A'}\nEmail: ${params.toEmail}\n\n¡Bienvenido a la familia juvenil!`;
    case 'rejection':
      return `Solicitud Rechazada\n\nHola ${params.toName},\n\nTu solicitud de registro ha sido rechazada.\n\n${params.rejectionReason ? `Razón: ${params.rejectionReason}\n` : ''}\nSi tienes alguna pregunta, contacta con el administrador.`;
    case 'birthday':
      return generateBirthdayText(params);
    case 'welcome':
      return `¡Bienvenido a JA Manager!\n\nHola ${params.toName},\n\nTu cuenta ha sido creada exitosamente.\n\nTus credenciales de acceso:\nPlaca: ${params.placa || 'N/A'}\nEmail: ${params.toEmail}\n\nYa puedes iniciar sesión y comenzar a disfrutar de todas las funcionalidades de la plataforma.\n\n¡Bienvenido a la familia juvenil!`;
    case 'new_user_notification':
      return `Nuevo Usuario Registrado\n\nHola Administrador,\n\nUn nuevo usuario se ha registrado en la plataforma:\n\nNombre: ${params.applicantName || params.toName}\nEmail: ${params.applicantEmail || params.toEmail}\n${params.placa ? `Placa: ${params.placa}\n` : ''}\nFecha: ${new Date().toLocaleDateString('es-CO')}\n\nEsta es una notificación informativa. El usuario ya tiene acceso a la plataforma. Puedes revisar los registros recientes en el panel de administración.`;
    default:
      return params.message;
  }
};

const generateRegistrationRequestTemplate = (params: EmailParams): string => {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nueva Solicitud de Registro</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f5f7fa;
  }
  .container {
    background-color: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }
  .email-header {
    background: #f8fafc;
    padding: 30px 30px 15px;
    text-align: center;
    color: #2d3748;
  }
  .logo {
    width: 200px;
    height: 200px;
    margin: 0 auto 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: #2d3748;
    border-radius: 20px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  }
  .logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
  }
  .email-content {
    padding: 20px 40px 40px 40px;
  }
  .info-box {
    background: #f8fafc;
    border-left: 4px solid #3b82f6;
    padding: 25px;
    border-radius: 8px;
    margin: 25px 0;
  }
  .info-box p {
    margin: 8px 0;
  }
  .label {
    font-weight: bold;
    color: #3b82f6;
  }
  .cta-button {
    display: inline-block;
    background: #2563eb;
    color: #ffffff;
    padding: 8px 16px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 500;
    font-size: 16px;
    margin: 20px 0;
    text-align: center;
    transition: background-color 0.2s;
  }
  .cta-button:hover {
    background: #1d4ed8;
  }
  .footer {
    background: #2d3748;
    color: white;
    padding: 30px;
    text-align: center;
  }
  .footer-logo {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 10px;
  }
  .footer-text {
    font-size: 14px;
    opacity: 0.8;
  }
</style>
</head>
<body>
<div class="container">
  <div class="email-header">
    <div class="logo">
      <img src="${logoUrl()}" alt="JOVENES MODELIA" />
    </div>
  </div>
  <div class="email-content">
    <h1 style="color: #2d3748; margin-bottom: 20px">Nueva solicitud de registro</h1>
    <p style="font-size: 18px; color: #4a5568; margin-bottom: 30px">Hola Administrador,</p>
    <p style="font-size: 16px; color: #4a5568; margin-bottom: 30px">Se ha recibido una nueva solicitud de registro en el sistema:</p>
    <div class="info-box">
      <h3 style="color: #2d3748; margin-top: 0">Información del solicitante:</h3>
      <p><strong>Nombre:</strong> ${params.applicantName || params.toName}</p>
      <p><strong>Email:</strong> <a href="mailto:${params.applicantEmail || params.toEmail}" style="color: #3b82f6; text-decoration: none;">${params.applicantEmail || params.toEmail}</a></p>
      ${params.placa ? `<p><strong>Placa asignada:</strong> <strong style="color: #3b82f6;">${params.placa}</strong></p>` : ''}
      <p><strong>Fecha de solicitud:</strong> ${new Date().toLocaleDateString(
        'es-CO',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      )}</p>
    </div>
    <p style="font-size: 16px; color: #4a5568; margin: 30px 0">Por favor, revisa la solicitud en el panel de administración.</p>
    <div style="text-align: center; margin: 40px 0">
      <a href="${env.frontendUrl}/" class="cta-button" style="display: inline-block; background: #2563eb; color: #ffffff !important; padding: 8px 16px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px;">📋 Revisar Solicitud</a>
    </div>
  </div>
  <div class="footer">
    <div class="footer-logo">JA Manager</div>
    <div class="footer-text">Sistema de Gestión de Jóvenes Adventistas</div>
    <div class="footer-text">© ${new Date().getFullYear()} by Jamomodev</div>
  </div>
</div>
</body>
</html>
  `.trim();
};

const generateApprovalTemplate = (params: EmailParams): string => {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Solicitud Aprobada</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f5f7fa;
  }
  .container {
    background-color: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }
  .email-header {
    background: #f8fafc;
    padding: 30px 30px 15px;
    text-align: center;
    color: #2d3748;
  }
  .logo {
    width: 200px;
    height: 200px;
    margin: 0 auto 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: #2d3748;
    border-radius: 20px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  }
  .logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
  }
  .email-content {
    padding: 20px 40px 40px 40px;
  }
  .success-box {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    padding: 30px;
    border-radius: 12px;
    text-align: center;
    margin: 30px 0;
  }
  .success-box h2 {
    margin: 0 0 10px;
    font-size: 28px;
  }
  .info-box {
    background: #f8fafc;
    border-left: 4px solid #3b82f6;
    padding: 25px;
    border-radius: 8px;
    margin: 25px 0;
  }
  .info-box p {
    margin: 8px 0;
  }
  .label {
    font-weight: bold;
    color: #3b82f6;
  }
  .placa-display {
    background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
    color: white;
    font-size: 32px;
    font-weight: bold;
    text-align: center;
    padding: 20px;
    border-radius: 12px;
    margin: 20px 0;
    letter-spacing: 2px;
  }
  .cta-button {
    display: inline-block;
    background: #2563eb;
    color: #ffffff;
    padding: 8px 16px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 500;
    font-size: 16px;
    margin: 20px 0;
    text-align: center;
    transition: background-color 0.2s;
  }
  .cta-button:hover {
    background: #1d4ed8;
  }
  .steps-list {
    background: #f8fafc;
    padding: 25px;
    border-radius: 8px;
    margin: 25px 0;
  }
  .steps-list ul {
    margin: 0;
    padding-left: 20px;
  }
  .steps-list li {
    margin: 10px 0;
    color: #4a5568;
  }
  .footer {
    background: #2d3748;
    color: white;
    padding: 30px;
    text-align: center;
  }
  .footer-logo {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 10px;
  }
  .footer-text {
    font-size: 14px;
    opacity: 0.8;
  }
</style>
</head>
<body>
<div class="container">
  <div class="email-header">
    <div class="logo">
      <img src="${logoUrl()}" alt="JOVENES MODELIA" />
    </div>
  </div>
  <div class="email-content">
    <h1 style="color: #2d3748; margin-bottom: 20px">¡Bienvenido a la familia juvenil!</h1>
    <p style="font-size: 18px; color: #4a5568; margin-bottom: 30px">Hola <strong>${params.toName}</strong>,</p>
    <div class="success-box">
      <h2>¡Felicitaciones! 🎉</h2>
      <p style="font-size: 18px; margin: 0">Tu solicitud de registro ha sido aprobada</p>
    </div>
    <p style="font-size: 16px; color: #4a5568; margin: 30px 0">Ahora puedes acceder al sistema con tu placa y contraseña:</p>
    <div class="info-box">
      <div class="placa-display">${params.placa || 'N/A'}</div>
      <p style="text-align: center; margin: 15px 0 0; color: #4a5568"><strong>Email:</strong> ${params.toEmail}</p>
    </div>
    <div class="steps-list">
      <h3 style="color: #2d3748; margin-top: 0">Próximos pasos:</h3>
      <ul>
        <li>Accede al sistema con tu placa o email</li>
        <li>Utiliza la contraseña que elegiste durante el registro</li>
        <li>Completa tu perfil y comienza a participar</li>
        <li>Explora todas las funcionalidades disponibles</li>
      </ul>
    </div>
    <div style="text-align: center; margin: 40px 0">
      <a href="${env.frontendUrl}/" class="cta-button">🚀 Ir al Sistema</a>
    </div>
    <p style="font-size: 16px; color: #4a5568; text-align: center; margin-top: 30px">¡Bienvenido a la familia juvenil adventista!</p>
  </div>
  <div class="footer">
    <div class="footer-logo">JA Manager</div>
    <div class="footer-text">Sistema de Gestión de Jóvenes Adventistas</div>
    <div class="footer-text">© ${new Date().getFullYear()} by Jamomodev</div>
  </div>
</div>
</body>
</html>
  `.trim();
};

const generateRejectionTemplate = (params: EmailParams): string => {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Solicitud Rechazada</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f5f7fa;
  }
  .container {
    background-color: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }
  .email-header {
    background: #f8fafc;
    padding: 30px 30px 15px;
      text-align: center;
    color: #2d3748;
  }
  .logo {
    width: 200px;
    height: 200px;
    margin: 0 auto 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: #2d3748;
    border-radius: 20px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  }
  .logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
  }
  .email-content {
    padding: 20px 40px 40px 40px;
  }
  .warning-box {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    padding: 30px;
    border-radius: 12px;
    text-align: center;
    margin: 30px 0;
  }
  .warning-box h2 {
    margin: 0 0 10px;
    font-size: 28px;
  }
  .reason-box {
    background: #fff7ed;
    border: 2px solid #fb923c;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
  }
  .cta-button {
    display: inline-block;
    background: #2563eb;
    color: #ffffff;
    padding: 8px 16px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 500;
    font-size: 16px;
    margin: 20px 0;
    text-align: center;
    transition: background-color 0.2s;
  }
  .cta-button:hover {
    background: #1d4ed8;
  }
  .footer {
    background: #2d3748;
    color: white;
    padding: 30px;
    text-align: center;
  }
  .footer-logo {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 10px;
  }
  .footer-text {
    font-size: 14px;
    opacity: 0.8;
  }
</style>
</head>
<body>
<div class="container">
  <div class="email-header">
    <div class="logo">
      <img src="${logoUrl()}" alt="JOVENES MODELIA" />
    </div>
  </div>
  <div class="email-content">
    <h1 style="color: #2d3748; margin-bottom: 20px">Actualización de tu solicitud</h1>
    <p style="font-size: 18px; color: #4a5568; margin-bottom: 30px">Hola <strong>${params.toName}</strong>,</p>
    <div class="warning-box">
      <h2>Lo sentimos 😔</h2>
      <p style="font-size: 18px; margin: 0">Tu solicitud de registro ha sido rechazada</p>
    </div>
    ${
      params.rejectionReason
        ? `
    <div class="reason-box">
      <h3 style="color: #dc2626; margin-top: 0">Razón del rechazo:</h3>
      <p style="margin: 0; color: #4a5568">${params.rejectionReason}</p>
    </div>
    `
        : ''
    }
    <p style="font-size: 16px; color: #4a5568; margin: 30px 0">Si tienes alguna pregunta o crees que esto es un error, por favor contacta con el administrador del sistema.</p>
    <div style="text-align: center; margin: 40px 0">
      <a href="${env.frontendUrl}/" class="cta-button">🔄 Intentar Nuevamente</a>
    </div>
    <p style="font-size: 16px; color: #4a5568; text-align: center; margin-top: 30px">Gracias por tu interés en formar parte de nuestra comunidad.</p>
  </div>
  <div class="footer">
    <div class="footer-logo">JA Manager</div>
    <div class="footer-text">Sistema de Gestión de Jóvenes Adventistas</div>
    <div class="footer-text">© ${new Date().getFullYear()} by Jamomodev</div>
  </div>
</div>
</body>
</html>
  `.trim();
};

const generateWelcomeTemplate = (params: EmailParams): string => {
  const dashboardUrl =
    params.dashboardUrl ||
    env.frontendUrl;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>¡Bienvenido a JA Manager!</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f5f7fa;
  }
  .container {
    background-color: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }
  .email-header {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    padding: 40px 30px;
    text-align: center;
    color: white;
  }
  .logo {
    width: 150px;
    height: 150px;
    margin: 0 auto 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 15px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 20px;
    backdrop-filter: blur(10px);
  }
  .logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: brightness(0) invert(1);
  }
  .email-content {
    padding: 40px;
  }
  .success-icon {
    text-align: center;
    font-size: 64px;
    margin: 20px 0;
  }
  .credentials-box {
    background: #f0fdf4;
    border-left: 4px solid #10b981;
    padding: 25px;
    border-radius: 8px;
    margin: 25px 0;
  }
  .credentials-box p {
    margin: 8px 0;
    font-size: 15px;
  }
  .label {
    font-weight: bold;
    color: #059669;
  }
  .value {
    font-family: 'Courier New', monospace;
    background: white;
    padding: 8px 12px;
    border-radius: 6px;
    display: inline-block;
    margin-top: 5px;
    border: 1px solid #d1fae5;
  }
  .cta-button {
    display: inline-block;
    background: #10b981;
    color: #ffffff;
    padding: 14px 32px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    margin: 20px 0;
    text-align: center;
    transition: background-color 0.2s;
  }
  .cta-button:hover {
    background: #059669;
  }
  .features-list {
    margin: 25px 0;
    padding-left: 0;
    list-style: none;
  }
  .features-list li {
    padding: 12px 0;
    padding-left: 35px;
    position: relative;
    color: #4a5568;
  }
  .features-list li:before {
    content: "✓";
    position: absolute;
    left: 0;
    color: #10b981;
    font-weight: bold;
    font-size: 20px;
  }
  .footer {
    background: #2d3748;
    color: white;
    padding: 30px;
    text-align: center;
  }
  .footer-logo {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 10px;
  }
  .footer-text {
    font-size: 14px;
    opacity: 0.8;
  }
</style>
</head>
<body>
<div class="container">
  <div class="email-header">
    <div class="logo">
      <img src="${logoUrl()}" alt="JOVENES MODELIA" />
    </div>
    <h1 style="margin: 0; font-size: 28px; font-weight: bold;">¡Bienvenido a JA Manager!</h1>
    <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.95;">Tu cuenta ha sido creada exitosamente</p>
  </div>
  <div class="email-content">
    <div class="success-icon">🎉</div>
    
    <h2 style="color: #2d3748; font-size: 24px; margin-bottom: 15px;">¡Hola ${params.toName}!</h2>
    
    <p style="font-size: 16px; color: #4a5568; line-height: 1.8;">
      Estamos emocionados de tenerte en nuestra comunidad. Tu cuenta ha sido creada exitosamente y ya puedes comenzar a disfrutar de todas las funcionalidades de la plataforma.
    </p>

    <div class="credentials-box">
      <h3 style="margin-top: 0; color: #059669;">📋 Tus Credenciales de Acceso</h3>
      <p>
        <span class="label">Placa:</span><br>
        <span class="value">${params.placa || 'N/A'}</span>
      </p>
      <p>
        <span class="label">Email:</span><br>
        <span class="value">${params.toEmail}</span>
      </p>
      <p style="margin-top: 15px; font-size: 14px; color: #6b7280;">
        💡 <strong>Tip:</strong> Puedes iniciar sesión usando tu email o tu placa.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardUrl}" class="cta-button">
        🚀 Ir al Dashboard
      </a>
    </div>

    <h3 style="color: #2d3748; font-size: 20px; margin-top: 35px;">¿Qué puedes hacer ahora?</h3>
    <ul class="features-list">
      <li>Completar tu perfil con información adicional</li>
      <li>Registrar tu asistencia a eventos con código QR</li>
      <li>Acumular y canjear puntos por participación</li>
      <li>Ver el ranking de jóvenes más activos</li>
      <li>Recibir puntos especiales en tu cumpleaños</li>
    </ul>

    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0; color: #92400e; font-size: 15px;">
        <strong>🔐 Seguridad:</strong> Por favor, mantén tus credenciales seguras y no las compartas con nadie.
      </p>
    </div>
    
    <p style="font-size: 16px; color: #4a5568; text-align: center; margin-top: 40px;">
      ¿Tienes preguntas? Contáctanos respondiendo a este email.<br><br>
      Con cariño,<br>
      <strong>Ministerio Juvenil Modelia</strong>
    </p>
  </div>
  <div class="footer">
    <div class="footer-logo">JA Manager</div>
    <div class="footer-text">Sistema de Gestión de Jóvenes Adventistas</div>
    <div class="footer-text">© ${new Date().getFullYear()} by Jamomodev</div>
  </div>
</div>
</body>
</html>
  `.trim();
};

const generateNewUserNotificationTemplate = (params: EmailParams): string => {
  const dashboardUrl =
    env.frontendUrl;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nuevo Usuario Registrado</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f5f7fa;
  }
  .container {
    background-color: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }
  .email-header {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    padding: 40px 30px;
    text-align: center;
    color: white;
  }
  .logo {
    width: 150px;
    height: 150px;
    margin: 0 auto 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 15px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 20px;
    backdrop-filter: blur(10px);
  }
  .logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: brightness(0) invert(1);
  }
  .email-content {
    padding: 40px;
  }
  .icon {
    text-align: center;
    font-size: 64px;
    margin: 20px 0;
  }
  .info-box {
    background: #eff6ff;
    border-left: 4px solid #3b82f6;
    padding: 25px;
    border-radius: 8px;
    margin: 25px 0;
  }
  .info-box p {
    margin: 8px 0;
    font-size: 15px;
  }
  .label {
    font-weight: bold;
    color: #2563eb;
  }
  .value {
    color: #1e40af;
  }
  .cta-button {
    display: inline-block;
    background: #3b82f6;
    color: #ffffff;
    padding: 14px 32px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    margin: 20px 0;
    text-align: center;
    transition: background-color 0.2s;
  }
  .cta-button:hover {
    background: #2563eb;
  }
  .notice-box {
    background: #fef3c7;
    border-left: 4px solid #f59e0b;
    padding: 20px;
    border-radius: 8px;
    margin: 25px 0;
  }
  .notice-box p {
    margin: 0;
    color: #92400e;
    font-size: 15px;
  }
  .footer {
    background: #2d3748;
    color: white;
    padding: 30px;
    text-align: center;
  }
  .footer-logo {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 10px;
  }
  .footer-text {
    font-size: 14px;
    opacity: 0.8;
  }
</style>
</head>
<body>
<div class="container">
  <div class="email-header">
    <div class="logo">
      <img src="${logoUrl()}" alt="JOVENES MODELIA" />
    </div>
    <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Nuevo Usuario Registrado</h1>
    <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.95;">Notificación Informativa</p>
  </div>
  <div class="email-content">
    <div class="icon">👤</div>
    
    <h2 style="color: #2d3748; font-size: 24px; margin-bottom: 15px;">¡Hola Administrador!</h2>
    
    <p style="font-size: 16px; color: #4a5568; line-height: 1.8;">
      Un nuevo usuario se ha registrado en la plataforma y ya tiene acceso inmediato al sistema.
    </p>

    <div class="info-box">
      <h3 style="margin-top: 0; color: #2563eb;">📊 Información del Usuario</h3>
      <p><span class="label">Nombre:</span> <span class="value">${params.applicantName || params.toName}</span></p>
      <p><span class="label">Email:</span> <span class="value">${params.applicantEmail || params.toEmail}</span></p>
      ${params.placa ? `<p><span class="label">Placa:</span> <span class="value">${params.placa}</span></p>` : ''}
      <p><span class="label">Fecha de registro:</span> <span class="value">${new Date().toLocaleDateString(
        'es-CO',
        {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      )}</span></p>
    </div>

    <div class="notice-box">
      <p>
        <strong>ℹ️ Nota:</strong> Esta es una notificación informativa. El usuario ya tiene acceso completo a la plataforma y puede comenzar a usar todas las funcionalidades. Puedes revisar su perfil y actividad en el panel de "Registros Recientes".
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardUrl}/admin/recent-users" class="cta-button">
        📋 Ver Registros Recientes
      </a>
    </div>

    <div style="background: #dcfce7; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0; color: #065f46; font-size: 15px;">
        <strong>✅ Acciones disponibles:</strong> Si detectas actividad sospechosa, puedes marcar el usuario como spam o eliminarlo desde el panel de administración.
      </p>
    </div>
    
    <p style="font-size: 16px; color: #4a5568; text-align: center; margin-top: 40px;">
      Sistema automatizado de notificaciones<br>
      <strong>JA Manager - Admin Panel</strong>
    </p>
  </div>
  <div class="footer">
    <div class="footer-logo">JA Manager</div>
    <div class="footer-text">Sistema de Gestión de Jóvenes Adventistas</div>
    <div class="footer-text">© ${new Date().getFullYear()} by Jamomodev</div>
  </div>
</div>
</body>
</html>
  `.trim();
};

export const buildHtml = (params: EmailParams): string => {
  switch (params.type) {
    case 'registration_request':
      return generateRegistrationRequestTemplate(params);
    case 'approval':
      return generateApprovalTemplate(params);
    case 'rejection':
      return generateRejectionTemplate(params);
    case 'birthday':
      return generateBirthdayTemplate(params);
    case 'welcome':
      return generateWelcomeTemplate(params);
    case 'new_user_notification':
      return generateNewUserNotificationTemplate(params);
    default:
      return `<p>${params.message}</p>`;
  }
};

export const buildText = (params: EmailParams): string =>
  generateTextContent(params);
