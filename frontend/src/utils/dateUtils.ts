/**
 * Utilidades para manejo de fechas en zona horaria de Colombia (America/Bogota)
 * Frontend utilities
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

/**
 * Calcula el tiempo restante hasta una fecha de expiración
 */
export const getTimeUntilExpiration = (expirationDate: Date | string): {
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
} => {
  const expDate = typeof expirationDate === 'string' ? new Date(expirationDate) : expirationDate;
  const now = getCurrentDateTimeColombia();
  const timeLeft = expDate.getTime() - now.getTime();

  if (timeLeft <= 0) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true
    };
  }

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  return {
    hours,
    minutes,
    seconds,
    isExpired: false
  };
};

/**
 * Formatea el contador regresivo
 */
export const formatCountdown = (expirationDate: Date | string): string => {
  const time = getTimeUntilExpiration(expirationDate);
  
  if (time.isExpired) {
    return 'Expirado';
  }

  return `${time.hours.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}:${time.seconds.toString().padStart(2, '0')}`;
};