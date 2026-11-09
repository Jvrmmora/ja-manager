import mongoose, { ClientSession } from 'mongoose';
import Attendance from '../../models/Attendance';
import ConsentRecord from '../../models/ConsentRecord';
import Form from '../../models/Form';
import FormResponse from '../../models/FormResponse';
import LeaderboardSnapshot from '../../models/LeaderboardSnapshot';
import PointsTransaction from '../../models/PointsTransaction';
import QRCode from '../../models/QRCode';
import RegistrationRequest from '../../models/RegistrationRequest';
import Streak from '../../models/Streak';
import Young from '../../models/Young';
import YoungDuplicateDismissal from '../../models/YoungDuplicateDismissal';
import logger from '../../utils/logger';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errorHandler';
import {
  compareCandidates,
  DuplicateLevel,
  pairKey,
  suggestTargetId,
} from './domain/duplicateRules';
import {
  buildFieldMerge,
  MergeHistory,
  MergeProfile,
  MergeResolution,
  resolveMergeConflicts,
} from './domain/mergePlan';

const ACTIVE = { deletedAt: null, isSpam: { $ne: true } };
const YOUNG_ROLE = 'Young role';

const objectId = (id: unknown) => new mongoose.Types.ObjectId(String(id));

/** Lo que ve el admin de cada cuenta. Nunca incluye la contraseña. */
const toSummary = (young: any) => ({
  id: String(young._id),
  fullName: young.fullName,
  placa: young.placa || null,
  email: young.email || null,
  phone: young.phone || null,
  birthday: young.birthday || null,
  ageRange: young.ageRange || null,
  gender: young.gender || null,
  group: young.group ?? null,
  profileImage: young.profileImage || null,
  roleName: young.role_name || null,
  consentStatus: young.dataConsent?.status || 'none',
  hasPassword: !!young.password,
  firstLogin: !!young.first_login,
  createdAt: young.createdAt || null,
});

export type YoungSummary = ReturnType<typeof toSummary>;

export interface DuplicatePair {
  key: string;
  level: DuplicateLevel;
  reasons: string[];
  a: YoungSummary & { points: number; attendances: number };
  b: YoungSummary & { points: number; attendances: number };
  suggestedTargetId: string;
  newestAt: Date | null;
}

/**
 * Pares de posibles duplicados entre los jóvenes activos, sin los que un
 * admin ya descartó. Se calcula en cada consulta para incluir también lo
 * creado por importación o a mano, no solo los registros públicos.
 */
export const listDuplicatePairs = async (): Promise<DuplicatePair[]> => {
  const youngs: any[] = await Young.find(ACTIVE).lean();
  const dismissals: any[] = await YoungDuplicateDismissal.find({}).select('pairKey').lean();
  const dismissed = new Set(dismissals.map(d => d.pairKey));

  const matches: { a: any; b: any; key: string; level: DuplicateLevel; reasons: string[] }[] = [];
  for (let i = 0; i < youngs.length; i++) {
    for (let j = i + 1; j < youngs.length; j++) {
      const [a, b] = [youngs[i], youngs[j]];
      const key = pairKey(String(a._id), String(b._id));
      if (dismissed.has(key)) continue;
      const match = compareCandidates(
        { id: String(a._id), fullName: a.fullName, phone: a.phone, email: a.email, birthday: a.birthday },
        { id: String(b._id), fullName: b.fullName, phone: b.phone, email: b.email, birthday: b.birthday }
      );
      if (match) matches.push({ a, b, key, ...match });
    }
  }
  if (matches.length === 0) return [];

  const ids = [...new Set(matches.flatMap(m => [String(m.a._id), String(m.b._id)]))].map(objectId);
  const [points, attendances]: any[][] = await Promise.all([
    PointsTransaction.aggregate([
      { $match: { youngId: { $in: ids } } },
      { $group: { _id: '$youngId', total: { $sum: '$points' } } },
    ]),
    Attendance.aggregate([
      { $match: { youngId: { $in: ids } } },
      { $group: { _id: '$youngId', total: { $sum: 1 } } },
    ]),
  ]);
  const pointsBy = new Map(points.map(p => [String(p._id), p.total as number]));
  const attendancesBy = new Map(attendances.map(a => [String(a._id), a.total as number]));

  const withStats = (young: any) => ({
    ...toSummary(young),
    points: pointsBy.get(String(young._id)) || 0,
    attendances: attendancesBy.get(String(young._id)) || 0,
  });

  return matches
    .map(({ a, b, key, level, reasons }) => {
      const [left, right] = [withStats(a), withStats(b)];
      const newest = Math.max(new Date(a.createdAt || 0).getTime(), new Date(b.createdAt || 0).getTime());
      return {
        key,
        level,
        reasons,
        a: left,
        b: right,
        suggestedTargetId: suggestTargetId(left, right),
        newestAt: newest ? new Date(newest) : null,
      };
    })
    .sort((x, y) => {
      if (x.level !== y.level) return x.level === 'high' ? -1 : 1;
      return new Date(y.newestAt || 0).getTime() - new Date(x.newestAt || 0).getTime();
    });
};

/** "No son la misma persona": el par deja de proponerse. */
export const dismissPair = async (youngAId: string, youngBId: string, adminId: string) => {
  if (youngAId === youngBId) throw new ValidationError('Selecciona dos jóvenes distintos');
  const key = pairKey(youngAId, youngBId);
  await YoungDuplicateDismissal.updateOne(
    { pairKey: key },
    {
      $setOnInsert: {
        pairKey: key,
        youngIds: [objectId(youngAId), objectId(youngBId)],
        dismissedBy: mongoose.Types.ObjectId.isValid(adminId) ? objectId(adminId) : undefined,
      },
    },
    { upsert: true }
  );
};

const loadPair = async (sourceId: string, targetId: string, session: ClientSession | null) => {
  if (sourceId === targetId) throw new ValidationError('Selecciona dos jóvenes distintos');
  const source: any = await Young.findOne({ _id: sourceId, ...ACTIVE }).session(session).lean();
  const target: any = await Young.findOne({ _id: targetId, ...ACTIVE }).session(session).lean();
  if (!source || !target) throw new NotFoundError('Joven');
  if (source.role_name && source.role_name !== YOUNG_ROLE) {
    throw new ForbiddenError('Una cuenta de administrador no se puede dar de baja en una fusión');
  }
  return { source, target };
};

/** Consultas en serie: dentro de una transacción no se permiten en paralelo. */
const loadHistory = async (id: string, session: ClientSession | null): Promise<MergeHistory> => {
  const attendances: any[] = await Attendance.find({ youngId: id }).select('attendanceDate qrCodeId').session(session).lean();
  const transactions: any[] = await PointsTransaction.find({ youngId: id }).session(session).lean();
  const streaks: any[] = await Streak.find({ youngId: id }).session(session).lean();
  const responses: any[] = await FormResponse.find({ 'respondent.youngId': id })
    .select('formId attending pointsTransactionId')
    .session(session)
    .lean();

  return {
    attendances: attendances.map(a => ({
      id: String(a._id),
      attendanceDate: a.attendanceDate,
      qrCodeId: String(a.qrCodeId),
    })),
    transactions: transactions.map(t => ({
      id: String(t._id),
      type: t.type,
      points: t.points,
      seasonId: String(t.seasonId),
      createdAt: t.createdAt,
      eventId: t.eventId ? String(t.eventId) : null,
      referredYoungId: t.referredYoungId ? String(t.referredYoungId) : null,
      description: t.description ?? null,
    })),
    streaks: streaks.map(s => ({
      id: String(s._id),
      seasonId: String(s.seasonId),
      currentStreakWeeks: s.currentStreakWeeks,
      bestStreakWeeks: s.bestStreakWeeks,
      lastAttendanceSaturday: s.lastAttendanceSaturday ?? null,
      violetFlameAwarded: !!s.violetFlameAwarded,
      violetFlameAwardedAt: s.violetFlameAwardedAt ?? null,
    })),
    responses: responses.map(r => ({
      id: String(r._id),
      formId: String(r.formId),
      attending: r.attending,
      pointsTransactionId: r.pointsTransactionId ? String(r.pointsTransactionId) : null,
    })),
  };
};

const buildPlan = async (sourceId: string, targetId: string, session: ClientSession | null) => {
  const { source, target } = await loadPair(sourceId, targetId, session);
  const ids = { sourceId, targetId };
  const sourceHistory = await loadHistory(sourceId, session);
  const targetHistory = await loadHistory(targetId, session);
  const resolution = resolveMergeConflicts(sourceHistory, targetHistory, ids);
  const fields = buildFieldMerge(target as MergeProfile, source as MergeProfile, ids);

  const discarded = new Set(resolution.deleteTransactionIds);
  const sum = (history: MergeHistory) =>
    history.transactions.filter(t => !discarded.has(t.id)).reduce((total, t) => total + t.points, 0);
  const consents = await ConsentRecord.countDocuments({ young_id: sourceId }).session(session);
  const referrals = await Young.countDocuments({ referredBy: sourceId, _id: { $ne: targetId } }).session(session);
  const snapshots = await LeaderboardSnapshot.countDocuments({ 'rankings.youngId': sourceId }).session(session);

  return { source, target, sourceHistory, resolution, fields, sum: { source: sum(sourceHistory), target: sum(targetHistory) }, consents, referrals, snapshots };
};

type MergePlan = Awaited<ReturnType<typeof buildPlan>>;

const summarize = (plan: MergePlan) => {
  const { source, target, sourceHistory, resolution, fields } = plan;
  return {
    source: toSummary(source),
    target: toSummary(target),
    filledFields: fields.filled,
    moves: {
      points: plan.sum.source,
      transactions:
        sourceHistory.transactions.filter(t => !resolution.deleteTransactionIds.includes(t.id)).length,
      attendances: sourceHistory.attendances.length - resolution.deleteAttendanceIds.length,
      streaks: sourceHistory.streaks.length - resolution.deleteStreakIds.length,
      formResponses: sourceHistory.responses.length - resolution.deleteResponseIds.length,
      consents: plan.consents,
      referrals: plan.referrals,
      snapshots: plan.snapshots,
    },
    conflicts: resolution.conflicts,
    resultingPoints: plan.sum.source + plan.sum.target,
    resultingPlaca: fields.movesPlaca ? source.placa : target.placa || null,
  };
};

export type MergeSummary = ReturnType<typeof summarize>;

/** Qué pasaría al fusionar, sin escribir nada. */
export const previewMerge = async (sourceId: string, targetId: string): Promise<MergeSummary> =>
  summarize(await buildPlan(sourceId, targetId, null));

const applyDeletions = async (resolution: MergeResolution, session: ClientSession) => {
  await Attendance.deleteMany({ _id: { $in: resolution.deleteAttendanceIds } }, { session });
  await PointsTransaction.deleteMany({ _id: { $in: resolution.deleteTransactionIds } }, { session });
  await Streak.deleteMany({ _id: { $in: resolution.deleteStreakIds } }, { session });
  await FormResponse.deleteMany({ _id: { $in: resolution.deleteResponseIds } }, { session });
};

/**
 * Fusiona `sourceId` dentro de `targetId` en una transacción: o queda todo o
 * no queda nada. La cuenta origen no se borra; queda dada de baja, sin
 * contraseña ni correo, y apuntando a la cuenta que la absorbió.
 */
export const mergeYoungs = async (
  sourceId: string,
  targetId: string,
  adminId: string
): Promise<MergeSummary> => {
  const session = await mongoose.startSession();
  let summary: MergeSummary | undefined;
  try {
    await session.withTransaction(async () => {
      const plan = await buildPlan(sourceId, targetId, session);
      const { source, target, resolution, fields } = plan;
      const from = objectId(sourceId);
      const to = objectId(targetId);
      const opts = { session };

      // Primero lo descartado, para no chocar con los índices únicos al mover
      await applyDeletions(resolution, session);

      await Attendance.updateMany({ youngId: from }, { $set: { youngId: to } }, opts);
      await PointsTransaction.updateMany({ youngId: from }, { $set: { youngId: to } }, opts);
      await PointsTransaction.updateMany({ referredYoungId: from }, { $set: { referredYoungId: to } }, opts);
      await PointsTransaction.updateMany({ assignedBy: from }, { $set: { assignedBy: to } }, opts);

      await Streak.updateMany({ youngId: from }, { $set: { youngId: to } }, opts);
      for (const patch of resolution.streakPatches) {
        await Streak.updateOne({ _id: patch.id }, { $set: patch.set }, opts);
      }

      await ConsentRecord.updateMany({ young_id: from }, { $set: { young_id: to } }, opts);

      const finalPlaca = fields.movesPlaca ? source.placa : target.placa || null;
      const touchedForms: any[] = await FormResponse.distinct('formId', { 'respondent.youngId': from }).session(session);
      await FormResponse.updateMany(
        { 'respondent.youngId': from },
        {
          $set: {
            'respondent.youngId': to,
            'respondent.placa': finalPlaca,
            'respondent.contact.fullName': target.fullName,
          },
        },
        opts
      );
      for (const link of resolution.responseLinks) {
        await FormResponse.updateOne({ _id: link.id }, { $set: { pointsTransactionId: link.pointsTransactionId } }, opts);
      }
      for (const release of resolution.seatReleases) {
        await Form.updateOne(
          { _id: release.formId, seatsTaken: { $gte: release.count } },
          { $inc: { seatsTaken: -release.count } },
          opts
        );
      }
      const formIds = [...touchedForms.map(String), ...resolution.seatReleases.map(r => r.formId)];
      if (formIds.length) {
        await Form.updateMany(
          { _id: { $in: formIds }, 'sheets.enabled': true },
          { $set: { 'sheets.needsFullResync': true } },
          opts
        );
      }

      // Si ambos estaban en la misma semana del ranking, solo queda el destino
      await LeaderboardSnapshot.updateMany(
        { $and: [{ 'rankings.youngId': from }, { 'rankings.youngId': to }] },
        { $pull: { rankings: { youngId: from } } },
        opts
      );
      await LeaderboardSnapshot.updateMany(
        { 'rankings.youngId': from },
        { $set: { 'rankings.$[entry].youngId': to } },
        { ...opts, arrayFilters: [{ 'entry.youngId': from }] }
      );

      await Young.updateMany({ referredBy: from, _id: { $ne: to } }, { $set: { referredBy: to } }, opts);
      await RegistrationRequest.updateMany({ referredBy: from }, { $set: { referredBy: to } }, opts);
      await RegistrationRequest.updateMany({ reviewedBy: from }, { $set: { reviewedBy: to } }, opts);
      await QRCode.updateMany({ generatedBy: from }, { $set: { generatedBy: to } }, opts);
      await Form.updateMany({ createdBy: from }, { $set: { createdBy: to } }, opts);

      // Primero el origen: la placa es única y puede estar pasando al destino
      const now = new Date();
      await Young.updateOne(
        { _id: from },
        {
          $set: {
            deletedAt: now,
            mergedInto: to,
            mergedAt: now,
            mergedBy: mongoose.Types.ObjectId.isValid(adminId) ? objectId(adminId) : undefined,
            mergedEmail: source.email || null,
          },
          // Sin correo ni contraseña: el login busca por correo o placa sin filtrar eliminados
          $unset: { password: 1, email: 1, ...(fields.movesPlaca ? { placa: 1 } : {}) },
        },
        opts
      );
      if (Object.keys(fields.set).length) {
        await Young.updateOne({ _id: to }, { $set: fields.set }, opts);
      }

      summary = summarize(plan);
    });
  } finally {
    await session.endSession();
  }

  logger.info('Jóvenes fusionados', {
    context: 'YoungDuplicateService',
    sourceId,
    targetId,
    adminId,
    moves: summary?.moves,
    conflicts: summary?.conflicts,
  });
  return summary as MergeSummary;
};
