import nodemailer, { Transporter } from 'nodemailer';
import env from '../../config/env';
import logger from '../../utils/logger';
import { EmailProvider, EmailParams } from './EmailProviderInterface';
import { buildSubject, buildHtml, buildText } from './emailTemplates';

/**
 * Proveedor de correo por SMTP de Gmail con una "contraseña de aplicación"
 * (requiere verificación en 2 pasos en la cuenta). Gratis y suficiente para
 * el volumen del ministerio (~500 correos/día de límite).
 *
 * Los timeouts son cortos a propósito: el backend corre en Azure F1 con un
 * timeout global de 30 s por request, y los envíos de cumpleaños se hacen
 * en serie dentro de una sola petición del cron.
 */
export class GmailProvider implements EmailProvider {
  private transporter: Transporter | null = null;
  private readonly user: string;
  private readonly fromName: string;

  constructor() {
    this.user = env.email.user;
    this.fromName = env.email.fromName;

    if (this.user && env.email.appPassword) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: this.user, pass: env.email.appPassword },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
      });
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  getProviderName(): string {
    return 'Gmail';
  }

  async sendEmail(params: EmailParams): Promise<void> {
    if (!this.transporter) {
      logger.warn('Gmail no está configurado, omitiendo envío de email', {
        context: 'GmailProvider',
        method: 'sendEmail',
        toEmail: params.toEmail,
      });
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: { name: this.fromName, address: this.user },
        to: { name: params.toName, address: params.toEmail },
        subject: buildSubject(params),
        html: buildHtml(params),
        text: buildText(params),
      });

      logger.info('Email enviado exitosamente con Gmail', {
        context: 'GmailProvider',
        method: 'sendEmail',
        type: params.type,
        toEmail: params.toEmail,
        messageId: info.messageId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error('Error enviando email con Gmail', {
        context: 'GmailProvider',
        method: 'sendEmail',
        error: errorMessage,
        toEmail: params.toEmail,
        type: params.type,
      });

      // Re-lanzar para que quien llama decida (emailService lo loguea;
      // birthdayEmailService revierte la reserva de envío).
      throw new Error(`Gmail error: ${errorMessage}`);
    }
  }
}
