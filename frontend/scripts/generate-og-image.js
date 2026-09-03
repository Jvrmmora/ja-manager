#!/usr/bin/env node

/**
 * Genera la imagen Open Graph (1200x630) para WhatsApp / Facebook / LinkedIn.
 *
 *   cd frontend && npm run gen:og
 *
 * Produce frontend/public/og-image.jpg: fondo de marca + logo + titular + dominio.
 * El texto se rasteriza como paths con opentype.js (no depende de que el
 * renderer SVG de sharp tenga fuentes del sistema).
 *
 * Es un script de uso manual (como gen:icons); el JPG resultante se commitea.
 * Tras regenerarlo, publica y pasa la URL por
 * https://developers.facebook.com/tools/debug/ -> "Scrape Again" para limpiar
 * la caché de WhatsApp.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import opentype from 'opentype.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const LOGO_PATH = path.join(PROJECT_ROOT, 'frontend/src/assets/logos/logo_3.png');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'frontend/public/og-image.jpg');

// Fuentes: se usan solo en tiempo de generación (máquina de desarrollo).
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

/** Devuelve un <path> SVG para un texto, con la baseline en (x, y). */
function textPath(font, text, x, y, size, fill, letterSpacing = 0) {
  if (!letterSpacing) {
    return `<path d="${font.getPath(text, x, y, size).toPathData(2)}" fill="${fill}"/>`;
  }
  // Espaciado manual carácter a carácter.
  let cursor = x;
  const parts = [];
  for (const ch of text) {
    const p = font.getPath(ch, cursor, y, size);
    parts.push(p.toPathData(2));
    cursor += font.getAdvanceWidth(ch, size) + letterSpacing;
  }
  return `<path d="${parts.join(' ')}" fill="${fill}"/>`;
}

// --- Logo: recorta transparente y escala. El crucifijo del logo es un hueco
// transparente, así que se coloca sobre un panel claro para que se lea blanco.
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

const svg = Buffer.from(`
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1120"/>
      <stop offset="0.55" stop-color="#151436"/>
      <stop offset="1" stop-color="#2a1038"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.3" cy="0.5" r="0.6">
      <stop offset="0" stop-color="#F97316" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#F97316" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#F97316"/>
      <stop offset="1" stop-color="#E11D48"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="0" y="0" width="12" height="${H}" fill="url(#accent)"/>

  <rect x="${panelX}" y="${panelY}" width="${panelW}" height="${panelH}" rx="28"
        fill="#F8FAFC"/>

  ${textPath(fontBlack, 'IGLESIA ADVENTISTA', textX, 150, 24, '#F97316', 4)}
  ${textPath(fontBlack, 'Jóvenes', textX, 246, 82, '#FFFFFF')}
  ${textPath(fontBlack, 'Modelia', textX, 330, 82, '#FFFFFF')}
  ${textPath(fontBold, 'Bogotá · Encendidos por Cristo', textX, 392, 30, '#CBD5E1')}

  <rect x="${textX}" y="430" width="470" height="2" fill="#3B3B57"/>

  ${textPath(fontBold, 'jovenesmodelia.com', textX, 486, 30, '#9FB0CC')}
  ${textPath(fontBold, 'Asistencia con QR · Puntos · Rankings', textX, 528, 22, '#6B7A99')}
</svg>
`);

await sharp(svg)
  .composite([{ input: logo, left: logoX, top: logoY }])
  .jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
  .toFile(OUTPUT_PATH);

console.log(`✅ og-image.jpg generada (${W}x${H}) -> ${OUTPUT_PATH}`);
console.log('   Publica y luego: https://developers.facebook.com/tools/debug/ -> Scrape Again');
