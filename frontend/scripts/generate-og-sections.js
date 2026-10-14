#!/usr/bin/env node

/**
 * Genera la imagen Open Graph (1200x630) de cada sección compartible de la
 * landing (botón "copiar enlace" -> /s/<id>):
 *
 *   frontend/public/og-section-<id>.jpg   (about, meetings, events, gallery,
 *                                          resources, testimonials, location)
 *
 *   cd frontend && npm run gen:og:sections
 *
 * Mismo método y paleta que generate-og-share-images.js (texto rasterizado con
 * opentype.js + sharp, logo en panel claro), más un ícono grande por sección
 * (el pin de mapa en "Ubicación", etc.). Los ids deben coincidir con
 * SECTION_SHARES en src/seo/config.ts. Es un script de uso manual; los JPG
 * resultantes se commitean. Tras regenerarlos, pasa la URL por
 * https://developers.facebook.com/tools/debug/ -> "Scrape Again".
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import opentype from 'opentype.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const LOGO_PATH = path.join(PROJECT_ROOT, 'frontend/src/assets/logos/logo_3.png');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'frontend/public');

const FONT_BLACK = '/System/Library/Fonts/Supplemental/Arial Black.ttf';
const FONT_BOLD = '/System/Library/Fonts/Supplemental/Arial Bold.ttf';

const W = 1200;
const H = 630;

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('❌ Falta sharp. Instala con: cd frontend && npm install --save-dev sharp');
  process.exit(1);
}

for (const f of [LOGO_PATH, FONT_BLACK, FONT_BOLD]) {
  if (!fs.existsSync(f)) {
    console.error(`❌ No encontrado: ${f}`);
    process.exit(1);
  }
}

const fontBlack = opentype.loadSync(FONT_BLACK);
const fontBold = opentype.loadSync(FONT_BOLD);

function textPath(font, text, x, y, size, fill, letterSpacing = 0) {
  if (!letterSpacing) {
    return `<path d="${font.getPath(text, x, y, size).toPathData(2)}" fill="${fill}"/>`;
  }
  let cursor = x;
  const parts = [];
  for (const ch of text) {
    const p = font.getPath(ch, cursor, y, size);
    parts.push(p.toPathData(2));
    cursor += font.getAdvanceWidth(ch, size) + letterSpacing;
  }
  return `<path d="${parts.join(' ')}" fill="${fill}"/>`;
}

const LOGO_H = 300;
const logo = await sharp(fs.readFileSync(LOGO_PATH))
  .trim()
  .resize({ height: LOGO_H })
  .png()
  .toBuffer();
const lm = await sharp(logo).metadata();

const PANEL_PAD = 38;
const panelW = lm.width + PANEL_PAD * 2;
const panelH = lm.height + PANEL_PAD * 2;
const panelX = 72;
const panelY = Math.round((H - panelH) / 2);
const logoX = panelX + PANEL_PAD;
const logoY = panelY + PANEL_PAD;
const textX = panelX + panelW + 64;

// Íconos (rejilla 24x24, trazo). Geometría estilo Lucide.
const ICONS = {
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  clock:
    '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  calendar:
    '<path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  book:
    '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  message:
    '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
};

// Una entrada por sección. `id` debe existir en SECTION_SHARES.
const SECTIONS = [
  {
    id: 'about',
    glow: '#F9A23B',
    badgeFrom: '#FDE68A',
    badgeTo: '#F9A23B',
    icon: 'users',
    eyebrow: 'QUIÉNES SOMOS',
    line1: 'Una familia',
    line2: 'en la fe',
    sub: 'Jóvenes adventistas unidos en Cristo',
  },
  {
    id: 'meetings',
    glow: '#F26A2E',
    badgeFrom: '#F9A23B',
    badgeTo: '#F26A2E',
    icon: 'clock',
    eyebrow: 'REUNIONES',
    line1: 'Nuestras',
    line2: 'reuniones',
    sub: 'Descubre cuándo y dónde nos reunimos',
  },
  {
    id: 'events',
    glow: '#DC3340',
    badgeFrom: '#F9A23B',
    badgeTo: '#F26A2E',
    icon: 'calendar',
    eyebrow: 'EVENTOS',
    line1: 'Próximos',
    line2: 'eventos',
    sub: 'Actividades para vivir la fe juntos',
  },
  {
    id: 'gallery',
    glow: '#8A1C45',
    badgeFrom: '#FDE68A',
    badgeTo: '#F9A23B',
    icon: 'image',
    eyebrow: 'GALERÍA',
    line1: 'Nuestros',
    line2: 'momentos',
    sub: 'Mira cómo se vive Jóvenes Modelia',
  },
  {
    id: 'resources',
    glow: '#F9A23B',
    badgeFrom: '#F9A23B',
    badgeTo: '#F26A2E',
    icon: 'book',
    eyebrow: 'RECURSOS',
    line1: 'Recursos',
    line2: 'para crecer',
    sub: 'Material para fortalecer tu fe',
  },
  {
    id: 'testimonials',
    glow: '#DC3340',
    badgeFrom: '#FDE68A',
    badgeTo: '#F9A23B',
    icon: 'message',
    eyebrow: 'TESTIMONIOS',
    line1: 'Historias',
    line2: 'que inspiran',
    sub: 'Lo que Dios hace en nuestros jóvenes',
  },
  {
    id: 'location',
    glow: '#F26A2E',
    badgeFrom: '#F9A23B',
    badgeTo: '#DC3340',
    icon: 'pin',
    eyebrow: 'UBICACIÓN',
    line1: 'Ven a',
    line2: 'visitarnos',
    sub: 'Mira cómo llegar a Jóvenes Modelia',
    rings: true,
  },
];

const MAX_TEXT_W = W - textX - 48;

async function render({ id, glow, badgeFrom, badgeTo, icon, eyebrow, line1, line2, sub, rings }) {
  for (const [label, font, text, size] of [
    ['line1', fontBlack, line1, 66],
    ['line2', fontBlack, line2, 66],
    ['sub', fontBold, sub, 26],
  ]) {
    const w = font.getAdvanceWidth(text, size);
    if (w > MAX_TEXT_W) {
      console.warn(`⚠️  ${id}.${label} mide ${Math.round(w)}px (máx ${MAX_TEXT_W}) — acórtalo`);
    }
  }

  // Marca de agua: ícono grande abajo a la derecha, con halo de anillos en "Ubicación"
  const wmSize = 330;
  const wmX = W - wmSize - 30;
  const wmY = H - wmSize - 14;
  const wmScale = wmSize / 24;
  const cx = wmX + wmSize / 2;
  const cy = wmY + wmSize * 0.9;
  const ringsSvg = rings
    ? [70, 120, 170]
        .map(
          (r, i) =>
            `<ellipse cx="${cx}" cy="${cy}" rx="${r * 1.5}" ry="${r * 0.5}" fill="none" stroke="#F9A23B" stroke-opacity="${0.34 - i * 0.09}" stroke-width="3"/>`
        )
        .join('')
    : '';

  const svg = Buffer.from(`
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#140B10"/>
      <stop offset="0.6" stop-color="#1E1218"/>
      <stop offset="1" stop-color="#3A0F2C"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.72" cy="0.3" r="0.65">
      <stop offset="0" stop-color="${glow}" stop-opacity="0.38"/>
      <stop offset="1" stop-color="${glow}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F9A23B"/>
      <stop offset="0.5" stop-color="#F26A2E"/>
      <stop offset="1" stop-color="#DC3340"/>
    </linearGradient>
    <linearGradient id="badge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${badgeFrom}"/>
      <stop offset="1" stop-color="${badgeTo}"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="0" y="0" width="12" height="${H}" fill="url(#accent)"/>

  ${ringsSvg}
  <g transform="translate(${wmX} ${wmY}) scale(${wmScale})" fill="none" stroke="#F9A23B" stroke-opacity="0.3" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round">
    ${ICONS[icon]}
  </g>

  <rect x="${panelX}" y="${panelY}" width="${panelW}" height="${panelH}" rx="28" fill="#FFF8F1"/>

  <rect x="${textX}" y="88" width="56" height="56" rx="16" fill="url(#badge)"/>
  <g transform="translate(${textX + 11} 99) scale(1.5)" fill="none" stroke="#140B10" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
    ${ICONS[icon]}
  </g>
  ${textPath(fontBlack, eyebrow, textX + 74, 125, 20, '#F9A23B', 2)}

  ${textPath(fontBlack, line1, textX, 226, 66, '#FFFFFF')}
  ${textPath(fontBlack, line2, textX, 304, 66, '#FFFFFF')}
  ${textPath(fontBold, sub, textX, 358, 26, '#E6D3C4')}

  <rect x="${textX}" y="396" width="470" height="2" fill="#4A3840"/>

  ${textPath(fontBold, 'jovenesmodelia.com', textX, 450, 28, '#F0E2D6')}
  ${textPath(fontBold, 'Jóvenes Modelia · Bogotá', textX, 490, 20, '#8A6A76')}
</svg>
`);

  const file = `og-section-${id}.jpg`;
  await sharp(svg)
    .composite([{ input: logo, left: logoX, top: logoY }])
    .jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
    .toFile(path.join(PUBLIC_DIR, file));
  console.log(`✅ ${file} generada (${W}x${H})`);
}

for (const section of SECTIONS) {
  await render(section);
}

console.log('   Publica y luego: https://developers.facebook.com/tools/debug/ -> Scrape Again');
