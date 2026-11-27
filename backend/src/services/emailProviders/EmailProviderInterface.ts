export interface EmailParams {
  toEmail: string;
  toName: string;
  subject?: string;
  message: string;
  type:
    | 'registration_request'
    | 'approval'
    | 'rejection'
    | 'birthday'
    | 'welcome'
    | 'new_user_notification'
    | 'password_reset'
    | 'password_changed';
  placa?: string;
  rejectionReason?: string;
  // Para emails de solicitud de registro: información del solicitante
  applicantName?: string;
  applicantEmail?: string;
  // Para emails de cumpleaños
  birthdayToken?: string; // flujo legado de reclamo manual (/birthday-claim)
  birthdayPoints?: number;
  profileImage?: string | null; // foto del joven para el avatar de la tarjeta (si no hay, se usan iniciales)
  birthdayCtaUrl?: string; // enlace del botón "Visitar el sitio" (por defecto /login?placa=...)
  // Para email de bienvenida: enlace al dashboard
  dashboardUrl?: string;
  // Para el código de recuperación de contraseña (password_reset)
  resetCode?: string; // 6 dígitos
  expiresInMinutes?: number;
  // Para el aviso de contraseña cambiada (password_changed): fecha ISO del cambio
  changedAt?: string;
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
