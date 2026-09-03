import {
  formatDateColombia,
  isSaturdayColombia,
  getStartOfWeekColombia,
  getEndOfWeekColombia,
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
