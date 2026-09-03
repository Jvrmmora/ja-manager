import mongoose from 'mongoose';
import Young from '../models/Young';
import logger from '../utils/logger';

/**
 * Migración: inicializar el campo `dataConsent` en los usuarios existentes.
 *
 * No se fabrica ningún consentimiento: todos los usuarios previos quedan con
 * estado `none`, de modo que el sistema les pedirá aceptar la política vigente
 * la próxima vez que inicien sesión (Opción B).
 */
export async function up(): Promise<void> {
  logger.info('Iniciando migración: addDataConsentField', {
    context: 'Migration',
    method: 'up',
  });

  const result = await Young.updateMany(
    { 'dataConsent.status': { $exists: false } },
    {
      $set: {
        dataConsent: {
          status: 'none',
          version: null,
          acceptedAt: null,
          lastRecordId: null,
        },
      },
    }
  );

  logger.info('Campo dataConsent inicializado en Young', {
    context: 'Migration',
    method: 'up',
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  });

  console.log(
    `\n✅ Migración completada: ${result.modifiedCount} usuarios actualizados`
  );
}

export async function down(): Promise<void> {
  const result = await Young.updateMany(
    { dataConsent: { $exists: true } },
    { $unset: { dataConsent: '' } }
  );

  console.log(
    `\n✅ Reversión completada: ${result.modifiedCount} usuarios actualizados`
  );
}

async function runMigration(): Promise<void> {
  const command = process.argv[2];

  if (!command || !['up', 'down'].includes(command)) {
    console.error('\n❌ Comando inválido. Uso: ts-node addDataConsentField.ts up|down');
    process.exit(1);
  }

  try {
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017/ja-manager';

    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado\n');

    if (command === 'up') {
      await up();
    } else {
      await down();
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  runMigration();
}
