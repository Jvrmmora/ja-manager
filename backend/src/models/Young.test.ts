import Young from './Young';

// La zona horaria del proceso la fija quien corre los tests (`npm run test:tz`).
describe('Young: cumpleaños independiente de la zona del servidor', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  // Gabriela: guardada como 10 de noviembre a las 00:00 UTC
  const young = () =>
    new Young({
      fullName: 'Gabriela',
      birthday: new Date('2007-11-10T00:00:00.000Z'),
    });

  it('isBirthdayToday es true el 10 de noviembre', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-10T17:00:00.000Z'));
    expect(young().isBirthdayToday()).toBe(true);
  });

  it('isBirthdayToday es false el 9 de noviembre', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-09T17:00:00.000Z'));
    expect(young().isBirthdayToday()).toBe(false);
  });

  it('getCurrentAge cumple los 19 el día del cumpleaños y no antes', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-10T17:00:00.000Z'));
    expect(young().getCurrentAge()).toBe(19);
    jest.setSystemTime(new Date('2026-11-09T17:00:00.000Z'));
    expect(young().getCurrentAge()).toBe(18);
  });
});
