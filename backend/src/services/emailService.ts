import dotenv from 'dotenv';
import logger from '../utils/logger';
import { EmailProvider, EmailParams } from './emailProviders/EmailProviderInterface';
import { AzureProvider } from './emailProviders/AzureProvider';

// Cargar variables de entorno
dotenv.config();

class EmailService {
  private azureProvider: AzureProvider;

  constructor() {
    this.azureProvider = new AzureProvider();

    logger.info(`Servicio de email inicializado con Azure Communication Services`, {
      context: 'EmailService',
      method: 'constructor',
      provider: this.azureProvider.getProviderName(),
    });
  }

  /**
   * Verificar si el servicio está configurado correctamente
   */
  isConfigured(): boolean {
    return this.azureProvider.isConfigured();
  }


  /**
   * Enviar email usando Azure Communication Services
   */
  async sendEmail(params: EmailParams): Promise<void> {
    if (!this.isConfigured()) {
      logger.warn('Azure Communication Services no está configurado, omitiendo envío de email', {
        context: 'EmailService',
        method: 'sendEmail',
        toEmail: params.toEmail,
        type: params.type,
      });
      return;
    }

    try {
      await this.azureProvider.sendEmail(params);
      
      logger.info('Email enviado exitosamente con Azure Communication Services', {
        context: 'EmailService',
        method: 'sendEmail',
        type: params.type,
        toEmail: params.toEmail,
        provider: this.azureProvider.getProviderName(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = error instanceof Error ? error.stack : JSON.stringify(error);
      
      logger.error('Error enviando email con Azure Communication Services', {
        context: 'EmailService',
        method: 'sendEmail',
        error: errorMessage,
        errorDetails: errorDetails,
        toEmail: params.toEmail,
        type: params.type,
        provider: this.azureProvider.getProviderName(),
      });

      // No lanzar error para no interrumpir el flujo principal
      // Solo loguear el error
    }
  }
}

export const emailService = new EmailService();

