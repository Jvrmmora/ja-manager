/**
 * Política de contraseñas nuevas (cambio, reseteo por admin y recuperación por
 * correo): 8-50 caracteres con al menos una mayúscula, una minúscula y un
 * número. Caracteres especiales permitidos: @$!%*?&._-+=
 */
export const NEW_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&._\-+=]{8,50}$/;

export const NEW_PASSWORD_MESSAGE =
  'La nueva contraseña debe tener entre 8-50 caracteres, incluir al menos una mayúscula, una minúscula y un número. Caracteres especiales permitidos: @$!%*?&._-+=';
