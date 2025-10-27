/**
 * Sistema de Puntos - Configuración y Constantes
 *
 * Define los valores predefinidos de puntos y las categorías recomendadas
 * para diferentes tipos de actividades en la plataforma JA Manager.
 */

export const POINTS_PRESETS = [
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
] as const;

export type PointValue = (typeof POINTS_PRESETS)[number];

/**
 * Categorías sugeridas de puntos según el tipo de actividad
 */
export const POINTS_CATEGORIES = {
  ATTENDANCE: {
    label: 'Asistencia',
    description: 'Puntos por asistencia regular o eventos especiales',
    suggested: [10, 20, 30] as const,
    recommendations: {
      10: 'Asistencia regular (QR estándar)',
      20: 'Evento especial o actividad importante',
      30: 'Evento excepcional (campamento, retiro)',
    },
  },
  ACTIVITY: {
    label: 'Actividades',
    description: 'Puntos por diferentes tipos de participación',
    suggested: [10, 20, 30] as const,
    recommendations: {
      10: 'Participación (fogatas, salidas, ideas)',
      20: 'Liderazgo activo en actividades',
      30: 'Liderazgo en eventos importantes',
    },
  },
  BONUS: {
    label: 'Bonos',
    description: 'Puntos especiales por logros o comportamiento destacado',
    suggested: [20, 30, 40, 50] as const,
    recommendations: {
      20: 'Bono por comportamiento',
      30: 'Logro especial',
      40: 'Reconocimiento destacado',
      50: 'Logro excepcional',
    },
  },
  REFERRAL: {
    label: 'Referidos',
    description: 'Puntos por invitar nuevos jóvenes',
    suggested: [70] as const,
    recommendations: {
      70: 'Invitar a un amigo (mayor incentivo)',
    },
  },
  STREAK: {
    label: 'Rachas',
    description: 'Puntos por asistencia consecutiva',
    suggested: [20, 30, 40, 50] as const,
    recommendations: {
      20: 'Racha de 3 asistencias',
      30: 'Racha de 5 asistencias',
      40: 'Racha de 8 asistencias',
      50: 'Racha de 10+ asistencias',
    },
  },
  PENALTY: {
    label: 'Penalizaciones',
    description: 'Descuentos por ausencias o comportamiento',
    suggested: [-10, -20, -30] as const,
    recommendations: {
      '-10': 'Ausencia justificada',
      '-20': 'Ausencia sin justificar',
      '-30': 'Comportamiento inadecuado',
    },
  },
} as const;

/**
 * Valores por defecto según el tipo de transacción
 */
export const DEFAULT_POINTS_BY_TYPE = {
  ATTENDANCE: 10,
  ACTIVITY: 10,
  BONUS: 30,
  REFERRAL: 70,
  STREAK: 30,
  PENALTY: -10,
} as const;

/**
 * Obtiene el valor por defecto para un tipo de transacción
 */
export const getDefaultPoints = (
  type: keyof typeof DEFAULT_POINTS_BY_TYPE
): number => {
  return DEFAULT_POINTS_BY_TYPE[type];
};

/**
 * Obtiene los valores sugeridos para un tipo de transacción
 */
export const getSuggestedPoints = (
  type: keyof typeof POINTS_CATEGORIES
): readonly number[] => {
  return POINTS_CATEGORIES[type]?.suggested || POINTS_PRESETS;
};

/**
 * Verifica si un valor de puntos es válido
 */
export const isValidPointValue = (points: number): boolean => {
  return (
    POINTS_PRESETS.includes(points as PointValue) ||
    points < 0 || // Permitir penalizaciones personalizadas
    points % 10 === 0
  ); // Permitir múltiplos de 10
};
