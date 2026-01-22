import mongoose from 'mongoose';
import Young from '../models/Young';
import Season from '../models/Season';
import logger from '../utils/logger';

/**
 * Migración: Agregar campo birthdayPointsClaimed a Young y birthdayBonusPoints a Season
 *
 * Este script agrega el campo birthdayPointsClaimed (Date | null) a todos los documentos
 * de Young existentes y el campo birthdayBonusPoints a las settings de Season.
 */

/**
 * Ejecutar migración (UP)
 */
export async function up(): Promise<void> {
  try {
    logger.info('Iniciando migración: agregar campos de cumpleaños', {
      context: 'Migration',
      method: 'up',
      migration: 'addBirthdayFields',
    });

    // 1. Agregar birthdayPointsClaimed a todos los Young existentes
    const youngUpdateResult = await Young.updateMany(
      { birthdayPointsClaimed: { $exists: false } }, // Solo los que no tienen el campo
      { $set: { birthdayPointsClaimed: null } }
    );

    logger.info('Campo birthdayPointsClaimed agregado a Young', {
      context: 'Migration',
      method: 'up',
      matchedCount: youngUpdateResult.matchedCount,
      modifiedCount: youngUpdateResult.modifiedCount,
    });

    // 2. Agregar birthdayBonusPoints a settings de Season existentes
    const seasonUpdateResult = await Season.updateMany(
      { 'settings.birthdayBonusPoints': { $exists: false } },
      { $set: { 'settings.birthdayBonusPoints': 100 } }
    );

    logger.info('Campo birthdayBonusPoints agregado a Season settings', {
      context: 'Migration',
      method: 'up',
      matchedCount: seasonUpdateResult.matchedCount,
      modifiedCount: seasonUpdateResult.modifiedCount,
    });

    logger.info('Migración completada exitosamente', {
      context: 'Migration',
      method: 'up',
      migration: 'addBirthdayFields',
      totalChanges:
        youngUpdateResult.modifiedCount + seasonUpdateResult.modifiedCount,
    });

    console.log('\n✅ Migración completada:');
    console.log(
      `   - Young: ${youngUpdateResult.modifiedCount} documentos actualizados`
    );
    console.log(
      `   - Season: ${seasonUpdateResult.modifiedCount} documentos actualizados`
    );
  } catch (error) {
    logger.error('Error ejecutando migración', {
      context: 'Migration',
      method: 'up',
      migration: 'addBirthdayFields',
      error: error instanceof Error ? error.message : String(error),
    });

    console.error('\n❌ Error en migración:', error);
    throw error;
  }
}

/**
 * Revertir migración (DOWN)
 */
export async function down(): Promise<void> {
  try {
    logger.info(
      'Iniciando reversión de migración: eliminar campos de cumpleaños',
      {
        context: 'Migration',
        method: 'down',
        migration: 'addBirthdayFields',
      }
    );

    // 1. Eliminar birthdayPointsClaimed de Young
    const youngUpdateResult = await Young.updateMany(
      { birthdayPointsClaimed: { $exists: true } },
      { $unset: { birthdayPointsClaimed: '' } }
    );

    logger.info('Campo birthdayPointsClaimed eliminado de Young', {
      context: 'Migration',
      method: 'down',
      matchedCount: youngUpdateResult.matchedCount,
      modifiedCount: youngUpdateResult.modifiedCount,
    });

    // 2. Eliminar birthdayBonusPoints de Season settings
    const seasonUpdateResult = await Season.updateMany(
      { 'settings.birthdayBonusPoints': { $exists: true } },
      { $unset: { 'settings.birthdayBonusPoints': '' } }
    );

    logger.info('Campo birthdayBonusPoints eliminado de Season settings', {
      context: 'Migration',
      method: 'down',
      matchedCount: seasonUpdateResult.matchedCount,
      modifiedCount: seasonUpdateResult.modifiedCount,
    });

    logger.info('Reversión de migración completada exitosamente', {
      context: 'Migration',
      method: 'down',
      migration: 'addBirthdayFields',
      totalChanges:
        youngUpdateResult.modifiedCount + seasonUpdateResult.modifiedCount,
    });

    console.log('\n✅ Reversión completada:');
    console.log(
      `   - Young: ${youngUpdateResult.modifiedCount} documentos actualizados`
    );
    console.log(
      `   - Season: ${seasonUpdateResult.modifiedCount} documentos actualizados`
    );
  } catch (error) {
    logger.error('Error revirtiendo migración', {
      context: 'Migration',
      method: 'down',
      migration: 'addBirthdayFields',
      error: error instanceof Error ? error.message : String(error),
    });

    console.error('\n❌ Error en reversión:', error);
    throw error;
  }
}

/**
 * Ejecutar migración desde línea de comandos
 *
 * Uso:
 *   npm run migrate:up    - Ejecutar migración
 *   npm run migrate:down  - Revertir migración
 */
async function runMigration(): Promise<void> {
  const command = process.argv[2];

  if (!command || !['up', 'down'].includes(command)) {
    console.error('\n❌ Comando inválido.');
    console.log('\nUso:');
    console.log('  npm run migrate:up    - Ejecutar migración');
    console.log('  npm run migrate:down  - Revertir migración');
    process.exit(1);
  }

  try {
    // Conectar a MongoDB
    const mongoUri =
      process.env.MONGO_URI || 'mongodb://localhost:27017/ja-manager';

    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB\n');

    // Ejecutar migración
    if (command === 'up') {
      console.log('⬆️  Ejecutando migración...\n');
      await up();
    } else {
      console.log('⬇️  Revirtiendo migración...\n');
      await down();
    }

    // Desconectar
    await mongoose.disconnect();
    console.log('\n✅ Proceso completado\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runMigration();
}
