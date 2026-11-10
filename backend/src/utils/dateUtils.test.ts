import {
  formatDateColombia,
  isSaturdayColombia,
  getStartOfWeekColombia,
  getEndOfWeekColombia,
  getBirthdayCalendarParts,
  isBirthdayToday,
  isWithinBirthdayClaimWindow,
} from './dateUtils';

describe('dateUtils (zona America/Bogota)', () => {
  it('formatDateColombia devuelve YYYY-MM-DD', () => {
    // 2025-03-01 05:30 UTC => 2025-03-01 00:30 en Bogotá (UTC-5)
    expect(formatDateColombia('2025-03-01T05:30:00Z')).toBe('2025-03-01');
    // 2025-03-01 03:00 UTC => 2025-02-28 22:00 en Bogotá
    expect(formatDateColombia('2025-03-01T03:00:00Z')).toBe('2025-02-28');
  });

  it('isSaturdayColombia identifica correctamente el sábado', () => {
    expect(isSaturdayColombia('2025-08-30T12:00:00Z')).toBe(true); // sábado
    expect(isSaturdayColombia('2025-08-31T12:00:00Z')).toBe(false); // domingo
  });

  it('getStartOfWeekColombia devuelve un domingo a las 00:00', () => {
    const start = getStartOfWeekColombia('2025-08-27T12:00:00Z'); // miércoles
    expect(start.getDay()).toBe(0);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });

  it('getEndOfWeekColombia es 6 días después del inicio (sábado)', () => {
    const start = getStartOfWeekColombia('2025-08-27T12:00:00Z');
    const end = getEndOfWeekColombia('2025-08-27T12:00:00Z');
    const diffDays = Math.floor(
      (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
    );
    expect(diffDays).toBe(6);
    expect(end.getDay()).toBe(6);
    expect(end.getHours()).toBe(23);
  });
});

describe('cumpleaños: el día calendario no depende de la zona del servidor', () => {
  // La zona horaria del proceso la fija quien corre los tests: `npm run test:tz`
  // repite esta suite con TZ=UTC, America/Bogota, America/Los_Angeles y
  // Asia/Tokyo (cambiar process.env.TZ desde dentro de Jest no tiene efecto).
  afterEach(() => {
    jest.useRealTimers();
  });

  // Los cumpleaños reales se guardan a las 00:00 UTC (Excel) o a las 05:00 UTC
  // (formulario, medianoche de Bogotá). Ambos son "10 de noviembre".
  const GUARDADOS_EL_10_NOV = [
    '2007-11-10T00:00:00.000Z',
    '2007-11-10T05:00:00.000Z',
  ];

  describe('getBirthdayCalendarParts', () => {
    it('lee el mismo día calendario sea cual sea la zona del servidor', () => {
      for (const guardado of GUARDADOS_EL_10_NOV) {
        const esperado = { year: 2007, month: 10, day: 10 }; // noviembre (0-indexed)
        expect(getBirthdayCalendarParts(guardado)).toEqual(esperado);
        expect(getBirthdayCalendarParts(new Date(guardado))).toEqual(esperado);
      }
    });
  });

  describe('isBirthdayToday', () => {
    // [instante simulado en UTC, ¿es hoy el 10 de nov. en Bogotá?]
    const INSTANTES: Array<[string, boolean, string]> = [
      ['2026-11-10T17:00:00.000Z', true, 'mediodía del 10 en Bogotá'],
      ['2026-11-10T05:00:00.000Z', true, 'justo a medianoche del 10 en Bogotá'],
      ['2026-11-11T04:59:00.000Z', true, '23:59 del 10 en Bogotá'],
      ['2026-11-10T04:59:00.000Z', false, '23:59 del 9 en Bogotá'],
      ['2026-11-11T05:00:00.000Z', false, 'medianoche del 11 en Bogotá'],
    ];

    it.each(INSTANTES)('%s -> %s (%s)', (instante, esHoy) => {
      jest.useFakeTimers().setSystemTime(new Date(instante));
      for (const guardado of GUARDADOS_EL_10_NOV) {
        expect(isBirthdayToday(guardado)).toBe(esHoy);
      }
    });

    it('no confunde el día anterior ni el siguiente', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-11-10T17:00:00.000Z'));
      expect(isBirthdayToday('2007-11-09T00:00:00.000Z')).toBe(false);
      expect(isBirthdayToday('2007-11-11T00:00:00.000Z')).toBe(false);
      expect(isBirthdayToday('2007-11-11T05:00:00.000Z')).toBe(false);
    });
  });

  describe('isWithinBirthdayClaimWindow', () => {
    it('el día del cumpleaños entra a la ventana', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-11-10T17:00:00.000Z'));
      for (const guardado of GUARDADOS_EL_10_NOV) {
        expect(isWithinBirthdayClaimWindow(guardado, null)).toBe(true);
      }
    });

    it('el día anterior al cumpleaños todavía no puede reclamar', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-11-09T17:00:00.000Z'));
      for (const guardado of GUARDADOS_EL_10_NOV) {
        expect(isWithinBirthdayClaimWindow(guardado, null)).toBe(false);
      }
    });

    it('la ventana dura 10 días después del cumpleaños', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-11-20T17:00:00.000Z'));
      expect(isWithinBirthdayClaimWindow('2007-11-10T00:00:00.000Z', null)).toBe(true);
      jest.setSystemTime(new Date('2026-11-21T17:00:00.000Z'));
      expect(isWithinBirthdayClaimWindow('2007-11-10T00:00:00.000Z', null)).toBe(false);
    });
  });
});
