#!/usr/bin/env node
/**
 * Genera los iconos de favicon / PWA a partir del logo.
 *
 *   cd frontend && node scripts/generate-icons.mjs
 *
 * Produce en frontend/public/:
 *   favicon-32x32.png, favicon.svg, favicon.ico,
 *   apple-touch-icon.png (180), icon-192.png, icon-512.png,
 *   icon-maskable-512.png (con relleno de seguridad para máscara)
 *
 * Requiere sharp (ya está en devDependencies).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(__dirname, '..');
const SRC = resolve(FRONTEND, 'src/assets/logos/logo.png');
const PUB = resolve(FRONTEND, 'public');
const BRAND = { r: 59, g: 130, b: 246 }; // #3B82F6

const src = readFileSync(SRC);

const png = (size, opts = {}) =>
  sharp(src)
    .resize(size, size, {
      fit: 'contain',
      background: opts.bg ?? { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

// Maskable: el logo debe ocupar ~80% (zona segura), fondo de marca sólido.
const maskable = async (size) => {
  const inner = Math.round(size * 0.8);
  const logo = await sharp(src)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: BRAND },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer();
};

const tasks = {
  'favicon-32x32.png': () => png(32),
  'apple-touch-icon.png': () => png(180, { bg: BRAND }),
  'icon-192.png': () => png(192),
  'icon-512.png': () => png(512),
  'icon-maskable-512.png': () => maskable(512),
};

for (const [name, fn] of Object.entries(tasks)) {
  writeFileSync(resolve(PUB, name), await fn());
  console.log('✓', name);
}

// favicon.ico (multi-tamaño 16/32/48) — sharp escribe ICO desde 0.33+
try {
  const ico = await sharp(src)
    .resize(48, 48, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toFormat('ico')
    .toBuffer();
  writeFileSync(resolve(PUB, 'favicon.ico'), ico);
  console.log('✓ favicon.ico');
} catch {
  // Fallback: copiar el png de 32 como .ico (los navegadores lo aceptan)
  writeFileSync(resolve(PUB, 'favicon.ico'), await png(32));
  console.log('✓ favicon.ico (png fallback)');
}

// favicon.svg — envoltorio SVG que embebe un PNG pequeño (favicon, no debe pesar)
const b64 = (await png(64)).toString('base64');
writeFileSync(
  resolve(PUB, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><image width="64" height="64" href="data:image/png;base64,${b64}"/></svg>\n`
);
console.log('✓ favicon.svg');

console.log('\nListo. Revisa frontend/public/.');
