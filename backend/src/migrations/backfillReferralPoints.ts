import mongoose from 'mongoose';
import Young from '../models/Young';
import Season from '../models/Season';
import PointsTransaction from '../models/PointsTransaction';
import { pointsService } from '../services/pointsService';

/**
 * Migración: asignar los puntos de referido que nunca se otorgaron.
 *
 * Desde que el registro crea la cuenta al instante, los puntos de referido
 * solo se daban en la aprobación manual (que ya no se usa), así que los
 * jóvenes registrados con placa de invitación quedaron sin REFERRAL_BONUS /
 * REFERRAL_WELCOME.
 *
 * Solo considera a los jóvenes creados dentro de las fechas de la temporada
 * activa y los asigna a esa temporada. `assignReferralPoints` es idempotente,
 * así que correrlo dos veces no duplica puntos.
 *
 * Por defecto es una simulación (no escribe). Para aplicar:
 *   npx ts-node -r dotenv/config src/migrations/backfillReferralPoints.ts --apply
 */
export async function up(apply: boolean): Promise<void> {
  const season = await Season.findOne({ status: 'ACTIVE' });
  if (!season) {
    console.log('\n⚠️  No hay temporada activa: no hay nada que asignar.');
    return;
  }

  const referred = await Young.find({
    referredBy: { $ne: null },
    deletedAt: null,
    createdAt: { $gte: season.startDate, $lte: season.endDate },
  }).select('fullName placa referredBy createdAt');

  console.log(
    `\n📋 Temporada ${season.name}: ${referred.length} referidos registrados en sus fechas`
  );

  let assigned = 0;
  for (const young of referred) {
    const referrer = await Young.findById(young.referredBy).select(
      'fullName placa'
    );
    const label = `${young.fullName} (${young.placa}) ← ${referrer?.fullName ?? '¿?'} (${referrer?.placa ?? '¿?'})`;

    if (!referrer) {
      console.log(`   ⏭️  ${label}: quien invitó ya no existe`);
      continue;
    }

    if (!apply) {
      const alreadyAwarded = await PointsTransaction.exists({
        type: 'REFERRAL_BONUS',
        referredYoungId: young._id,
      });
      console.log(
        `   🔎 ${label}${alreadyAwarded ? ' — ya tiene puntos, se omite' : ' — pendiente'}`
      );
      continue;
    }

    const result = await pointsService.assignReferralPoints(
      (referrer._id as mongoose.Types.ObjectId).toString(),
      (young._id as mongoose.Types.ObjectId).toString(),
      (season._id as mongoose.Types.ObjectId).toString()
    );
    if (result) assigned++;
    console.log(`   ✅ ${label}`);
  }

  console.log(
    apply
      ? `\n✅ Revisados ${assigned} referidos (los que ya tenían puntos no se duplican)`
      : '\nℹ️  Simulación: no se escribió nada. Usa --apply para asignar.'
  );
}

async function runMigration(): Promise<void> {
  const apply = process.argv.includes('--apply');

  try {
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017/ja-manager';

    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado');

    await up(apply);

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
