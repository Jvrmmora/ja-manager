import logger from '../utils/logger';
import { EmailProvider, EmailParams } from './emailProviders/EmailProviderInterface';
import { GmailProvider } from './emailProviders/GmailProvider';

class EmailService {
  private provider: EmailProvider;

  constructor() {
    this.provider = new GmailProvider();

    logger.info('Servicio de email inicializado', {
      context: 'EmailService',
      method: 'constructor',
      provider: this.provider.getProviderName(),
      configured: this.provider.isConfigured(),
    });
  }

  /**
   * Verificar si el servicio está configurado correctamente
   */
  isConfigured(): boolean {
    return this.provider.isConfigured();
  }

  getProviderName(): string {
    return this.provider.getProviderName();
  }

  /**
   * Enviar email. Nunca lanza: los errores se loguean para no interrumpir
   * el flujo principal (registro, aprobación, etc.). Quien necesite saber si
   * el envío falló debe usar `sendEmailOrThrow`.
   */
  async sendEmail(params: EmailParams): Promise<void> {
    try {
      await this.sendEmailOrThrow(params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = error instanceof Error ? error.stack : JSON.stringify(error);

      logger.error('Error enviando email', {
        context: 'EmailService',
        method: 'sendEmail',
        error: errorMessage,
        errorDetails,
        toEmail: params.toEmail,
        type: params.type,
        provider: this.provider.getProviderName(),
      });
    }
  }

  /**
   * Enviar email propagando el error al llamador.
   */
  async sendEmailOrThrow(params: EmailParams): Promise<void> {
    if (!this.isConfigured()) {
      logger.warn('Servicio de email no configurado, omitiendo envío', {
        context: 'EmailService',
        method: 'sendEmailOrThrow',
        toEmail: params.toEmail,
        type: params.type,
        provider: this.provider.getProviderName(),
      });
      throw new Error('Servicio de email no configurado');
    }

    await this.provider.sendEmail(params);

    logger.info('Email enviado exitosamente', {
      context: 'EmailService',
      method: 'sendEmailOrThrow',
      type: params.type,
      toEmail: params.toEmail,
      provider: this.provider.getProviderName(),
    });
  }
}

export const emailService = new EmailService();
