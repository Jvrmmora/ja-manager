// Genera las imágenes que usan los correos transaccionales del backend.
// Gmail y la mayoría de clientes de correo no muestran SVG, así que la
// decoración (confeti y globos) se exporta a un PNG.
//
// Es un PNG TRANSPARENTE y sin colores claros: el correo de cumpleaños no
// define ningún fondo, porque en el modo oscuro de la app de Gmail los colores
// sólidos se invierten (un fondo vino se volvía rosado). Así la franja se ve
// igual sobre el blanco del modo claro y sobre el gris del modo oscuro.
//
// Uso: npm run gen:email  (escribe public/email/birthday-confetti.png)
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../public/email');

// Lienzo lógico de 600x110 (ancho del correo); se exporta a 2x para pantallas retina.
const W = 600;
const H = 110;
const SCALE = 2;

// Gris cálido de la cuerda de los globos: se distingue en blanco y en oscuro.
const STRING = '#9A8E92';

const confetti = [
  ['rect', 150, 22, 14, 6, '#F9A23B', 25],
  ['circle', 196, 58, 4, '#DC3340'],
  ['rect', 238, 86, 12, 5, '#F472B6', -30],
  ['circle', 272, 24, 5, '#F26A2E'],
  ['rect', 318, 60, 14, 6, '#F9A23B', 40],
  ['circle', 354, 26, 4, '#F472B6'],
  ['rect', 392, 90, 12, 5, '#F26A2E', -45],
  ['circle', 430, 50, 5, '#F9A23B'],
  ['rect', 120, 88, 12, 5, '#DC3340', 55],
  ['circle', 462, 96, 3.5, '#F472B6'],
  ['rect', 570, 12, 12, 5, '#F26A2E', 60],
  ['circle', 14, 14, 4, '#F9A23B'],
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
  ${confetti}
  <line x1="52" y1="62" x2="64" y2="108" stroke="${STRING}" stroke-width="1.5"/>
  <ellipse cx="50" cy="36" rx="22" ry="28" fill="#F9A23B"/>
  <ellipse cx="43" cy="27" rx="5" ry="8" fill="#FFFFFF" opacity="0.4"/>
  <line x1="98" y1="72" x2="90" y2="108" stroke="${STRING}" stroke-width="1.5"/>
  <ellipse cx="100" cy="52" rx="16" ry="20" fill="#DC3340"/>
  <line x1="548" y1="62" x2="536" y2="108" stroke="${STRING}" stroke-width="1.5"/>
  <ellipse cx="550" cy="36" rx="22" ry="28" fill="#F26A2E"/>
  <ellipse cx="543" cy="27" rx="5" ry="8" fill="#FFFFFF" opacity="0.4"/>
  <line x1="502" y1="72" x2="510" y2="108" stroke="${STRING}" stroke-width="1.5"/>
  <ellipse cx="500" cy="52" rx="16" ry="20" fill="#F472B6"/>
</svg>`;

await mkdir(outDir, { recursive: true });
const out = path.join(outDir, 'birthday-confetti.png');
await sharp(Buffer.from(svg))
  .png({ compressionLevel: 9, palette: true })
  .toFile(out);

console.log(`Generado ${path.relative(process.cwd(), out)} (${W * SCALE}x${H * SCALE}, transparente)`);
