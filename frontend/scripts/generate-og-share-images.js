#!/usr/bin/env node

/**
 * Genera las imágenes Open Graph (1200x630) de las vistas que se comparten por
 * WhatsApp cada semana:
 *   - /ranking     -> frontend/public/og-ranking.jpg
 *   - /cumpleanos  -> frontend/public/og-cumpleanos.jpg
 *
 *   cd frontend && node scripts/generate-og-share-images.js
 *
 * Mismo método que generate-og-attendance-image.js (texto rasterizado con
 * opentype.js + sharp), con la paleta de marca del rediseño. Es un script de
 * uso manual; los JPG resultantes se commitean. Tras regenerarlos, pasa la URL
 * por https://developers.facebook.com/tools/debug/ -> "Scrape Again" para
 * limpiar la caché de WhatsApp.
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

// Íconos de la insignia superior (trazo blanco, 24x24 escalado)
const ICONS = {
  trophy:
    'M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M18 2H6v7a6 6 0 0 0 12 0V2ZM10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22',
  cake:
    'M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1M2 21h20M7 8v3M12 8v3M17 8v3M7 4h.01M12 4h.01M17 4h.01',
};

async function render({ file, glow, badgeFrom, badgeTo, icon, eyebrow, line1, line2, sub, foot }) {
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

  <rect x="${panelX}" y="${panelY}" width="${panelW}" height="${panelH}" rx="28" fill="#FFF8F1"/>

  <rect x="${textX}" y="92" width="48" height="48" rx="14" fill="url(#badge)"/>
  <g transform="translate(${textX + 10} 102) scale(1.17)" fill="none" stroke="#140B10" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="${ICONS[icon]}"/>
  </g>
  ${textPath(fontBlack, eyebrow, textX + 64, 125, 20, '#F9A23B', 2)}

  ${textPath(fontBlack, line1, textX, 226, 66, '#FFFFFF')}
  ${textPath(fontBlack, line2, textX, 304, 66, '#FFFFFF')}
  ${textPath(fontBold, sub, textX, 358, 26, '#E6D3C4')}

  <rect x="${textX}" y="396" width="470" height="2" fill="#4A3840"/>

  ${textPath(fontBold, 'jovenesmodelia.com', textX, 450, 28, '#F0E2D6')}
  ${textPath(fontBold, foot, textX, 490, 20, '#8A6A76')}
</svg>
`);

  const out = path.join(PUBLIC_DIR, file);
  await sharp(svg)
    .composite([{ input: logo, left: logoX, top: logoY }])
    .jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
    .toFile(out);
  console.log(`✅ ${file} generada (${W}x${H}) -> ${out}`);
}

await render({
  file: 'og-ranking.jpg',
  glow: '#F9A23B',
  badgeFrom: '#FDE68A',
  badgeTo: '#F9A23B',
  icon: 'trophy',
  eyebrow: 'RANKING DE LA TEMPORADA',
  line1: '¿Quién va',
  line2: 'liderando?',
  sub: 'Mira el podio y en qué puesto vas tú',
  foot: 'Nueva semana · Nueva oportunidad',
});

await render({
  file: 'og-cumpleanos.jpg',
  glow: '#DC3340',
  badgeFrom: '#F9A23B',
  badgeTo: '#F26A2E',
  icon: 'cake',
  eyebrow: 'CUMPLEAÑOS DEL MES',
  line1: '¡Feliz',
  line2: 'cumpleaños!',
  sub: 'Mira quiénes celebran y salúdalos',
  foot: 'Jóvenes Modelia · Bogotá',
});

console.log('   Publica y luego: https://developers.facebook.com/tools/debug/ -> Scrape Again');
