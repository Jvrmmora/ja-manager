import { buildFieldMerge, MergeHistory, resolveMergeConflicts } from './mergePlan';

const ids = { sourceId: 'S', targetId: 'T' };
const empty = (): MergeHistory => ({ attendances: [], transactions: [], streaks: [], responses: [] });
const tx = (id: string, type: string, extra: Record<string, unknown> = {}) => ({
  id,
  type,
  points: 10,
  seasonId: 'season1',
  createdAt: new Date('2026-06-15T15:00:00Z'),
  ...extra,
});

describe('buildFieldMerge', () => {
  it('completa solo lo que le falta al destino', () => {
    const { set, filled } = buildFieldMerge(
      { fullName: 'Destino', phone: '', email: 'd@x.com', skills: ['canto'] },
      { fullName: 'Origen', phone: '300', email: 'o@x.com', gender: 'femenino', skills: ['canto', 'piano'] },
      ids
    );
    expect(set).toEqual({ phone: '300', gender: 'femenino', skills: ['canto', 'piano'] });
    expect(filled).toEqual(['phone', 'gender', 'skills']);
  });

  it('el rango de edad acompaña a la fecha de nacimiento heredada', () => {
    const birthday = new Date('1995-01-01');
    const { set } = buildFieldMerge({ ageRange: '13-15' }, { birthday, ageRange: '30+' }, ids);
    expect(set).toMatchObject({ birthday, ageRange: '30+' });
  });

  it('conserva la fecha más reciente de puntos de cumpleaños', () => {
    const oldClaim = new Date('2025-10-21');
    const newClaim = new Date('2026-10-21');
    expect(
      buildFieldMerge({ birthdayPointsClaimed: oldClaim }, { birthdayPointsClaimed: newClaim }, ids).set.birthdayPointsClaimed
    ).toEqual(newClaim);
    expect(buildFieldMerge({ birthdayPointsClaimed: newClaim }, { birthdayPointsClaimed: oldClaim }, ids).set).toEqual({});
  });

  it('hereda placa y contraseña solo si el destino no tiene', () => {
    const result = buildFieldMerge({}, { placa: '@MODPRUE001', password: 'hash', first_login: true }, ids);
    expect(result.movesPlaca).toBe(true);
    expect(result.set).toMatchObject({ placa: '@MODPRUE001', password: 'hash', first_login: true });
    expect(buildFieldMerge({ placa: '@MODPRUE002' }, { placa: '@MODPRUE001' }, ids).movesPlaca).toBe(false);
  });

  it('nunca deja a nadie referido por sí mismo', () => {
    expect(buildFieldMerge({}, { referredBy: 'T' }, ids).set.referredBy).toBeUndefined();
    expect(buildFieldMerge({ referredBy: 'S' }, {}, ids).set.referredBy).toBeNull();
  });

  it('hereda el consentimiento vigente si el destino no lo tiene', () => {
    const consent = { status: 'current' };
    expect(buildFieldMerge({ dataConsent: { status: 'none' } }, { dataConsent: consent }, ids).set.dataConsent).toBe(consent);
    expect(buildFieldMerge({ dataConsent: consent }, { dataConsent: { status: 'none' } }, ids).set).toEqual({});
  });
});

describe('resolveMergeConflicts', () => {
  it('sin choques no descarta nada', () => {
    const source = { ...empty(), transactions: [tx('t1', 'BIRTHDAY')] };
    const result = resolveMergeConflicts(source, empty(), ids);
    expect(result.deleteTransactionIds).toEqual([]);
    expect(Object.values(result.conflicts).every(n => n === 0)).toBe(true);
  });

  it('asistencia del mismo día: descarta la del origen y sus puntos', () => {
    const source = {
      ...empty(),
      attendances: [
        { id: 'a1', attendanceDate: '2026-06-13', qrCodeId: 'qr1' },
        { id: 'a2', attendanceDate: '2026-06-20', qrCodeId: 'qr2' },
      ],
      transactions: [tx('t1', 'ATTENDANCE', { eventId: 'qr1' }), tx('t2', 'ATTENDANCE', { eventId: 'qr2' })],
    };
    const target = { ...empty(), attendances: [{ id: 'b1', attendanceDate: '2026-06-13', qrCodeId: 'qr1' }] };
    const result = resolveMergeConflicts(source, target, ids);
    expect(result.deleteAttendanceIds).toEqual(['a1']);
    expect(result.deleteTransactionIds).toEqual(['t1']);
  });

  it('un solo cumpleaños por año; años distintos se conservan', () => {
    const source = {
      ...empty(),
      transactions: [
        tx('s2026', 'BIRTHDAY', { createdAt: new Date('2026-10-21T15:00:00Z') }),
        tx('s2025', 'BIRTHDAY', { createdAt: new Date('2025-10-21T15:00:00Z') }),
      ],
    };
    const target = { ...empty(), transactions: [tx('t2026', 'BIRTHDAY', { createdAt: new Date('2026-10-21T16:00:00Z') })] };
    const result = resolveMergeConflicts(source, target, ids);
    expect(result.deleteTransactionIds).toEqual(['s2026']);
    expect(result.conflicts.birthdays).toBe(1);
  });

  it('una sola bienvenida y una Llama Violeta por temporada', () => {
    const flame = { description: 'Llama Violeta - 4 sábados consecutivos' };
    const source = { ...empty(), transactions: [tx('w1', 'REFERRAL_WELCOME'), tx('f1', 'BONUS', flame), tx('b1', 'BONUS')] };
    const target = { ...empty(), transactions: [tx('w2', 'REFERRAL_WELCOME'), tx('f2', 'BONUS', flame)] };
    expect(resolveMergeConflicts(source, target, ids).deleteTransactionIds.sort()).toEqual(['f1', 'w1']);
  });

  it('elimina los puntos de referido entre las dos cuentas', () => {
    const source = { ...empty(), transactions: [tx('r1', 'REFERRAL_WELCOME', { referredYoungId: 'S' })] };
    const target = { ...empty(), transactions: [tx('r2', 'REFERRAL_BONUS', { referredYoungId: 'S' })] };
    const result = resolveMergeConflicts(source, target, ids);
    expect(result.deleteTransactionIds.sort()).toEqual(['r1', 'r2']);
    expect(result.conflicts.selfReferrals).toBe(2);
  });

  it('racha repetida: una sola, con lo mejor de ambas', () => {
    const source = {
      ...empty(),
      streaks: [
        {
          id: 'st1',
          seasonId: 'season1',
          currentStreakWeeks: 3,
          bestStreakWeeks: 6,
          lastAttendanceSaturday: new Date('2026-06-20'),
          violetFlameAwarded: true,
          violetFlameAwardedAt: new Date('2026-05-01'),
        },
      ],
    };
    const target = {
      ...empty(),
      streaks: [
        {
          id: 'st2',
          seasonId: 'season1',
          currentStreakWeeks: 1,
          bestStreakWeeks: 2,
          lastAttendanceSaturday: new Date('2026-06-13'),
          violetFlameAwarded: false,
        },
      ],
    };
    const result = resolveMergeConflicts(source, target, ids);
    expect(result.deleteStreakIds).toEqual(['st1']);
    expect(result.streakPatches[0]).toMatchObject({
      id: 'st2',
      set: { bestStreakWeeks: 6, currentStreakWeeks: 3, violetFlameAwarded: true },
    });
  });

  it('misma respuesta a un formulario: queda la del destino y libera el cupo repetido', () => {
    const source = {
      ...empty(),
      responses: [
        { id: 'r1', formId: 'f1', attending: true, pointsTransactionId: 'tx1' },
        { id: 'r2', formId: 'f2', attending: false },
      ],
    };
    const target = {
      ...empty(),
      responses: [
        { id: 'r3', formId: 'f1', attending: true, pointsTransactionId: 'tx3' },
        { id: 'r4', formId: 'f2', attending: true },
      ],
    };
    const result = resolveMergeConflicts(source, target, ids);
    expect(result.deleteResponseIds).toEqual(['r1', 'r2']);
    expect(result.deleteTransactionIds).toEqual(['tx1']);
    expect(result.seatReleases).toEqual([{ formId: 'f1', count: 1 }]);
  });

  it('si la respuesta del destino no ganó puntos, hereda los del origen', () => {
    const source = { ...empty(), responses: [{ id: 'r1', formId: 'f1', pointsTransactionId: 'tx1' }] };
    const target = { ...empty(), responses: [{ id: 'r2', formId: 'f1' }] };
    const result = resolveMergeConflicts(source, target, ids);
    expect(result.deleteTransactionIds).toEqual([]);
    expect(result.responseLinks).toEqual([{ id: 'r2', pointsTransactionId: 'tx1' }]);
  });
});
