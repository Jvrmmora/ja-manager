/**
 * Política de contraseñas nuevas. Debe coincidir con el backend
 * (`backend/src/utils/passwordPolicy.ts`): 8-50 caracteres con al menos una
 * mayúscula, una minúscula y un número; solo se permiten letras, números y
 * los símbolos @$!%*?&._-+=
 */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 50;

const ALLOWED_CHARS = /^[A-Za-z\d@$!%*?&._\-+=]*$/;
const NEW_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&._\-+=]{8,50}$/;

export interface PasswordCheck {
  id: 'length' | 'upper' | 'lower' | 'digit' | 'chars';
  label: string;
  ok: boolean;
}

/**
 * Los cuatro requisitos que se muestran siempre. Si la contraseña trae un
 * carácter no permitido (por ejemplo "#" o un espacio) se agrega un quinto
 * para que la persona entienda por qué el servidor la rechazaría.
 */
export const checkPassword = (password: string): PasswordCheck[] => {
  const checks: PasswordCheck[] = [
    {
      id: 'length',
      label: `${PASSWORD_MIN} a ${PASSWORD_MAX} caracteres`,
      ok: password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX,
    },
    { id: 'upper', label: 'Una mayúscula', ok: /[A-Z]/.test(password) },
    { id: 'lower', label: 'Una minúscula', ok: /[a-z]/.test(password) },
    { id: 'digit', label: 'Un número', ok: /\d/.test(password) },
  ];
  if (!ALLOWED_CHARS.test(password)) {
    checks.push({
      id: 'chars',
      label: 'Solo letras, números y @$!%*?&._-+=',
      ok: false,
    });
  }
  return checks;
};

export const isPasswordValid = (password: string): boolean =>
  NEW_PASSWORD_REGEX.test(password);

/** 0 a 4: cuántos de los cuatro requisitos básicos se cumplen. */
export const passwordStrength = (password: string): number =>
  checkPassword(password)
    .filter(check => check.id !== 'chars')
    .filter(check => check.ok).length;

export const strengthLabel = (score: number, password: string): string => {
  if (!password) return '';
  if (score <= 1) return 'Débil';
  if (score === 2) return 'Regular';
  if (score === 3) return 'Buena';
  return 'Fuerte';
};
