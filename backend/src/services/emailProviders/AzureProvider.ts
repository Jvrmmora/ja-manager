import { EmailClient } from '@azure/communication-email';
import logger from '../../utils/logger';
import { EmailProvider, EmailParams } from './EmailProviderInterface';

export class AzureProvider implements EmailProvider {
  private emailClient: EmailClient | null = null;
  private fromEmail: string;
  private fromName: string;
  private connectionString: string;

  constructor() {
    this.connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING || '';
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
      logger.warn('Azure Communication Services no está configurado, omitiendo envío de email', {
        context: 'AzureProvider',
        method: 'sendEmail',
        toEmail: params.toEmail,
      });
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

      logger.info('Email enviado exitosamente con Azure Communication Services', {
        context: 'AzureProvider',
        method: 'sendEmail',
        type: params.type,
        toEmail: params.toEmail,
        messageId: result.id,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = error instanceof Error ? error.stack : JSON.stringify(error);

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
        <p><strong>Fecha de solicitud:</strong> ${new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</p>
      </div>
      <p style="font-size: 16px; color: #4a5568; margin: 30px 0">Por favor, revisa la solicitud en el panel de administración.</p>
      <div style="text-align: center; margin: 40px 0">
        <a href="https://yellow-river-04315080f.3.azurestaticapps.net/" class="cta-button" style="display: inline-block; background: #2563eb; color: #ffffff !important; padding: 8px 16px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px;">📋 Revisar Solicitud</a>
      </div>
    </div>
    <div class="footer">
      <div class="footer-logo">JA Manager</div>
      <div class="footer-text">Sistema de Gestión de Jóvenes Adventistas</div>
      <div class="footer-text">© 2025 by Jamomodev</div>
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
      <div class="footer-text">© 2025 by Jamomodev</div>
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
      ${params.rejectionReason ? `
      <div class="reason-box">
        <h3 style="color: #dc2626; margin-top: 0">Razón del rechazo:</h3>
        <p style="margin: 0; color: #4a5568">${params.rejectionReason}</p>
      </div>
      ` : ''}
      <p style="font-size: 16px; color: #4a5568; margin: 30px 0">Si tienes alguna pregunta o crees que esto es un error, por favor contacta con el administrador del sistema.</p>
      <div style="text-align: center; margin: 40px 0">
        <a href="https://yellow-river-04315080f.3.azurestaticapps.net/" class="cta-button">🔄 Intentar Nuevamente</a>
      </div>
      <p style="font-size: 16px; color: #4a556撃; text-align: center; margin-top: 30px">Gracias por tu interés en formar parte de nuestra comunidad.</p>
    </div>
    <div class="footer">
      <div class="footer-logo">JA Manager</div>
      <div class="footer-text">Sistema de Gestión de Jóvenes Adventistas</div>
      <div class="footer-text">© 2025 by Jamomodev</div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}
