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
  /** og:image / twitter:image específica de la ruta (URL absoluta). Por defecto DEFAULT_IMAGE. */
  image?: string;
  /** Si se define, <link rel="canonical"> apunta a esta ruta en vez de a `path`. */
  canonicalPath?: string;
  /** Si se define, la página prerenderizada redirige (JS) a esta URL al abrirse. */
  redirectTo?: string;
}

export const ROUTES: RouteSeo[] = [
  {
    path: '/',
    title: 'Jóvenes Modelia Bogotá — Comunidad de Jóvenes Adventistas',
    description:
      'Somos Jóvenes Modelia: más de 50 jóvenes adventistas en Bogotá unidos por la fe en Cristo. Regístrate y participa en nuestras actividades semanales.',
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
    path: '/admin/landing',
    title: 'Landing CMS — Jóvenes Modelia',
    description: 'Editor del contenido de la landing de Jóvenes Modelia.',
    noindex: true,
  },
  {
    path: '/admin/forms',
    title: 'Formularios — Jóvenes Modelia',
    description: 'Formularios de eventos de Jóvenes Modelia.',
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
    title: '¡Hola! Registra tu asistencia — Jóvenes Modelia',
    description:
      'Toca este enlace y confirma tu presencia de hoy. No necesitas escanear el QR — suma tus puntos al instante.',
    noindex: true,
    prerender: true,
    image: `${SITE_URL}/og-attendance.jpg`,
  },
  {
    path: '/ranking',
    title: 'Ranking de la temporada — Jóvenes Modelia',
    description:
      '¿Quién va liderando esta semana? Mira el podio, el Top 20 y en qué puesto vas tú.',
    noindex: true,
    prerender: true,
    image: `${SITE_URL}/og-ranking.jpg`,
  },
  {
    path: '/cumpleanos',
    title: 'Cumpleaños del mes — Jóvenes Modelia',
    description:
      'Mira quiénes cumplen años este mes en Jóvenes Modelia y no olvides saludarlos.',
    noindex: true,
    prerender: true,
    image: `${SITE_URL}/og-cumpleanos.jpg`,
  },
];

/**
 * Secciones de la landing que se pueden compartir. El hash (#location) no llega
 * al servidor, así que los scrapers de WhatsApp/Facebook nunca verían un OG
 * propio. Por eso el botón "copiar enlace" comparte /s/<id>: una página
 * prerenderizada con el OG de la sección que redirige a /#<id>. Las imágenes se
 * generan con `npm run gen:og:sections`.
 */
export interface SectionShare {
  /** id del <section> en la landing */
  id: string;
  title: string;
  description: string;
}

export const SECTION_SHARES: SectionShare[] = [
  {
    id: 'about',
    title: 'Quiénes somos — Jóvenes Modelia',
    description:
      'Conoce a Jóvenes Modelia: una comunidad de jóvenes adventistas en Bogotá unidos por la fe en Cristo.',
  },
  {
    id: 'meetings',
    title: 'Nuestras reuniones — Jóvenes Modelia',
    description:
      'Descubre cuándo y dónde nos reunimos cada semana en Jóvenes Modelia. ¡Hay un lugar para ti!',
  },
  {
    id: 'events',
    title: 'Próximos eventos — Jóvenes Modelia',
    description:
      'Mira las próximas actividades y encuentros de Jóvenes Modelia y vive la fe junto a nosotros.',
  },
  {
    id: 'gallery',
    title: 'Galería — Jóvenes Modelia',
    description:
      'Fotos y momentos de nuestra comunidad de Jóvenes Modelia en Bogotá.',
  },
  {
    id: 'resources',
    title: 'Recursos para crecer — Jóvenes Modelia',
    description:
      'Material y recursos de Jóvenes Modelia para fortalecer tu vida espiritual.',
  },
  {
    id: 'testimonials',
    title: 'Testimonios — Jóvenes Modelia',
    description:
      'Historias de jóvenes que han vivido la fe en Jóvenes Modelia. Lee lo que Dios ha hecho en ellos.',
  },
  {
    id: 'location',
    title: 'Ubicación — Jóvenes Modelia',
    description:
      'Encuentra cómo llegar a Jóvenes Modelia en Bogotá. Te esperamos con los brazos abiertos.',
  },
];

/** Ruta pública de la página compartible de una sección. */
export const sectionSharePath = (id: string) => `/s/${id}`;

/** SEO prerenderizable de cada sección compartible (lo consume el plugin de Vite). */
export const SECTION_ROUTES: RouteSeo[] = SECTION_SHARES.map(s => ({
  path: sectionSharePath(s.id),
  title: s.title,
  description: s.description,
  noindex: true,
  prerender: true,
  image: `${SITE_URL}/og-section-${s.id}.jpg`,
  canonicalPath: '/',
  redirectTo: `/#${s.id}`,
}));

export function seoForPath(pathname: string): RouteSeo | null {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return ROUTES.find(r => r.path === clean) ?? null;
}
