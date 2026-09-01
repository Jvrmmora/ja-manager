/**
 * Se ejecuta antes de cargar cualquier módulo de test. Define variables de
 * entorno mínimas para que `config/env.ts` no aborte el proceso durante los tests.
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/ja-manager-test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-secret-value-with-at-least-32-characters!!';
process.env.CLOUDINARY_CLOUD_NAME =
  process.env.CLOUDINARY_CLOUD_NAME || 'test-cloud';
process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || 'test-key';
process.env.CLOUDINARY_API_SECRET =
  process.env.CLOUDINARY_API_SECRET || 'test-api-secret';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
