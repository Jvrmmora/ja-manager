import dotenv from 'dotenv';

dotenv.config();

/**
 * Validación y carga centralizada de variables de entorno.
 *
 * Se ejecuta una sola vez al importar este módulo (antes de arrancar el
 * servidor). Si falta una variable obligatoria o el `JWT_SECRET` es débil,
 * el proceso termina con un mensaje claro en lugar de arrancar en un estado
 * inseguro (por ejemplo con un secreto JWT por defecto conocido).
 */

const isProduction = process.env.NODE_ENV === 'production';

// Nombres canónicos que espera el código. Se aceptan también algunos alias
// heredados para no romper despliegues existentes.
const JWT_SECRET =
  process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || '';
const TOKEN_EXP =
  process.env.TOKEN_EXP || process.env.JWT_EXPIRES_IN || '7d';
const TOKEN_ALGORITHM = (process.env.TOKEN_ALGORITHM ||
  process.env.JWT_ALGORITHM ||
  'HS256') as 'HS256';
const CORS_ORIGIN = process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || '';

const errors: string[] = [];
const warnings: string[] = [];

function requireVar(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    errors.push(`Falta la variable de entorno obligatoria: ${name}`);
    return '';
  }
  return value.trim();
}

const MONGODB_URI = requireVar('MONGODB_URI', process.env.MONGODB_URI);

if (!JWT_SECRET) {
  errors.push('Falta la variable de entorno obligatoria: JWT_SECRET');
} else if (JWT_SECRET.length < 32) {
  errors.push(
    'JWT_SECRET es demasiado corto: debe tener al menos 32 caracteres aleatorios'
  );
} else if (
  ['your-super-secret-key', 'your_super_secret_jwt_key_change_in_production'].includes(
    JWT_SECRET
  )
) {
  errors.push('JWT_SECRET tiene un valor de ejemplo. Genera un secreto real.');
}

// Cloudinary es obligatorio para la subida de imágenes de perfil.
const CLOUDINARY_CLOUD_NAME = requireVar(
  'CLOUDINARY_CLOUD_NAME',
  process.env.CLOUDINARY_CLOUD_NAME
);
const CLOUDINARY_API_KEY = requireVar(
  'CLOUDINARY_API_KEY',
  process.env.CLOUDINARY_API_KEY
);
const CLOUDINARY_API_SECRET = requireVar(
  'CLOUDINARY_API_SECRET',
  process.env.CLOUDINARY_API_SECRET
);

if (isProduction && !CORS_ORIGIN) {
  warnings.push(
    'CORS_ORIGIN no está definido en producción: se usará la lista de orígenes de desarrollo (localhost).'
  );
}

if (errors.length > 0) {
  // No usamos el logger aquí para evitar dependencias circulares y para que el
  // mensaje sea visible aunque el logger no esté configurado.

  console.error('\n❌ Configuración de entorno inválida:\n');
  for (const err of errors) console.error(`   • ${err}`);
  console.error(
    '\nRevisa tu archivo .env (ver backend/.env.example) y vuelve a intentarlo.\n'
  );
  process.exit(1);
}

for (const warning of warnings) {
  console.warn(`⚠️  ${warning}`);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction,
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: MONGODB_URI,
  jwtSecret: JWT_SECRET,
  tokenExp: TOKEN_EXP,
  tokenAlgorithm: TOKEN_ALGORITHM,
  corsOrigin: CORS_ORIGIN,
  cloudinary: {
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    apiSecret: CLOUDINARY_API_SECRET,
  },
  dbDebug: process.env.DB_DEBUG === 'true',
  // Semilla opcional del usuario Super Admin (nunca hardcodear credenciales).
  seedAdmin: {
    enabled: process.env.SEED_ADMIN_ENABLED === 'true',
    email: process.env.SEED_ADMIN_EMAIL || '',
    password: process.env.SEED_ADMIN_PASSWORD || '',
  },
} as const;

export default env;
