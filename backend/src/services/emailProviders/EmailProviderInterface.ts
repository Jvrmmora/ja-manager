export interface EmailParams {
  toEmail: string;
  toName: string;
  subject?: string;
  message: string;
  type: 'registration_request' | 'approval' | 'rejection';
  placa?: string;
  rejectionReason?: string;
}

export interface EmailProvider {
  /**
   * Verificar si el proveedor está configurado correctamente
   */
  isConfigured(): boolean;

  /**
   * Enviar email usando el proveedor específico
   */
  sendEmail(params: EmailParams): Promise<void>;

  /**
   * Obtener el nombre del proveedor
   */
  getProviderName(): string;
}
