const SITE_ORIGIN = 'https://www.jovenesmodelia.com';

/**
 * Construye la URL de login que se comparte con los jóvenes (tarjeta de
 * bienvenida, WhatsApp). Debe apuntar siempre a /login: la raíz "/" es la
 * landing pública, no el formulario de acceso.
 */
export const buildLoginUrl = (placa?: string | null): string =>
  placa
    ? `${SITE_ORIGIN}/login?placa=${encodeURIComponent(placa)}`
    : `${SITE_ORIGIN}/login`;
