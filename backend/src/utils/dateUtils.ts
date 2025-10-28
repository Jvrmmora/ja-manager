/**
 * Utilidades para manejo de fechas en zona horaria de Colombia (America/Bogota)
 */

const COLOMBIA_TIMEZONE = 'America/Bogota';

/**
 * Obtiene la fecha actual en Colombia en formato YYYY-MM-DD
 */
export const getCurrentDateColombia = (): string => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(now); // Retorna YYYY-MM-DD
};

/**
 * Obtiene la fecha y hora actual en Colombia
 */
export const getCurrentDateTimeColombia = (): Date => {
  const now = new Date();

  // Obtener la fecha completa en zona horaria de Colombia
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(part => part.type === 'year')?.value || '0');
  const month =
    parseInt(parts.find(part => part.type === 'month')?.value || '0') - 1; // JS months are 0-indexed
  const day = parseInt(parts.find(part => part.type === 'day')?.value || '0');
  const hour = parseInt(parts.find(part => part.type === 'hour')?.value || '0');
  const minute = parseInt(
    parts.find(part => part.type === 'minute')?.value || '0'
  );
  const second = parseInt(
    parts.find(part => part.type === 'second')?.value || '0'
  );

  return new Date(year, month, day, hour, minute, second);
};

/**
 * Convierte una fecha a la zona horaria de Colombia y retorna formato YYYY-MM-DD
 */
export const formatDateColombia = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(dateObj);
};

/**
 * Convierte una fecha a la zona horaria de Colombia y retorna formato completo
 */
export const formatDateTimeColombia = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const formatter = new Intl.DateTimeFormat('es-CO', {
    timeZone: COLOMBIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return formatter.format(dateObj);
};

/**
 * Obtiene el inicio del día en Colombia (00:00:00)
 */
export const getStartOfDayColombia = (date?: Date | string): Date => {
  const targetDate = date
    ? typeof date === 'string'
      ? new Date(date)
      : date
    : new Date();

  // Obtener la fecha en Colombia
  const dateStr = formatDateColombia(targetDate);

  // Crear nueva fecha con zona horaria de Colombia
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(targetDate);
  const year = parseInt(parts.find(part => part.type === 'year')?.value || '0');
  const month =
    parseInt(parts.find(part => part.type === 'month')?.value || '0') - 1;
  const day = parseInt(parts.find(part => part.type === 'day')?.value || '0');

  return new Date(year, month, day, 0, 0, 0, 0);
};

/**
 * Obtiene el final del día en Colombia (23:59:59.999)
 */
export const getEndOfDayColombia = (date?: Date | string): Date => {
  const targetDate = date
    ? typeof date === 'string'
      ? new Date(date)
      : date
    : new Date();

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(targetDate);
  const year = parseInt(parts.find(part => part.type === 'year')?.value || '0');
  const month =
    parseInt(parts.find(part => part.type === 'month')?.value || '0') - 1;
  const day = parseInt(parts.find(part => part.type === 'day')?.value || '0');

  return new Date(year, month, day, 23, 59, 59, 999);
};

/**
 * Verifica si una fecha está en el día actual de Colombia
 */
export const isToday = (date: Date | string): boolean => {
  const dateStr = formatDateColombia(date);
  const todayStr = getCurrentDateColombia();
  return dateStr === todayStr;
};

/**
 * Crea una fecha de expiración añadiendo horas a la fecha actual
 * Retorna un Date UTC que puede ser comparado directamente
 */
export const createExpirationDate = (hoursToAdd: number): Date => {
  const now = new Date(); // UTC actual
  const expiration = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
  return expiration;
};

/**
 * Verifica si una fecha ha expirado comparando con la hora actual
 * IMPORTANTE: Compara timestamps UTC directamente para evitar problemas de timezone
 */
export const isExpired = (expirationDate: Date | string): boolean => {
  const expDate =
    typeof expirationDate === 'string'
      ? new Date(expirationDate)
      : expirationDate;
  const now = new Date(); // UTC actual

  // Comparar timestamps directamente (ambos en milisegundos UTC)
  return expDate.getTime() <= now.getTime();
};

/**
 * Formatea una fecha para mostrar en formato local colombiano
 */
export const formatDisplayDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: COLOMBIA_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj);
};

/**
 * Formatea una hora para mostrar en formato local colombiano
 */
export const formatDisplayTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: COLOMBIA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(dateObj);
};

/**
 * Obtiene el mes actual en Colombia (1-12, para MongoDB $month)
 * Nota: MongoDB usa 1-12, mientras que JavaScript Date usa 0-11
 */
export const getCurrentMonthColombia = (): number => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIMEZONE,
    month: '2-digit',
  });

  const monthStr = formatter.format(now);
  return parseInt(monthStr); // 1-12 para MongoDB
};

/**
 * Obtiene el año actual en Colombia
 */
export const getCurrentYearColombia = (): number => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIMEZONE,
    year: 'numeric',
  });

  return parseInt(formatter.format(now));
};

/**
 * Helpers semanales (domingo a sábado) en zona horaria de Colombia
 */
export const getStartOfWeekColombia = (date?: Date | string): Date => {
  const target = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();

  // Obtener y normalizar a fecha local Colombia (año/mes/día)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  const parts = formatter.formatToParts(target);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = (parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1);
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  const local = new Date(year, month, day, 0, 0, 0, 0);

  // Calcular desplazamiento hasta domingo (0)
  const dayOfWeek = local.getDay(); // 0..6, 0=domingo
  const start = new Date(local);
  start.setDate(local.getDate() - dayOfWeek);
  start.setHours(0, 0, 0, 0);
  return start;
};

export const getEndOfWeekColombia = (date?: Date | string): Date => {
  const start = getStartOfWeekColombia(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // sábado
  end.setHours(23, 59, 59, 999);
  return end;
};

/**
 * Devuelve true si la fecha cae en sábado en Colombia
 */
export const isSaturdayColombia = (date: Date | string): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Normalizamos a fecha local para evitar cruces de UTC
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(d);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = (parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1);
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  const local = new Date(year, month, day, 12, 0, 0, 0); // medio día evita ruido
  return local.getDay() === 6; // 6 = sábado
};
