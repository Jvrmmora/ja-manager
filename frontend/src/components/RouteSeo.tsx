import { useLocation } from 'react-router-dom';
import Seo from './Seo';
import { seoForPath } from '../seo/config';

/**
 * Aplica los metadatos SEO de `src/seo/config.ts` según la ruta activa.
 * Se monta una vez dentro del Router. Las páginas pueden renderizar su propio
 * <Seo> para casos con datos dinámicos (tiene prioridad por orden de montaje).
 */
export default function RouteSeo() {
  const { pathname } = useLocation();
  const route = seoForPath(pathname);

  if (!route) {
    // Rutas no declaradas (incluye 404): no indexar.
    return (
      <Seo
        title="Página no encontrada — Jóvenes Modelia"
        description="La página que buscas no existe."
        noindex
      />
    );
  }

  return (
    <Seo
      title={route.title}
      description={route.description || undefined}
      path={route.path}
      noindex={route.noindex}
    />
  );
}
