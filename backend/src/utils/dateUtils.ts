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
    day: '2-digit'
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
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(part => part.type === 'year')?.value || '0');
  const month = parseInt(parts.find(part => part.type === 'month')?.value || '0') - 1; // JS months are 0-indexed
  const day = parseInt(parts.find(part => part.type === 'day')?.value || '0');
  const hour = parseInt(parts.find(part => part.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(part => part.type === 'minute')?.value || '0');
  const second = parseInt(parts.find(part => part.type === 'second')?.value || '0');
  
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
    day: '2-digit'
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
    hour12: false
  });
  
  return formatter.format(dateObj);
};

/**
 * Obtiene el inicio del día en Colombia (00:00:00)
 */
export const getStartOfDayColombia = (date?: Date | string): Date => {
  const targetDate = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
  
  // Obtener la fecha en Colombia
  const dateStr = formatDateColombia(targetDate);
  
  // Crear nueva fecha con zona horaria de Colombia
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(targetDate);
  const year = parseInt(parts.find(part => part.type === 'year')?.value || '0');
  const month = parseInt(parts.find(part => part.type === 'month')?.value || '0') - 1;
  const day = parseInt(parts.find(part => part.type === 'day')?.value || '0');
  
  return new Date(year, month, day, 0, 0, 0, 0);
};

/**
 * Obtiene el final del día en Colombia (23:59:59.999)
 */
export const getEndOfDayColombia = (date?: Date | string): Date => {
  const targetDate = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
  
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(targetDate);
  const year = parseInt(parts.find(part => part.type === 'year')?.value || '0');
  const month = parseInt(parts.find(part => part.type === 'month')?.value || '0') - 1;
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
 * Crea una fecha de expiración añadiendo horas a la fecha actual de Colombia
 */
export const createExpirationDate = (hoursToAdd: number): Date => {
  const now = getCurrentDateTimeColombia();
  const expiration = new Date(now);
  expiration.setHours(expiration.getHours() + hoursToAdd);
  return expiration;
};

/**
 * Verifica si una fecha ha expirado comparando con la hora actual de Colombia
 */
export const isExpired = (expirationDate: Date | string): boolean => {
  const expDate = typeof expirationDate === 'string' ? new Date(expirationDate) : expirationDate;
  const now = getCurrentDateTimeColombia();
  return expDate <= now;
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
    day: 'numeric'
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
    hour12: true
  }).format(dateObj);
};