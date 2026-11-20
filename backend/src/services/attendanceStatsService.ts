import Season from '../models/Season';
import Young from '../models/Young';
import AttendanceModel from '../models/Attendance';
import { NotFoundError } from '../utils/errorHandler';
import { formatDateColombia } from '../utils/dateUtils';
import {
  getAttendanceDaysInRange,
  type AttendanceCalendarDay,
} from './attendanceService';

/** Umbral de "joven constante": asistió a este % o más de los cultos. */
export const CONSTANT_THRESHOLD = 0.75;
/** Cultos seguidos sin asistir para considerar a un joven "en riesgo". */
export const RISK_STREAK = 3;
const RISK_LIST_LIMIT = 5;
const TOP_LIST_LIMIT = 5;

interface DayRecord {
  date: string;
  attendees: number;
}

export interface SeasonDaysStats {
  summary: {
    cultos: number;
    actividades: number;
    eventos: number;
    totalAsistentes: number;
    promedioCulto: number;
    /** Promedio de la 2.ª mitad de cultos menos el de la 1.ª (null si hay <4). */
    tendencia: number | null;
  };
  records: {
    cultoMax: DayRecord | null;
    cultoMin: DayRecord | null;
    actividadMax: DayRecord | null;
    actividadMin: DayRecord | null;
  };
  cultosSeries: DayRecord[];
  months: {
    month: string;
    attendees: number;
    eventos: number;
    cultos: number;
    actividades: number;
  }[];
  topMonths: { asistencia: string | null; actividades: string | null };
  split: {
    cultos: { eventos: number; attendees: number };
    actividades: { eventos: number; attendees: number };
  };
}

const avg = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

const pick = (list: DayRecord[], better: (a: number, b: number) => boolean) =>
  list.reduce<DayRecord | null>(
    (best, d) => (!best || better(d.attendees, best.attendees) ? d : best),
    null
  );

/**
 * Estadísticas de la temporada a partir de los días con QR. Solo cuentan los
 * eventos con asistentes: un QR sin nadie no es un culto ni una actividad.
 */
export const buildSeasonDaysStats = (
  days: AttendanceCalendarDay[]
): SeasonDaysStats => {
  const withPeople = days.filter(d => d.attendees > 0);
  const cultos = withPeople.filter(d => d.kind === 'CULTO');
  const actividades = withPeople.filter(d => d.kind === 'ACTIVIDAD');
  const toRec = (d: AttendanceCalendarDay): DayRecord => ({
    date: d.date,
    attendees: d.attendees,
  });
  const cultoRecs = cultos.map(toRec);
  const actRecs = actividades.map(toRec);

  const half = Math.floor(cultos.length / 2);
  const tendencia =
    cultos.length >= 4
      ? Math.round(
          avg(cultos.slice(cultos.length - half).map(d => d.attendees)) -
            avg(cultos.slice(0, half).map(d => d.attendees))
        )
      : null;

  const byMonth = new Map<
    string,
    { attendees: number; eventos: number; cultos: number; actividades: number }
  >();
  withPeople.forEach(d => {
    const key = d.date.slice(0, 7);
    const m = byMonth.get(key) ?? {
      attendees: 0,
      eventos: 0,
      cultos: 0,
      actividades: 0,
    };
    m.attendees += d.attendees;
    m.eventos += 1;
    if (d.kind === 'CULTO') m.cultos += 1;
    else m.actividades += 1;
    byMonth.set(key, m);
  });
  const months = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));

  const top = (field: 'attendees' | 'actividades') => {
    const best = months.reduce<(typeof months)[number] | null>(
      (b, m) => (m[field] > 0 && (!b || m[field] > b[field]) ? m : b),
      null
    );
    return best ? best.month : null;
  };

  const sum = (xs: DayRecord[]) => xs.reduce((a, d) => a + d.attendees, 0);

  return {
    summary: {
      cultos: cultos.length,
      actividades: actividades.length,
      eventos: withPeople.length,
      totalAsistentes: sum(cultoRecs) + sum(actRecs),
      promedioCulto: Math.round(avg(cultoRecs.map(d => d.attendees))),
      tendencia,
    },
    records: {
      cultoMax: pick(cultoRecs, (a, b) => a > b),
      cultoMin: pick(cultoRecs, (a, b) => a < b),
      actividadMax: pick(actRecs, (a, b) => a > b),
      actividadMin: pick(actRecs, (a, b) => a < b),
    },
    cultosSeries: cultoRecs,
    months,
    topMonths: { asistencia: top('attendees'), actividades: top('actividades') },
    split: {
      cultos: { eventos: cultos.length, attendees: sum(cultoRecs) },
      actividades: { eventos: actividades.length, attendees: sum(actRecs) },
    },
  };
};

export interface YoungLite {
  id: string;
  fullName: string;
  profileImage?: string | undefined;
  group?: number | undefined;
  eligible: boolean;
}

/**
 * Constancia, jóvenes en riesgo y asistencia por grupo. `attended` mapea
 * cada joven con las fechas de culto a las que asistió.
 */
export const buildYoungStats = (
  cultoDates: string[],
  youngs: YoungLite[],
  attended: Map<string, Set<string>>
) => {
  const total = cultoDates.length;
  const eligible = youngs.filter(y => y.eligible);

  const constantes = eligible.filter(
    y =>
      total > 0 &&
      (attended.get(y.id)?.size ?? 0) / total >= CONSTANT_THRESHOLD
  ).length;

  // Racha actual: cultos más recientes consecutivos sin asistir
  const streakOf = (id: string) => {
    const set = attended.get(id);
    let streak = 0;
    for (let i = cultoDates.length - 1; i >= 0; i--) {
      if (set?.has(cultoDates[i] as string)) break;
      streak++;
    }
    return streak;
  };
  const atRisk = eligible
    .map(y => ({ y, streak: streakOf(y.id) }))
    // solo quien ya vino alguna vez: quien nunca vino es otro caso
    .filter(({ y, streak }) => streak >= RISK_STREAK && attended.has(y.id))
    .sort((a, b) => b.streak - a.streak || a.y.fullName.localeCompare(b.y.fullName));

  // Los más constantes: quienes más cultos de la temporada han asistido
  const top = eligible
    .map(y => ({ y, asistencias: attended.get(y.id)?.size ?? 0 }))
    .filter(({ asistencias }) => asistencias > 0)
    .sort(
      (a, b) =>
        b.asistencias - a.asistencias || a.y.fullName.localeCompare(b.y.fullName)
    )
    .slice(0, TOP_LIST_LIMIT)
    .map(({ y, asistencias }) => ({
      id: y.id,
      fullName: y.fullName,
      profileImage: y.profileImage,
      asistencias,
      cultos: total,
    }));

  return {
    constancia: {
      activos: eligible.length,
      constantes,
      porcentaje: eligible.length
        ? Math.round((constantes / eligible.length) * 100)
        : 0,
      umbral: CONSTANT_THRESHOLD,
      top,
    },
    enRiesgo: {
      total: atRisk.length,
      racha: RISK_STREAK,
      items: atRisk.slice(0, RISK_LIST_LIMIT).map(({ y, streak }) => ({
        id: y.id,
        fullName: y.fullName,
        profileImage: y.profileImage,
        streak,
      })),
    },
  };
};

/**
 * Alcance de la temporada: cuántos jóvenes activos asistieron a algo, cuántos
 * son nuevos (su primera asistencia histórica cae en la temporada) y cuántos
 * no han venido. `firstByYoung` = primera fecha de asistencia de cada joven.
 */
export const buildReachStats = (
  eligibleIds: string[],
  attendedInSeason: Set<string>,
  firstByYoung: Map<string, string>,
  from: string,
  to: string
) => {
  const asistieron = eligibleIds.filter(id => attendedInSeason.has(id)).length;
  const monthly = new Map<string, number>();
  let nuevos = 0;
  eligibleIds.forEach(id => {
    const first = firstByYoung.get(id);
    if (first && first >= from && first <= to) {
      nuevos++;
      const m = first.slice(0, 7);
      monthly.set(m, (monthly.get(m) ?? 0) + 1);
    }
  });
  return {
    alcance: {
      activos: eligibleIds.length,
      asistieron,
      sinAsistir: eligibleIds.length - asistieron,
      porcentaje: eligibleIds.length
        ? Math.round((asistieron / eligibleIds.length) * 100)
        : 0,
    },
    nuevos: {
      total: nuevos,
      porMes: [...monthly.entries()]
        .sort(([x], [y]) => x.localeCompare(y))
        .map(([month, count]) => ({ month, count })),
    },
  };
};

/** Estadísticas de asistencia de una temporada (la activa si no se indica). */
export const getSeasonAttendanceStats = async (seasonId?: string) => {
  const season = seasonId
    ? await Season.findById(seasonId).lean()
    : await Season.findOne({ status: 'ACTIVE' }).lean();
  if (!season) {
    throw new NotFoundError(
      seasonId ? 'Temporada no encontrada' : 'No hay una temporada activa'
    );
  }
  const from = formatDateColombia((season as any).startDate);
  const to = formatDateColombia((season as any).endDate);

  const days = await getAttendanceDaysInRange(from, to);
  const daysStats = buildSeasonDaysStats(days);
  const cultoDates = daysStats.cultosSeries.map(c => c.date);

  const [youngDocs, attendanceDocs, seasonAttendees, firstDates] =
    await Promise.all([
    Young.find({ deletedAt: null })
      .select('_id fullName profileImage group role_name')
      .lean(),
    cultoDates.length
      ? AttendanceModel.find({ attendanceDate: { $in: cultoDates } })
          .select('youngId attendanceDate')
          .lean()
      : Promise.resolve([]),
    AttendanceModel.distinct('youngId', {
      attendanceDate: { $gte: from, $lte: to },
    }),
    AttendanceModel.aggregate([
      { $group: { _id: '$youngId', first: { $min: '$attendanceDate' } } },
    ]),
  ]);

  const youngs: YoungLite[] = youngDocs.map((y: any) => ({
    id: String(y._id),
    fullName: y.fullName,
    profileImage: y.profileImage,
    group: y.group,
    // mismo criterio que el ranking: grupo 1 y sin Super Admin
    eligible: y.group === 1 && y.role_name !== 'Super Admin',
  }));
  const attended = new Map<string, Set<string>>();
  (attendanceDocs as any[]).forEach(a => {
    const id = String(a.youngId);
    if (!attended.has(id)) attended.set(id, new Set());
    attended.get(id)!.add(a.attendanceDate);
  });

  return {
    season: {
      id: String((season as any)._id),
      name: (season as any).name,
      status: (season as any).status,
      startDate: from,
      endDate: to,
    },
    ...daysStats,
    ...buildYoungStats(cultoDates, youngs, attended),
    ...buildReachStats(
      youngs.filter(y => y.eligible).map(y => y.id),
      new Set((seasonAttendees as any[]).map(String)),
      new Map((firstDates as any[]).map(f => [String(f._id), f.first as string])),
      from,
      to
    ),
  };
};
