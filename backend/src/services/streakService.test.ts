jest.mock('../models/Streak');
jest.mock('../models/QRCode');

import Streak from '../models/Streak';
import QRCode from '../models/QRCode';
import { updateStreakOnAttendance, getSaturdayStart } from './streakService';

const mockedQRCode = QRCode as jest.Mocked<typeof QRCode>;

const YOUNG_ID = 'young1';
const SEASON_ID = 'season1';

// Sábados reales y consecutivos (Bogotá no tiene horario de verano, así que
// fijar la hora a mediodía UTC evita cualquier ambigüedad de día por huso horario).
const SAT_1 = new Date('2024-01-06T17:00:00Z'); // sábado
const SAT_2 = new Date('2024-01-13T17:00:00Z'); // sábado siguiente (hueco de 1)
const SAT_4 = new Date('2024-01-27T17:00:00Z'); // 3 semanas después de SAT_1

const makeStreakDoc = (overrides: Record<string, any> = {}) => {
  const doc: any = {
    youngId: YOUNG_ID,
    seasonId: SEASON_ID,
    currentStreakWeeks: 0,
    bestStreakWeeks: 0,
    lastAttendanceSaturday: null,
    violetFlameAwarded: false,
    ...overrides,
  };
  doc.save = jest.fn().mockImplementation(async () => doc);
  return doc;
};

describe('streakService.updateStreakOnAttendance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Streak as any).getOrCreate = jest.fn();
  });

  it('ignora asistencias que no son sábado', async () => {
    const result = await updateStreakOnAttendance(
      YOUNG_ID,
      SEASON_ID,
      new Date('2024-01-08T17:00:00Z') // lunes
    );
    expect(result).toBeNull();
    expect((Streak as any).getOrCreate).not.toHaveBeenCalled();
  });

  it('arranca la racha en 1 en la primera asistencia de sábado', async () => {
    const doc = makeStreakDoc();
    (Streak as any).getOrCreate.mockResolvedValue(doc);

    const result = await updateStreakOnAttendance(YOUNG_ID, SEASON_ID, SAT_1);

    expect(result?.streak.currentStreakWeeks).toBe(1);
    expect(mockedQRCode.distinct).not.toHaveBeenCalled();
  });

  it('no procesa dos veces el mismo sábado', async () => {
    const doc = makeStreakDoc({
      currentStreakWeeks: 2,
      lastAttendanceSaturday: getSaturdayStart(SAT_1),
    });
    (Streak as any).getOrCreate.mockResolvedValue(doc);

    const result = await updateStreakOnAttendance(YOUNG_ID, SEASON_ID, SAT_1);

    expect(result?.streak.currentStreakWeeks).toBe(2);
    expect(doc.save).not.toHaveBeenCalled();
  });

  it('mantiene y suma la racha con un solo sábado de hueco (sin consultar QR)', async () => {
    const doc = makeStreakDoc({
      currentStreakWeeks: 1,
      lastAttendanceSaturday: getSaturdayStart(SAT_1),
    });
    (Streak as any).getOrCreate.mockResolvedValue(doc);

    const result = await updateStreakOnAttendance(YOUNG_ID, SEASON_ID, SAT_2);

    expect(result?.streak.currentStreakWeeks).toBe(2);
    expect(mockedQRCode.distinct).not.toHaveBeenCalled();
  });

  it('no rompe la racha si los sábados saltados no tuvieron culto joven (sin QR)', async () => {
    // Caso del usuario: 2 sábados de hueco (13 y 20 ene) sin QR generado en ninguno.
    mockedQRCode.distinct.mockResolvedValue([]);
    const doc = makeStreakDoc({
      currentStreakWeeks: 3,
      lastAttendanceSaturday: getSaturdayStart(SAT_1),
    });
    (Streak as any).getOrCreate.mockResolvedValue(doc);

    const result = await updateStreakOnAttendance(YOUNG_ID, SEASON_ID, SAT_4);

    expect(result?.streak.currentStreakWeeks).toBe(4); // continúa, no se reinicia
  });

  it('rompe la racha si los 2 sábados saltados tuvieron culto joven real (QR) sin asistir', async () => {
    mockedQRCode.distinct.mockResolvedValue(['2024-01-13', '2024-01-20']);
    const doc = makeStreakDoc({
      currentStreakWeeks: 3,
      lastAttendanceSaturday: getSaturdayStart(SAT_1),
    });
    (Streak as any).getOrCreate.mockResolvedValue(doc);

    const result = await updateStreakOnAttendance(YOUNG_ID, SEASON_ID, SAT_4);

    expect(result?.streak.currentStreakWeeks).toBe(1); // se reinicia
  });

  it('tolera 1 falta real de por medio (solo 1 de los 2 sábados tuvo QR)', async () => {
    mockedQRCode.distinct.mockResolvedValue(['2024-01-13']); // solo el primero tuvo culto
    const doc = makeStreakDoc({
      currentStreakWeeks: 3,
      lastAttendanceSaturday: getSaturdayStart(SAT_1),
    });
    (Streak as any).getOrCreate.mockResolvedValue(doc);

    const result = await updateStreakOnAttendance(YOUNG_ID, SEASON_ID, SAT_4);

    expect(result?.streak.currentStreakWeeks).toBe(4); // continúa
  });

  it('otorga la Llama Violeta al llegar a 4 sábados consecutivos', async () => {
    const doc = makeStreakDoc({
      currentStreakWeeks: 3,
      lastAttendanceSaturday: getSaturdayStart(SAT_1),
      violetFlameAwarded: false,
    });
    (Streak as any).getOrCreate.mockResolvedValue(doc);

    const result = await updateStreakOnAttendance(YOUNG_ID, SEASON_ID, SAT_2);

    expect(result?.streak.currentStreakWeeks).toBe(4);
    expect(result?.awardVioletFlame).toBe(true);
    expect(doc.violetFlameAwarded).toBe(true);
  });
});
