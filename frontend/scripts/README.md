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

## `gen:icons` — favicons e iconos PWA

```bash
cd frontend
npm run gen:icons
```

Genera `favicon.svg/.ico`, `favicon-32x32.png`, `apple-touch-icon.png`,
`icon-192.png`, `icon-512.png`, `icon-maskable-512.png` a partir de
`src/assets/logos/logo.png`.
