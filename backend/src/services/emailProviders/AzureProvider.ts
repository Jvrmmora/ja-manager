import { EmailClient } from '@azure/communication-email';
import logger from '../../utils/logger';
import { EmailProvider, EmailParams } from './EmailProviderInterface';

export class AzureProvider implements EmailProvider {
  private emailClient: EmailClient | null = null;
  private fromEmail: string;
  private fromName: string;
  private connectionString: string;

  constructor() {
    this.connectionString =
      process.env.AZURE_COMMUNICATION_CONNECTION_STRING || '';
    this.fromEmail = process.env.EMAIL_FROM || '';
    this.fromName = process.env.EMAIL_FROM_NAME || 'JA Manager';

    // Configurar Azure Communication Services
    if (this.connectionString) {
      this.emailClient = new EmailClient(this.connectionString);
    }
  }

  isConfigured(): boolean {
    return !!(this.emailClient && this.fromEmail && this.connectionString);
  }

  getProviderName(): string {
    return 'Azure Communication Services';
  }

  async sendEmail(params: EmailParams): Promise<void> {
    if (!this.isConfigured()) {
      logger.warn(
        'Azure Communication Services no está configurado, omitiendo envío de email',
        {
          context: 'AzureProvider',
          method: 'sendEmail',
          toEmail: params.toEmail,
        }
      );
      return;
    }

    try {
      // Generar asunto según el tipo
      let emailSubject: string;
      switch (params.type) {
        case 'registration_request':
          emailSubject = `Nueva Solicitud de Registro - ${params.toName}`;
          break;
        case 'approval':
          emailSubject = `¡Solicitud Aprobada! - Bienvenido a JA Manager`;
          break;
        case 'rejection':
          emailSubject = `Solicitud de Registro - Actualización`;
          break;
        case 'birthday':
          emailSubject = `¡Feliz Cumpleaños ${params.toName}! 🎂`;
          break;
        case 'welcome':
          emailSubject = `¡Bienvenido a JA Manager! - Cuenta creada exitosamente`;
          break;
        case 'new_user_notification':
          emailSubject = `Nuevo Usuario Registrado - ${params.applicantName || params.toName}`;
          break;
        default:
          emailSubject = params.subject || params.message;
      }

      // Generar HTML según el tipo
      const htmlContent = this.generateHtmlContent(params);

      const emailMessage = {
        senderAddress: this.fromEmail,
        content: {
          subject: emailSubject,
          html: htmlContent,
          plainText: this.generateTextContent(params),
        },
        recipients: {
          to: [
            {
              address: params.toEmail,
              displayName: params.toName,
            },
          ],
        },
      };

      const poller = await this.emailClient!.beginSend(emailMessage);
      const result = await poller.pollUntilDone();

      logger.info(
        'Email enviado exitosamente con Azure Communication Services',
        {
          context: 'AzureProvider',
          method: 'sendEmail',
          type: params.type,
          toEmail: params.toEmail,
          messageId: result.id,
        }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorDetails =
        error instanceof Error ? error.stack : JSON.stringify(error);

      logger.error('Error enviando email con Azure Communication Services', {
        context: 'AzureProvider',
        method: 'sendEmail',
        error: errorMessage,
        errorDetails: errorDetails,
        toEmail: params.toEmail,
        type: params.type,
      });

      // Re-lanzar el error para que el servicio principal pueda manejarlo
      throw new Error(`Azure Communication Services error: ${errorMessage}`);
    }
  }

  private generateHtmlContent(params: EmailParams): string {
    switch (params.type) {
      case 'registration_request':
        return this.generateRegistrationRequestTemplate(params);
      case 'approval':
        return this.generateApprovalTemplate(params);
      case 'rejection':
        return this.generateRejectionTemplate(params);
      case 'birthday':
        return this.generateBirthdayTemplate(params);
      case 'welcome':
        return this.generateWelcomeTemplate(params);
      case 'new_user_notification':
        return this.generateNewUserNotificationTemplate(params);
      default:
        return `<p>${params.message}</p>`;
    }
  }

  private generateTextContent(params: EmailParams): string {
    switch (params.type) {
      case 'registration_request':
        return `Nueva Solicitud de Registro\n\nHola Administrador,\n\nSe ha recibido una nueva solicitud de registro:\n\nNombre: ${params.toName}\nEmail: ${params.toEmail}\n${params.placa ? `Placa: ${params.placa}\n` : ''}\nFecha: ${new Date().toLocaleDateString('es-CO')}\n\nPor favor, revisa la solicitud en el panel de administración.`;
      case 'approval':
        return `¡Solicitud Aprobada!\n\nHola ${params.toName},\n\nTu solicitud de registro ha sido aprobada.\n\nPlaca asignada: ${params.placa || 'N/A'}\nEmail: ${params.toEmail}\n\n¡Bienvenido a la familia juvenil!`;
      case 'rejection':
        return `Solicitud Rechazada\n\nHola ${params.toName},\n\nTu solicitud de registro ha sido rechazada.\n\n${params.rejectionReason ? `Razón: ${params.rejectionReason}\n` : ''}\nSi tienes alguna pregunta, contacta con el administrador.`;
      case 'birthday':
        return `¡Feliz Cumpleaños ${params.toName}!\n\nDesde el Ministerio Juvenil Modelia te enviamos un fuerte abrazo y nuestros mejores deseos en este día tan especial.\n\nQue Dios siga guiando tu vida y llenándola de bendiciones.\n\n¡Disfruta tu día al máximo!\n\nTienes ${params.birthdayPoints || 100} puntos de regalo. Reclama tu regalo iniciando sesión en JA Manager.\n\nNota: Los puntos solo pueden reclamarse una vez al año. Válido desde tu cumpleaños hasta 10 días después.`;
      case 'welcome':
        return `¡Bienvenido a JA Manager!\n\nHola ${params.toName},\n\nTu cuenta ha sido creada exitosamente.\n\nTus credenciales de acceso:\nPlaca: ${params.placa || 'N/A'}\nEmail: ${params.toEmail}\n\nYa puedes iniciar sesión y comenzar a disfrutar de todas las funcionalidades de la plataforma.\n\n¡Bienvenido a la familia juvenil!`;
      case 'new_user_notification':
        return `Nuevo Usuario Registrado\n\nHola Administrador,\n\nUn nuevo usuario se ha registrado en la plataforma:\n\nNombre: ${params.applicantName || params.toName}\nEmail: ${params.applicantEmail || params.toEmail}\n${params.placa ? `Placa: ${params.placa}\n` : ''}\nFecha: ${new Date().toLocaleDateString('es-CO')}\n\nEsta es una notificación informativa. El usuario ya tiene acceso a la plataforma. Puedes revisar los registros recientes en el panel de administración.`;
      default:
        return params.message;
    }
  }

  private generateRegistrationRequestTemplate(params: EmailParams): string {
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
        <img src="https://yellow-river-04315080f.3.azurestaticapps.net/assets/logo_2-DuTkiqwv.png" alt="JOVENES MODELIA" />
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
        <a href="https://yellow-river-04315080f.3.azurestaticapps.net/" class="cta-button" style="display: inline-block; background: #2563eb; color: #ffffff !important; padding: 8px 16px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px;">📋 Revisar Solicitud</a>
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
  }

  private generateApprovalTemplate(params: EmailParams): string {
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
        <img src="https://yellow-river-04315080f.3.azurestaticapps.net/assets/logo_2-DuTkiqwv.png" alt="JOVENES MODELIA" />
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
        <a href="https://yellow-river-04315080f.3.azurestaticapps.net/" class="cta-button">🚀 Ir al Sistema</a>
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
  }

  private generateRejectionTemplate(params: EmailParams): string {
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
     配制 text-align: center;
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
        <img src="https://yellow-river-04315080f.3.azurestaticapps.net/assets/logo_2-DuTkiqwv.png" alt="JOVENES MODELIA" />
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
        <a href="https://yellow-river-04315080f.3.azurestaticapps.net/" class="cta-button">🔄 Intentar Nuevamente</a>
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
  }

  private generateBirthdayTemplate(params: EmailParams): string {
    const claimUrl = `https://yellow-river-04315080f.3.azurestaticapps.net/birthday-claim?token=${params.birthdayToken}`;
    const points = params.birthdayPoints || 100;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>¡Feliz Cumpleaños!</title>
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
      background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%);
      padding: 40px 30px;
      text-align: center;
      color: white;
    }
    .logo {
      width: 200px;
      margin: 0 auto 20px;
    }
    .logo img {
      width: 100%;
      height: auto;
    }
    .birthday-icon {
      font-size: 64px;
      margin: 20px 0;
    }
    .email-content {
      padding: 40px 30px;
    }
    .celebration-box {
      background: linear-gradient(135deg, #FDF4FF 0%, #F3E8FF 100%);
      border-left: 4px solid #8B5CF6;
      padding: 25px;
      border-radius: 8px;
      margin: 25px 0;
    }
    .points-box {
      background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%);
      color: white;
      font-size: 28px;
      font-weight: bold;
      text-align: center;
      padding: 30px;
      border-radius: 12px;
      margin: 30px 0;
      letter-spacing: 1px;
      box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
    }
    .points-box .icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .cta-button {
      display: inline-block;
      background: #10B981;
      color: #ffffff;
      padding: 16px 32px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 18px;
      margin: 20px 0;
      text-align: center;
      transition: background-color 0.2s;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
    }
    .cta-button:hover {
      background: #059669;
    }
    .disclaimer {
      background: #F3F4F6;
      padding: 15px;
      border-radius: 8px;
      margin: 25px 0;
      font-size: 14px;
      color: #6B7280;
      text-align: center;
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
        <img src="https://yellow-river-04315080f.3.azurestaticapps.net/assets/logo_2-DuTkiqwv.png" alt="JOVENES MODELIA" />
      </div>
      <div class="birthday-icon">🎂</div>
      <h1 style="color: white; margin: 10px 0; font-size: 32px;">¡Feliz Cumpleaños!</h1>
      <p style="color: rgba(255, 255, 255, 0.9); font-size: 20px; margin: 10px 0;">${params.toName}</p>
    </div>
    <div class="email-content">
      <div class="celebration-box">
        <p style="font-size: 18px; color: #2d3748; margin: 0 0 15px 0; line-height: 1.8;">
          Desde el <strong>Ministerio Juvenil Modelia</strong> te enviamos un fuerte abrazo y nuestros mejores deseos en este día tan especial.
        </p>
        <p style="font-size: 16px; color: #4a5568; margin: 0 0 15px 0; line-height: 1.8;">
          Que Dios siga guiando tu vida y llenándola de bendiciones.
        </p>
        <p style="font-size: 18px; color: #8B5CF6; margin: 0; font-weight: 600;">
          ¡Disfruta tu día al máximo! 🎉
        </p>
      </div>
      
      <h2 style="color: #2d3748; text-align: center; margin: 40px 0 20px;">Tenemos un regalo especial para ti</h2>
      
      <div class="points-box">
        <div class="icon">🎁</div>
        <div>${points} PUNTOS DE REGALO</div>
      </div>
      
      <div style="text-align: center; margin: 40px 0;">
        <a href="${claimUrl}" class="cta-button">Reclamar Mi Regalo</a>
      </div>
      
      <div class="disclaimer">
        <strong>📌 Nota importante:</strong><br>
        Los puntos solo pueden reclamarse una vez al año.<br>
        Válido desde tu cumpleaños hasta 10 días después.<br>
        <em>Si ya reclamaste los puntos antes, no serán reclamados de nuevo.</em>
      </div>
      
      <p style="font-size: 16px; color: #4a5568; text-align: center; margin-top: 30px;">
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
  }

  private generateWelcomeTemplate(params: EmailParams): string {
    const dashboardUrl =
      params.dashboardUrl ||
      process.env.FRONTEND_URL ||
      'https://yellow-river-04315080f.3.azurestaticapps.net';

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
        <img src="https://yellow-river-04315080f.3.azurestaticapps.net/assets/logo_2-DuTkiqwv.png" alt="JOVENES MODELIA" />
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
  }

  private generateNewUserNotificationTemplate(params: EmailParams): string {
    const dashboardUrl =
      process.env.FRONTEND_URL ||
      'https://yellow-river-04315080f.3.azurestaticapps.net';

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
        <img src="https://yellow-river-04315080f.3.azurestaticapps.net/assets/logo_2-DuTkiqwv.png" alt="JOVENES MODELIA" />
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
  }
}
