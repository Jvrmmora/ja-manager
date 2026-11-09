// Rango de edad calculado desde la fecha de nacimiento (YYYY-MM-DD).
// El backend lo recalcula igual; aquí solo se usa para mostrarlo.
export const ageRangeFromBirthday = (birthday: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthday || '');
  if (!m) return '';
  const [, y, mo, d] = m.map(Number) as unknown as number[];
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)) {
    age--;
  }
  if (age < 0) return '';
  if (age <= 15) return '13-15';
  if (age <= 18) return '16-18';
  if (age <= 21) return '19-21';
  if (age <= 25) return '22-25';
  if (age <= 30) return '26-30';
  return '30+';
};
