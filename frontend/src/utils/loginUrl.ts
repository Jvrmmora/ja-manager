export const SITE_ORIGIN = 'https://www.jovenesmodelia.com';

/**
 * Construye la URL de login que se comparte con los jóvenes (tarjeta de
 * bienvenida, WhatsApp). Debe apuntar siempre a /login: la raíz "/" es la
 * landing pública, no el formulario de acceso.
 */
export const buildLoginUrl = (placa?: string | null): string =>
  placa
    ? `${SITE_ORIGIN}/login?placa=${encodeURIComponent(placa)}`
    : `${SITE_ORIGIN}/login`;

/**
 * Devuelve `returnUrl` solo si es una ruta interna segura ("/ranking",
 * "/cumpleanos?mes=10"). Evita redirecciones abiertas tipo "//evil.com" o
 * "https://evil.com" tras el login.
 */
export const safeReturnUrl = (value?: string | null): string | null => {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return null;
  }
  if (value.startsWith('/login')) return null;
  return value;
};

/** URL de login que, tras iniciar sesión, devuelve al usuario a `path`. */
export const buildLoginRedirect = (path: string): string =>
  `/login?returnUrl=${encodeURIComponent(path)}`;
