/**
 * Configuración SEO compartida (fuente de verdad única).
 *
 * La consumen:
 *  - el componente <Seo> en runtime (títulos/meta por ruta en la SPA)
 *  - el plugin de prerender en vite.config.ts, que genera un index.html por
 *    ruta pública con estos metadatos ya incrustados en el <head>, para que
 *    Google y los scrapers de redes sociales (WhatsApp, Facebook, LinkedIn,
 *    que NO ejecutan JavaScript) vean el título y la descripción correctos.
 */

export const SITE_URL = 'https://jovenesmodelia.com';
export const SITE_NAME = 'Jóvenes Modelia';
export const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;
export const LOCALE = 'es_CO';

export interface RouteSeo {
  /** Ruta, empieza por "/" */
  path: string;
  /** <title> completo */
  title: string;
  /** meta description (~155 caracteres) */
  description: string;
  /** true => <meta name="robots" content="noindex,nofollow"> */
  noindex?: boolean;
  /** true => generar dist/<path>/index.html en el build */
  prerender?: boolean;
}

export const ROUTES: RouteSeo[] = [
  {
    path: '/',
    title: 'Jóvenes Adventistas Modelia - Bogotá',
    description:
      'Plataforma digital oficial de Jóvenes Modelia. Registra tu asistencia con QR, gana puntos, compite en rankings y conecta con otros jóvenes adventistas en Bogotá.',
    prerender: true,
  },
  {
    path: '/register',
    title: 'Únete a Jóvenes Modelia — Registro gratuito',
    description:
      'Regístrate gratis en la comunidad de Jóvenes Adventistas de Modelia, Bogotá. Participa en actividades, gana puntos por tu asistencia y haz nuevos amigos.',
    prerender: true,
  },
  {
    path: '/login',
    title: 'Iniciar sesión — Jóvenes Modelia',
    description:
      'Accede a tu cuenta de Jóvenes Modelia para ver tu perfil, tu historial de asistencia y tu posición en el ranking.',
    noindex: true,
    prerender: true,
  },
  {
    path: '/dashboard',
    title: 'Mi panel — Jóvenes Modelia',
    description: 'Panel personal de miembros de Jóvenes Modelia.',
    noindex: true,
  },
  {
    path: '/admin',
    title: 'Administración — Jóvenes Modelia',
    description: 'Panel de administración de Jóvenes Modelia.',
    noindex: true,
  },
  {
    path: '/birthday-claim',
    title: 'Reclama tus puntos de cumpleaños — Jóvenes Modelia',
    description: 'Reclama tus puntos de cumpleaños en Jóvenes Modelia.',
    noindex: true,
  },
  {
    path: '/attendance/scan',
    title: 'Escanear asistencia — Jóvenes Modelia',
    description: 'Registro de asistencia por código QR.',
    noindex: true,
  },
];

export function seoForPath(pathname: string): RouteSeo | null {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return ROUTES.find(r => r.path === clean) ?? null;
}
