import env from '../../config/env';
import { EmailParams } from './EmailProviderInterface';
import {
  escapeHtml,
  firstName,
  formatEmailDateTime,
  getInitials,
  logoUrl,
} from './emailHelpers';

/**
 * Correos con el estilo de marca (línea de colores, cabecera crema, tarjetas
 * y botón ancho): código de verificación, contraseña cambiada, bienvenida y
 * aviso al administrador. Todo con tablas y estilos en línea para que lo
 * soporten Gmail y Outlook. Son funciones puras, sin red.
 */

const INK = '#140B10';
const BODY = '#3A2A30';
const MUTED = '#6A5560';
const SOFT = '#8A6A76';
const WINE = '#8A1C45';
const ACCENT = '#B3243B';
const CREAM = '#FFF8F1';
const SAND = '#FFF4E8';
const LINE = '#F0E2D6';

const frontend = (): string => env.frontendUrl.replace(/\/+$/, '');

/* ---------------------------- Piezas de diseño ---------------------------- */

const accentWord = (text: string): string =>
  `<span style="color:${ACCENT};">${escapeHtml(text)}</span>`;

const button = (href: string, label: string): string => `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:26px;">
                <tr>
                  <td align="center" bgcolor="${ACCENT}" style="background-color:${ACCENT}; background-image:linear-gradient(90deg, #C2410F 0%, #B3243B 55%, #8A1C45 100%); border-radius:14px;">
                    <a href="${escapeHtml(href)}" style="display:block; padding:18px 32px; font-size:17px; font-weight:bold; color:#FFFFFF; text-decoration:none;">${escapeHtml(label)} &rarr;</a>
                  </td>
                </tr>
              </table>`;

const infoCard = (
  label: string,
  value: string,
  opts: { mono?: boolean; sub?: string } = {}
): string => `
                  <td width="48%" valign="top" bgcolor="${SAND}" style="background-color:${SAND}; border-radius:14px; padding:16px 18px;">
                    <div style="font-size:11px; letter-spacing:2px; text-transform:uppercase; font-weight:bold; color:${SOFT};">${escapeHtml(label)}</div>
                    <div style="margin-top:6px; ${
                      opts.mono
                        ? `font-family:'Courier New', Courier, monospace; font-size:20px; color:${WINE};`
                        : `font-size:15px; color:${INK}; padding-top:4px;`
                    } font-weight:bold; word-break:break-word;">${escapeHtml(value)}</div>${
                      opts.sub
                        ? `<div style="margin-top:2px; font-size:12px; color:${MUTED};">${escapeHtml(opts.sub)}</div>`
                        : ''
                    }
                  </td>`;

const infoRow = (left: string, right: string): string => `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;">
                <tr>${left}
                  <td width="4%" style="font-size:0;">&nbsp;</td>${right}
                </tr>
              </table>`;

const noteBox = (html: string): string => `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:22px; border-collapse:separate;">
                <tr>
                  <td style="border:1px solid ${LINE}; border-radius:12px; padding:14px 18px; font-size:14px; line-height:1.6; color:${MUTED};">${html}</td>
                </tr>
              </table>`;

interface ShellOptions {
  title: string; // HTML del título (ya escapado, con la palabra de acento)
  intro: string; // HTML del párrafo de la cabecera
  body: string; // HTML del contenido
  preheader: string;
  footer?: string; // líneas del pie (HTML)
}

const shell = ({ title, intro, body, preheader, footer }: ShellOptions): string => {
  const year = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${title.replace(/<[^>]+>/g, '')}</title>
</head>
<body style="margin:0; padding:0; background-color:${CREAM};">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${CREAM}" style="background-color:${CREAM};">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:600px; background-color:#FFFFFF; border-radius:20px; overflow:hidden; border-collapse:separate; font-family:Arial, Helvetica, sans-serif; color:${INK};">
          <tr><td height="5" bgcolor="#F26A2E" style="height:5px; line-height:5px; font-size:0; background-color:#F26A2E; background-image:linear-gradient(90deg, #F9A23B 0%, #F26A2E 35%, #DC3340 70%, #8A1C45 100%);">&nbsp;</td></tr>
          <tr>
            <td align="center" bgcolor="#FFF1E2" style="padding:40px 40px 30px; background-color:#FFF1E2; background-image:linear-gradient(180deg, #FFEFDC 0%, #FFFFFF 100%);">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td align="center" valign="middle" width="64" height="64" bgcolor="#FFFFFF" style="width:64px; height:64px; border-radius:20px; background-color:#FFFFFF;">
                    <img src="${escapeHtml(logoUrl())}" width="44" height="44" alt="" style="display:block; margin:0 auto; border:0;">
                  </td>
                </tr>
              </table>
              <p style="margin:14px 0 0; font-size:12px; letter-spacing:4px; text-transform:uppercase; font-weight:bold; color:${WINE};">Jóvenes Modelia Bogotá</p>
              <h1 style="margin:22px 0 8px; font-size:32px; line-height:1.15; font-weight:bold; color:${INK};">${title}</h1>
              <p style="margin:0; font-size:17px; line-height:1.6; color:${BODY};">${intro}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 0;">${body}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:30px 40px 32px;">
              <p style="margin:0; font-size:12px; line-height:1.7; color:${SOFT};">${footer ?? `Nunca te pediremos tu contraseña por correo ni por mensaje.<br>Jóvenes Modelia Bogotá · jovenesmodelia.com · ${year}`}</p>
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

/* ------------------------- Código de verificación ------------------------- */

export const generatePasswordResetTemplate = (params: EmailParams): string => {
  const name = escapeHtml(firstName(params.toName));
  const code = escapeHtml(params.resetCode || '');
  const minutes = escapeHtml(params.expiresInMinutes ?? 10);

  const body = `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;">
                <tr>
                  <td align="center" bgcolor="${SAND}" style="background-color:${SAND}; border-radius:16px; padding:26px 12px 24px;">
                    <div style="font-size:11px; letter-spacing:3px; text-transform:uppercase; font-weight:bold; color:${SOFT};">Tu código</div>
                    <div style="margin-top:10px; padding-left:14px; font-family:'Courier New', Courier, monospace; font-size:46px; line-height:1.1; font-weight:bold; letter-spacing:14px; color:${WINE};">${code}</div>
                    <div style="margin-top:14px;"><span style="display:inline-block; padding:6px 14px; border-radius:999px; background-color:#FFFFFF; font-size:13px; font-weight:bold; color:#4E0F3A;">Vence en ${minutes} minutos</span></div>
                  </td>
                </tr>
              </table>${noteBox(
                `<strong style="color:${BODY};">No compartas este código.</strong> Nadie del ministerio te lo pedirá, ni por mensaje ni por llamada. Si no lo pediste, ignora este correo: tu contraseña no cambiará.`
              )}`;

  return shell({
    title: `Tu código de ${accentWord('verificación')}`,
    intro: `Hola, <strong>${name}</strong>. Escríbelo en la pantalla donde pediste restablecer tu contraseña.`,
    preheader: `Tu código vence en ${params.expiresInMinutes ?? 10} minutos. No lo compartas con nadie.`,
    body,
  });
};

export const generatePasswordResetText = (params: EmailParams): string =>
  `Tu código de verificación\n\nHola ${firstName(params.toName)},\n\nTu código para restablecer la contraseña de JA Manager es: ${params.resetCode || ''}\n\nVence en ${params.expiresInMinutes ?? 10} minutos.\n\nNo compartas este código con nadie. Si no lo pediste, ignora este correo: tu contraseña no cambiará.\n\nJóvenes Modelia Bogotá`;

/* ------------------------- Contraseña cambiada ---------------------------- */

export const generatePasswordChangedTemplate = (params: EmailParams): string => {
  const name = escapeHtml(firstName(params.toName));
  const when = formatEmailDateTime(params.changedAt || new Date());
  const loginUrl = `${frontend()}/login`;

  const cards = infoRow(
    infoCard('Cuenta', params.placa || params.toEmail, {
      mono: Boolean(params.placa),
    }),
    infoCard('Fecha y hora', when, { sub: 'Hora de Bogotá' })
  );

  const body = `${cards}
              <p style="margin:16px 0 0; font-size:14px; line-height:1.6; color:${MUTED};">Por seguridad cerramos tus sesiones abiertas en todos los dispositivos, así que tendrás que iniciar sesión de nuevo.</p>${button(
                loginUrl,
                'Iniciar sesión'
              )}${noteBox(
                `<strong style="color:${BODY};">¿No fuiste tú?</strong> Avisa de inmediato a un líder administrador para que proteja tu cuenta y te ayude a recuperarla.`
              )}`;

  return shell({
    title: `Tu contraseña ${accentWord('fue cambiada')}`,
    intro: `Hola, <strong>${name}</strong>. Ya puedes entrar con tu nueva contraseña.`,
    preheader: 'Cerramos tus sesiones abiertas. Si no fuiste tú, avisa a un administrador.',
    body,
  });
};

export const generatePasswordChangedText = (params: EmailParams): string =>
  `Tu contraseña fue cambiada\n\nHola ${firstName(params.toName)},\n\nLa contraseña de tu cuenta${params.placa ? ` ${params.placa}` : ''} se cambió el ${formatEmailDateTime(params.changedAt || new Date())} (hora de Bogotá). Por seguridad cerramos tus sesiones abiertas.\n\nInicia sesión: ${frontend()}/login\n\n¿No fuiste tú? Avisa de inmediato a un líder administrador.\n\nJóvenes Modelia Bogotá`;

/* ------------------------------- Bienvenida ------------------------------- */

export const generateWelcomeTemplate = (params: EmailParams): string => {
  const name = escapeHtml(firstName(params.toName));
  const base = (params.dashboardUrl || frontend()).replace(/\/+$/, '');
  const loginUrl = `${base}/login${
    params.placa ? `?placa=${encodeURIComponent(params.placa)}` : ''
  }`;

  const cards = infoRow(
    infoCard('Tu placa', params.placa || 'Por asignar', { mono: true }),
    infoCard('Tu correo', params.toEmail)
  );

  const feature = (glyph: string, title: string, text: string, last = false) => `
                <tr>
                  <td width="52" valign="top" style="padding:0 0 ${last ? 0 : 14}px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" valign="middle" width="38" height="38" bgcolor="#FFE4C7" style="width:38px; height:38px; border-radius:12px; background-color:#FFE4C7; font-size:18px; font-weight:bold; color:${ACCENT};">${glyph}</td></tr></table>
                  </td>
                  <td valign="top" style="padding:0 0 ${last ? 0 : 14}px;">
                    <div style="font-size:15px; font-weight:bold; color:${INK};">${title}</div>
                    <div style="margin-top:2px; font-size:14px; line-height:1.5; color:${MUTED};">${text}</div>
                  </td>
                </tr>`;

  const body = `${cards}
              <p style="margin:16px 0 0; font-size:14px; line-height:1.6; color:${MUTED};">Entra con tu placa o con tu correo y la contraseña que elegiste. ¿La olvidaste? Usa "¿Olvidaste tu contraseña?" en el inicio de sesión.</p>${button(
                loginUrl,
                'Ir a mi panel'
              )}
              <p style="margin:34px 0 14px; font-size:12px; letter-spacing:3px; text-transform:uppercase; font-weight:bold; color:${SOFT};">Qué puedes hacer</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${feature('&#9638;', 'Registra tu asistencia', 'Escanea el código QR de cada reunión.')}${feature('&#9733;', 'Suma puntos y sube en el ranking', 'Cada asistencia y cada racha cuentan.')}${feature('&#10022;', 'Recibe un regalo en tu cumpleaños', 'Te llegan puntos y una tarjeta por correo.', true)}
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:34px; border-collapse:separate;">
                <tr>
                  <td align="center" bgcolor="#4E0F3A" style="background-color:#4E0F3A; border-radius:16px; padding:24px 28px;">
                    <div style="font-size:15px; font-style:italic; line-height:1.6; color:${CREAM};">&ldquo;Esfuérzate y sé valiente. No temas ni desmayes, porque el Señor tu Dios estará contigo dondequiera que vayas.&rdquo;</div>
                    <div style="margin-top:10px; font-size:12px; letter-spacing:3px; text-transform:uppercase; font-weight:bold; color:#F9A23B;">Josué 1:9</div>
                  </td>
                </tr>
              </table>`;

  return shell({
    title: `¡Bienvenido a ${accentWord('JA Manager')}!`,
    intro: `Hola, <strong>${name}</strong>. Tu cuenta ya está lista y tu familia juvenil te esperaba.`,
    preheader: 'Tu cuenta está lista. Aquí tienes tu placa y cómo entrar.',
    body,
  });
};

export const generateWelcomeText = (params: EmailParams): string => {
  const base = (params.dashboardUrl || frontend()).replace(/\/+$/, '');
  return `¡Bienvenido a JA Manager!\n\nHola ${firstName(params.toName)},\n\nTu cuenta está lista.\n\nPlaca: ${params.placa || 'Por asignar'}\nCorreo: ${params.toEmail}\n\nEntra con tu placa o con tu correo: ${base}/login\n\nNunca te pediremos tu contraseña por correo ni por mensaje.\n\nJóvenes Modelia Bogotá`;
};

/* --------------------------- Aviso al administrador ----------------------- */

export const generateNewUserNotificationTemplate = (
  params: EmailParams
): string => {
  const applicant = params.applicantName || params.toName;
  const email = params.applicantEmail || params.toEmail;
  const when = formatEmailDateTime(new Date());
  const panelUrl = `${frontend()}/admin`;
  const initials = escapeHtml(getInitials(applicant));

  const card = `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;">
                <tr>
                  <td bgcolor="${SAND}" style="background-color:${SAND}; border-radius:16px; padding:20px 22px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td width="64" valign="middle">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" valign="middle" width="52" height="52" bgcolor="${ACCENT}" style="width:52px; height:52px; border-radius:26px; background-color:${ACCENT}; background-image:linear-gradient(135deg, #F26A2E 0%, #B3243B 60%, #8A1C45 100%); font-size:18px; font-weight:bold; letter-spacing:1px; color:#FFFFFF;">${initials}</td></tr></table>
                        </td>
                        <td valign="middle">
                          <div style="font-size:18px; font-weight:bold; color:${INK};">${escapeHtml(applicant)}</div>
                          <div style="margin-top:2px; font-size:14px; color:${MUTED}; word-break:break-word;">${escapeHtml(email)}</div>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:18px; border-top:1px solid #F0DDCB;">
                      <tr>
                        <td width="50%" valign="top" style="padding-top:16px;">
                          <div style="font-size:11px; letter-spacing:2px; text-transform:uppercase; font-weight:bold; color:${SOFT};">Placa</div>
                          <div style="margin-top:5px; font-family:'Courier New', Courier, monospace; font-size:17px; font-weight:bold; color:${WINE};">${escapeHtml(params.placa || 'Sin placa')}</div>
                        </td>
                        <td width="50%" valign="top" style="padding-top:16px;">
                          <div style="font-size:11px; letter-spacing:2px; text-transform:uppercase; font-weight:bold; color:${SOFT};">Registro</div>
                          <div style="margin-top:5px; font-size:15px; font-weight:bold; color:${INK};">${escapeHtml(when)}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>`;

  const body = `${card}${button(panelUrl, 'Abrir el panel')}${noteBox(
    `<strong style="color:${BODY};">¿Algo no cuadra?</strong> Si el registro te parece sospechoso, puedes marcarlo como spam o eliminarlo desde el panel.`
  )}`;

  return shell({
    title: `Un joven más en ${accentWord('la familia')}`,
    intro: 'Alguien acaba de crear su cuenta y ya tiene acceso a la plataforma.',
    preheader: `${applicant} se registró en JA Manager.`,
    body,
    footer: `Aviso automático de JA Manager · jovenesmodelia.com`,
  });
};

export const generateNewUserNotificationText = (params: EmailParams): string =>
  `Nuevo joven registrado\n\nAlguien acaba de crear su cuenta en JA Manager:\n\nNombre: ${params.applicantName || params.toName}\nCorreo: ${params.applicantEmail || params.toEmail}\n${params.placa ? `Placa: ${params.placa}\n` : ''}Registro: ${formatEmailDateTime(new Date())} (hora de Bogotá)\n\nAbre el panel: ${frontend()}/admin\n\nSi el registro te parece sospechoso, puedes marcarlo como spam o eliminarlo desde el panel.`;
