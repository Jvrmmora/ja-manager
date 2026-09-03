# 📈 Guía de SEO para Jóvenes Modelia

## ✅ Estado actual

1. ✅ **index.html** - Meta tags (Open Graph, Twitter, JSON-LD Organization + WebApplication),
   `preconnect` a Google Fonts, `<noscript>` con contenido rastreable.
2. ✅ **Metadatos por ruta** - `frontend/src/seo/config.ts` es la fuente de verdad.
   `<RouteSeo>` los aplica en runtime (react-helmet-async).
3. ✅ **Prerender** - El plugin `prerenderMeta` en `vite.config.ts` genera
   `dist/register/index.html` y `dist/login/index.html` con su `<head>` propio en
   cada build, para que WhatsApp / Facebook / LinkedIn (que no ejecutan JS) muestren
   el título y la descripción correctos por página.
4. ✅ **sitemap.xml** - Se **regenera en cada build** desde las rutas indexables con
   `lastmod` actual. No editar a mano (`frontend/public/sitemap.xml` ya no existe).
5. ✅ **robots.txt** - Bloquea `/api`, `/admin`, `/dashboard`, `/login`, `/birthday-claim`, `/attendance/`.
6. ✅ **manifest.json + iconos** - Iconos PWA reales 192/512 + maskable + apple-touch-icon (180)
   - favicon.svg/.ico. Regenerar con `cd frontend && npm run gen:icons`.

### Para añadir una ruta pública nueva al SEO

Edita `frontend/src/seo/config.ts` → añade una entrada a `ROUTES`
(`prerender: true` si quieres HTML estático por ruta). El sitemap y el prerender
se actualizan solos en el siguiente `npm run build`.

---

## 🚀 Pasos para Indexar en Google

### Paso 1: Verificar en Google Search Console

1. Ve a [Google Search Console](https://search.google.com/search-console)
2. Agrega tu propiedad:
   - Ingresa: `https://jovenesmodelia.com`
   - O `https://www.jovenesmodelia.com` (el que prefieras)
3. Verifica propiedad mediante uno de estos métodos:

#### Opción A: HTML Tag (Más fácil)

- Google te dará un meta tag
- Cópialo y pégalo en `<head>` de `index.html`

#### Opción B: Archivo HTML

- Descarga el archivo que Google te da
- Súbelo a la raíz de tu sitio: `/public/google-xxxxx.html`

#### Opción C: DNS (Recomendado si tienes acceso)

- Agrega el registro TXT que Google te da en Namecheap

### Paso 2: Enviar Sitemap

1. En Google Search Console, ve a **Sitemaps**
2. Ingresa: `https://jovenesmodelia.com/sitemap.xml`
3. Haz clic en **Enviar**

### Paso 3: Verificar URLs

1. Ve a **Inspección de URL**
2. Ingresa tu URL principal: `https://jovenesmodelia.com`
3. Haz clic en **Solicitar indexación**
4. Repite para `https://www.jovenesmodelia.com`

---

## 📊 Verificaciones SEO

### Verificar Meta Tags

Abre tu sitio y en la consola del navegador:

```javascript
// Verificar Open Graph
document.querySelector('meta[property="og:title"]')?.content;

// Verificar JSON-LD
JSON.parse(
  document.querySelector('script[type="application/ld+json"]').textContent
);
```

### Verificar Robots.txt

Visita: `https://jovenesmodelia.com/robots.txt`

Debe mostrar:

```
User-agent: *
Allow: /
Sitemap: https://jovenesmodelia.com/sitemap.xml
```

### Verificar Sitemap

Visita: `https://jovenesmodelia.com/sitemap.xml`

Debe mostrar el XML con las URLs de tu sitio.

---

## 🔍 Herramientas de Verificación

### 1. Google Rich Results Test

- URL: https://search.google.com/test/rich-results
- Ingresa: `https://jovenesmodelia.com`
- Verifica que detecte el JSON-LD

### 2. Facebook Sharing Debugger

- URL: https://developers.facebook.com/tools/debug/
- Ingresa: `https://jovenesmodelia.com`
- Verifica que muestre correctamente el Open Graph

### 3. Twitter Card Validator

- URL: https://cards-dev.twitter.com/validator
- Ingresa: `https://jovenesmodelia.com`
- Verifica que muestre correctamente las Twitter Cards

### 4. PageSpeed Insights

- URL: https://pagespeed.web.dev/
- Ingresa: `https://jovenesmodelia.com`
- Verifica rendimiento y SEO

---

## 📝 Próximos Pasos Recomendados

### 1. ✅ Imagen OG (Open Graph) para WhatsApp — HECHA

`frontend/public/og-image.jpg` (1200×630) es una tarjeta de marca: fondo oscuro
degradado + logo en panel claro + "Jóvenes Modelia" + dominio.

Regenerar / retocar:

```bash
cd frontend
npm run gen:og      # edita scripts/generate-og-image.js para cambiar textos/colores
```

**Después de cambiarla:**

1. Commit + deploy
2. https://developers.facebook.com/tools/debug/ → pega `https://jovenesmodelia.com`
   → "Scrape Again" (WhatsApp cachea el preview viejo ~1-4 semanas)
3. Comparte el enlace en WhatsApp para verificar

### 2. Actualizar Sitemap dinámicamente

Cuando agregues nuevas páginas, actualiza `sitemap.xml` o implementa generación dinámica.

### 3. Google Analytics 4

La aplicación ya incluye integración para una propiedad GA4 y registra las vistas
de las páginas públicas cuando existe `VITE_GA_MEASUREMENT_ID`. No agregues otra
etiqueta de Google Analytics en `index.html`, porque produciría mediciones duplicadas.

1. Entra a [Google Analytics](https://analytics.google.com/), crea una cuenta o
   selecciona la existente y crea una propiedad GA4.
2. En **Administrador → Flujos de datos → Web**, crea un flujo con
   `https://jovenesmodelia.com`.
3. Copia el **ID de medición**, con formato `G-XXXXXXXXXX`.
4. Configura `VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX` en las variables de entorno
   del frontend de cada entorno. En local puedes usar un archivo `.env.local`.
5. Vuelve a construir y desplegar el frontend. En Analytics abre **Informes →
   Tiempo real** y visita la web en una ventana de incógnito para comprobarlo.

La integración respeta la navegación SPA y excluye las rutas `/admin` y
`/dashboard`. No envíes nombres, teléfonos, correos ni otros datos personales a
Analytics.

### 4. Google Tag Manager (Opcional)

Para mejor gestión de tags y tracking.

---

## ⚠️ Notas Importantes

1. **Canonical URL**: Ya configurado en `index.html` para evitar contenido duplicado
2. **HTTPS**: Asegúrate de que SSL esté activo (ya lo tienes ✅)
3. **Mobile-First**: Tu sitio ya es responsive ✅
4. **Tiempo de Indexación**: Google puede tardar de 1 día a 1 semana en indexar

---

## 📈 Monitoreo

Después de 1 semana:

1. Revisa Google Search Console → Cobertura
2. Verifica qué páginas están indexadas
3. Revisa errores y advertencias
4. Monitorea búsquedas que llevan a tu sitio

---

## 🔗 Enlaces Útiles

- [Google Search Console](https://search.google.com/search-console)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Schema.org Documentation](https://schema.org/)
- [Open Graph Protocol](https://ogp.me/)
