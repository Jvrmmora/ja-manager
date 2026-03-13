#!/usr/bin/env node

/**
 * Script para generar imagen Open Graph para WhatsApp y redes sociales
 *
 * Uso:
 *   node generate-og-image.js
 *
 * Requisitos:
 *   npm install sharp
 *
 * O ejecutar el script bash si tienes ImageMagick instalado
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const LOGO_PATH = path.join(
  PROJECT_ROOT,
  'frontend/src/assets/logos/logo_3.png'
);
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'frontend/public/og-image.jpg');

const COLORS = {
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  RED: '\x1b[31m',
  NC: '\x1b[0m', // No Color
};

console.log(
  `${COLORS.GREEN}🎨 Generando imagen Open Graph para WhatsApp${COLORS.NC}\n`
);

// Verificar si sharp está instalado
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (error) {
  console.error(`${COLORS.RED}❌ Sharp no está instalado${COLORS.NC}\n`);
  console.log('Para instalarlo:');
  console.log('  cd frontend && npm install --save-dev sharp\n');
  console.log('O usa el script bash si tienes ImageMagick:');
  console.log('  ./frontend/scripts/generate-og-image.sh\n');
  console.log('Alternativamente, puedes crear la imagen manualmente:');
  console.log('  1. Abre tu editor de imágenes favorito');
  console.log('  2. Crea un canvas de 1200x630 píxeles');
  console.log(
    '  3. Coloca el logo y texto: "Jóvenes Adventistas Modelia - Plataforma Digital"'
  );
  console.log('  4. Usa el color de marca: #3B82F6');
  console.log('  5. Guarda como "og-image.jpg" en frontend/public/\n');
  process.exit(1);
}

// Verificar que el logo existe
if (!fs.existsSync(LOGO_PATH)) {
  console.error(
    `${COLORS.RED}❌ Logo no encontrado en: ${LOGO_PATH}${COLORS.NC}`
  );
  process.exit(1);
}

console.log(
  `${COLORS.YELLOW}📐 Tamaño recomendado para Open Graph: 1200x630 píxeles${COLORS.NC}`
);

try {
  // Leer el logo
  const logoBuffer = fs.readFileSync(LOGO_PATH);
  const logoMetadata = await sharp(logoBuffer).metadata();
  console.log(
    `${COLORS.YELLOW}📐 Tamaño del logo: ${logoMetadata.width}x${logoMetadata.height}${COLORS.NC}\n`
  );

  // Verificar si el logo ya tiene las dimensiones correctas
  const isCorrectSize =
    logoMetadata.width === 1200 && logoMetadata.height === 630;

  if (isCorrectSize) {
    console.log(
      `${COLORS.GREEN}✅ El logo ya tiene las dimensiones correctas (1200x630)${COLORS.NC}`
    );
    console.log('Convirtiendo PNG a JPG...\n');

    // Simplemente convertir de PNG a JPG manteniendo el tamaño
    const jpegBuffer = await sharp(logoBuffer).jpeg({ quality: 90 }).toBuffer();

    fs.writeFileSync(OUTPUT_PATH, jpegBuffer);
  } else {
    console.log('Ajustando tamaño del logo...\n');

    // Si no tiene el tamaño correcto, redimensionar a 1200x630
    const jpegBuffer = await sharp(logoBuffer)
      .resize(1200, 630, {
        fit: 'contain', // Mantiene el aspect ratio
        background: { r: 59, g: 130, b: 246 }, // #3B82F6 como fondo si hay espacios
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    fs.writeFileSync(OUTPUT_PATH, jpegBuffer);
  }

  console.log(
    `${COLORS.GREEN}✅ Imagen Open Graph generada exitosamente!${COLORS.NC}`
  );
  console.log(`${COLORS.GREEN}📁 Ubicación: ${OUTPUT_PATH}${COLORS.NC}\n`);
  console.log('Ahora puedes:');
  console.log('  1. Verificar que la imagen se ve bien');
  console.log('  2. Si quieres agregar texto, edita la imagen manualmente');
  console.log('  3. Publica los cambios y limpia la caché de WhatsApp:');
  console.log('     https://developers.facebook.com/tools/debug/\n');
} catch (error) {
  console.error(`${COLORS.RED}❌ Error generando la imagen:${COLORS.NC}`);
  console.error(error.message);
  process.exit(1);
}
