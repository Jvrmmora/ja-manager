// Genera las imágenes que usan los correos transaccionales del backend.
// Gmail y la mayoría de clientes de correo no muestran SVG, así que la
// decoración (degradado + confeti + globos) se hornea en un JPG que el
// backend referencia como fondo de la cabecera de la tarjeta de cumpleaños.
//
// Uso: npm run gen:email  (escribe public/email/birthday-header.jpg)
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../public/email');

// Lienzo lógico de 600x340 (ancho del correo); se exporta a 2x para pantallas retina.
const W = 600;
const H = 340;
const SCALE = 2;

const confetti = [
  ['rect', 46, 38, 14, 6, '#F9A23B', 25],
  ['rect', 120, 92, 12, 5, '#FFE4C7', -30],
  ['circle', 84, 176, 5, '#F26A2E'],
  ['rect', 30, 236, 14, 6, '#FFE4C7', 60],
  ['circle', 168, 40, 4, '#FFE4C7'],
  ['rect', 214, 70, 12, 5, '#F9A23B', -50],
  ['circle', 260, 22, 5, '#F26A2E'],
  ['rect', 340, 30, 14, 6, '#FFE4C7', 40],
  ['circle', 396, 84, 4, '#F9A23B'],
  ['rect', 452, 44, 12, 5, '#F26A2E', -20],
  ['circle', 520, 110, 5, '#FFE4C7'],
  ['rect', 560, 170, 14, 6, '#F9A23B', 70],
  ['circle', 498, 232, 4, '#F26A2E'],
  ['rect', 548, 260, 12, 5, '#FFE4C7', -40],
  ['circle', 64, 290, 4, '#F9A23B'],
]
  .map(item => {
    if (item[0] === 'circle') {
      const [, cx, cy, r, fill] = item;
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
    }
    const [, x, y, w, h, fill, rot] = item;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="${fill}" transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"/>`;
  })
  .join('\n');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W * SCALE}" height="${H * SCALE}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0.33" y1="0" x2="0.67" y2="1">
      <stop offset="0" stop-color="#4E0F3A"/>
      <stop offset="0.6" stop-color="#8A1C45"/>
      <stop offset="1" stop-color="#B3243B"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${confetti}
  <line x1="40" y1="140" x2="62" y2="206" stroke="#FFE4C7" stroke-width="1.5"/>
  <ellipse cx="38" cy="112" rx="24" ry="30" fill="#F9A23B"/>
  <ellipse cx="30" cy="102" rx="6" ry="9" fill="#FFFFFF" opacity="0.35"/>
  <line x1="566" y1="120" x2="540" y2="196" stroke="#FFE4C7" stroke-width="1.5"/>
  <ellipse cx="568" cy="92" rx="22" ry="28" fill="#F26A2E"/>
  <ellipse cx="560" cy="82" rx="5" ry="8" fill="#FFFFFF" opacity="0.35"/>
  <line x1="522" y1="150" x2="540" y2="206" stroke="#FFE4C7" stroke-width="1.5"/>
  <ellipse cx="516" cy="126" rx="18" ry="23" fill="#FFE4C7"/>
</svg>`;

await mkdir(outDir, { recursive: true });
const out = path.join(outDir, 'birthday-header.jpg');
await sharp(Buffer.from(svg))
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(out);

console.log(`Generado ${path.relative(process.cwd(), out)} (${W * SCALE}x${H * SCALE})`);
