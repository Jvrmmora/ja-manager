import { Helmet } from 'react-helmet-async';
import {
  DEFAULT_IMAGE,
  LOCALE,
  SITE_NAME,
  SITE_URL,
} from '../seo/config';

interface SeoProps {
  title: string;
  description?: string | undefined;
  /** Ruta canónica relativa, ej: "/register". Por defecto la actual. */
  path?: string | undefined;
  image?: string | undefined;
  noindex?: boolean | undefined;
  type?: 'website' | 'article' | undefined;
}

/**
 * Metadatos por página. En la SPA actualiza <head> al navegar; en el build el
 * plugin de prerender (vite.config.ts) escribe estos mismos valores en el HTML
 * estático de cada ruta pública.
 */
export default function Seo({
  title,
  description,
  path,
  image = DEFAULT_IMAGE,
  noindex = false,
  type = 'website',
}: SeoProps) {
  const canonical = `${SITE_URL}${path ?? (typeof window !== 'undefined' ? window.location.pathname : '/')}`;

  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={canonical} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={LOCALE} />
      <meta property="og:title" content={title} />
      {description && (
        <meta property="og:description" content={description} />
      )}
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      {description && (
        <meta name="twitter:description" content={description} />
      )}
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
