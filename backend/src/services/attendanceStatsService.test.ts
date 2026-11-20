jest.mock('../models/Season');
jest.mock('../models/Young');
jest.mock('../models/Attendance');
jest.mock('./attendanceService');

import {
  buildSeasonDaysStats,
  buildYoungStats,
  buildReachStats,
} from './attendanceStatsService';

const day = (date: string, attendees: number, kind: 'CULTO' | 'ACTIVIDAD') =>
  ({ date, attendees, kind, qrCount: 1, points: 10 }) as any;

describe('buildSeasonDaysStats', () => {
  const days = [
    day('2026-09-05', 11, 'CULTO'),
    day('2026-09-12', 9, 'CULTO'),
    day('2026-09-16', 6, 'ACTIVIDAD'), // miércoles
    day('2026-10-03', 16, 'CULTO'),
    day('2026-10-10', 14, 'CULTO'),
    day('2026-10-14', 20, 'ACTIVIDAD'),
    day('2026-10-17', 0, 'CULTO'), // QR sin asistentes: no cuenta
  ];
  const s = buildSeasonDaysStats(days);

  it('cuenta solo eventos con asistentes', () => {
    expect(s.summary.cultos).toBe(4);
    expect(s.summary.actividades).toBe(2);
    expect(s.summary.eventos).toBe(6);
    expect(s.summary.totalAsistentes).toBe(11 + 9 + 6 + 16 + 14 + 20);
  });

  it('calcula promedio, tendencia y récords', () => {
    expect(s.summary.promedioCulto).toBe(13); // (11+9+16+14)/4 = 12.5
    expect(s.summary.tendencia).toBe(5); // 15 - 10
    expect(s.records.cultoMax).toEqual({ date: '2026-10-03', attendees: 16 });
    expect(s.records.cultoMin).toEqual({ date: '2026-09-12', attendees: 9 });
    expect(s.records.actividadMax?.attendees).toBe(20);
    expect(s.records.actividadMin?.attendees).toBe(6);
  });

  it('agrupa por mes y marca los meses destacados', () => {
    expect(s.months.map(m => m.month)).toEqual(['2026-09', '2026-10']);
    expect(s.topMonths.asistencia).toBe('2026-10');
    expect(s.split.cultos).toEqual({ eventos: 4, attendees: 50 });
  });

  it('sin eventos devuelve ceros y nulos', () => {
    const e = buildSeasonDaysStats([]);
    expect(e.summary.promedioCulto).toBe(0);
    expect(e.records.cultoMax).toBeNull();
    expect(e.topMonths.asistencia).toBeNull();
    expect(e.summary.tendencia).toBeNull();
  });
});

describe('buildYoungStats', () => {
  const cultos = ['a', 'b', 'c', 'd'];
  // elegible = grupo 1 y no Super Admin, como en producción
  const y = (id: string, group: number, notAdmin = true) => ({
    id,
    fullName: `Joven ${id}`,
    group,
    eligible: group === 1 && notAdmin,
  });
  const attended = new Map<string, Set<string>>([
    ['1', new Set(['a', 'b', 'c', 'd'])], // 100%
    ['2', new Set(['a', 'b', 'c'])], // 75% → constante
    ['3', new Set(['a'])], // últimos 3 sin venir → riesgo
    ['5', new Set(['a', 'b'])], // 2 sin venir: no es riesgo
  ]);
  const youngs = [y('1', 1), y('2', 1), y('3', 1), y('4', 1), y('5', 2), y('6', 1, false)];
  const r = buildYoungStats(cultos, youngs, attended);

  it('cuenta constantes con el umbral de 75%', () => {
    expect(r.constancia.activos).toBe(4); // 1,2,3,4 (5 es otro grupo, 6 no elegible)
    expect(r.constancia.constantes).toBe(2);
    expect(r.constancia.porcentaje).toBe(50);
  });

  it('lista a los más constantes ordenados por asistencias', () => {
    expect(r.constancia.top.map(t => [t.id, t.asistencias])).toEqual([
      ['1', 4],
      ['2', 3],
      ['3', 1],
    ]);
    expect(r.constancia.top[0]?.cultos).toBe(4);
  });

  it('marca en riesgo solo a quien ya vino y lleva 3+ cultos sin asistir', () => {
    expect(r.enRiesgo.total).toBe(1);
    expect(r.enRiesgo.items[0]).toMatchObject({ id: '3', streak: 3 });
  });
});

describe('buildReachStats', () => {
  const r = buildReachStats(
    ['1', '2', '3', '4'],
    new Set(['1', '2', '9']), // 9 no es elegible
    new Map([
      ['1', '2026-09-05'], // nuevo en septiembre
      ['2', '2025-03-01'], // ya venía de antes
      ['3', '2026-10-10'], // nuevo en octubre
    ]),
    '2026-08-29',
    '2026-12-19'
  );

  it('cuenta quiénes asistieron y quiénes no', () => {
    expect(r.alcance).toEqual({
      activos: 4,
      asistieron: 2,
      sinAsistir: 2,
      porcentaje: 50,
    });
  });

  it('cuenta los nuevos por mes', () => {
    expect(r.nuevos.total).toBe(2);
    expect(r.nuevos.porMes).toEqual([
      { month: '2026-09', count: 1 },
      { month: '2026-10', count: 1 },
    ]);
  });
});
