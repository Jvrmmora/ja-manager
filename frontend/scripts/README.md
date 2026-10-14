# Scripts de assets

## `gen:og` — imagen Open Graph (WhatsApp / Facebook / LinkedIn)

Genera `frontend/public/og-image.jpg` (1200×630): fondo de marca + logo en panel
claro + titular + dominio. El texto se rasteriza como paths con `opentype.js`,
así que no depende de que sharp tenga fuentes del sistema.

```bash
cd frontend
npm run gen:og
```

- Fuente del logo: `src/assets/logos/logo_3.png`.
- Fuentes de texto: Arial Black / Arial Bold del sistema (solo en generación; el
  JPG resultante se commitea).
- Para cambiar titular, colores o layout: editar `scripts/generate-og-image.js`.

Tras regenerarla:

1. Commit + deploy.
2. https://developers.facebook.com/tools/debug/ → pega `https://jovenesmodelia.com`
   → **Scrape Again** (WhatsApp cachea el preview viejo ~1-4 semanas).
3. Comparte el enlace en WhatsApp para verificar.

## `gen:og:share` — previews de /ranking y /cumpleanos

Genera `og-ranking.jpg` y `og-cumpleanos.jpg` (1200×630), las imágenes que
WhatsApp muestra al compartir el ranking semanal o los cumpleaños del mes.

```bash
cd frontend
npm run gen:og:share
```

Tras regenerarlas, pasa `https://jovenesmodelia.com/ranking` y
`https://jovenesmodelia.com/cumpleanos` por el debugger de Facebook → **Scrape Again**.

## `gen:og:sections` — previews de cada sección de la landing

Genera `og-section-<id>.jpg` (1200×630) para `about`, `meetings`, `events`,
`gallery`, `resources`, `testimonials` y `location`, cada una con su ícono
(p. ej. el pin de mapa en Ubicación). Se usan al compartir el enlace del botón
"copiar enlace" de cada sección.

```bash
cd frontend
npm run gen:og:sections
```

El enlace compartido es `/s/<id>` (el `#hash` no llega a los scrapers): el build
(`prerenderMeta` en `vite.config.ts`) escribe `dist/s/<id>/index.html` con el OG
de la sección y una redirección a `/#<id>`. Las secciones y sus textos viven en
`SECTION_SHARES` (`src/seo/config.ts`); si agregas una, añade también su entrada
en este script y su ruta en `public/staticwebapp.config.json`.

## `gen:icons` — favicons e iconos PWA

```bash
cd frontend
npm run gen:icons
```

Genera `favicon.svg/.ico`, `favicon-32x32.png`, `apple-touch-icon.png`,
`icon-192.png`, `icon-512.png`, `icon-maskable-512.png` a partir de
`src/assets/logos/logo.png`.
