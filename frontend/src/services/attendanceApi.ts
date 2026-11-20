import { apiRequest } from './httpClient';

// Generar QR del día (solo administradores)
export const generateDailyQR = async (
  force?: boolean,
  points?: number,
  speedBonusEnabled?: boolean,
  bonusDecayMinutes?: number
): Promise<any> => {
  const body: any = {};
  if (force) body.force = true;
  if (points !== undefined) body.points = points;
  if (speedBonusEnabled !== undefined)
    body.speedBonusEnabled = speedBonusEnabled;
  if (bonusDecayMinutes !== undefined)
    body.bonusDecayMinutes = bonusDecayMinutes;

  const response = await apiRequest('qr/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al generar código QR');
  }

  const result = await response.json();
  return result.data;
};

// Obtener QR activo del día
export const getCurrentQR = async (): Promise<any> => {
  const response = await apiRequest('qr/current', {
    method: 'GET',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'No hay QR activo para el día de hoy');
  }

  const result = await response.json();
  return result.data;
};

// Obtener estadísticas del QR actual
export const getQRStats = async (): Promise<any> => {
  const response = await apiRequest('qr/stats', {
    method: 'GET',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al obtener estadísticas');
  }

  const result = await response.json();
  return result.data;
};

// Escanear QR y registrar asistencia
export const scanQRAndRegisterAttendance = async (
  code: string
): Promise<any> => {
  const response = await apiRequest('attendance/scan', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al registrar asistencia');
  }

  const result = await response.json();
  return result.data;
};

export const manualRegisterAttendance = async (
  youngId: string
): Promise<any> => {
  const response = await apiRequest('attendance/manual', {
    method: 'POST',
    body: JSON.stringify({ youngId }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message || 'Error al registrar asistencia manual'
    );
  }
  const result = await response.json();
  return result.data;
};

// Obtener mi historial de asistencias
export const getMyAttendanceHistory = async (
  page: number = 1,
  limit: number = 10
): Promise<any> => {
  const response = await apiRequest(
    `attendance/my-history?page=${page}&limit=${limit}`,
    {
      method: 'GET',
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message || 'Error al obtener historial de asistencias'
    );
  }

  const result = await response.json();
  return result.data;
};

// Obtener asistencias del día (solo administradores)
export const getTodayAttendances = async (): Promise<any> => {
  const response = await apiRequest('attendance/today', {
    method: 'GET',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message || 'Error al obtener asistencias del día'
    );
  }

  const result = await response.json();
  return result.data;
};

// Obtener asistencias por fecha específica (solo administradores)
export const getAttendancesByDate = async (date: string): Promise<any> => {
  const response = await apiRequest(`attendance/date/${date}`, {
    method: 'GET',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message ||
        'Error al obtener asistencias de la fecha especificada'
    );
  }

  const result = await response.json();
  return result.data;
};

export interface AttendanceCalendarDay {
  date: string; // YYYY-MM-DD
  kind: 'CULTO' | 'ACTIVIDAD';
  attendees: number;
  qrCount: number;
  points: number;
}

// Calendario anual: días con culto (sábado con QR) o actividad (otro día con QR)
export const getAttendanceCalendar = async (
  year: number
): Promise<{ year: number; days: AttendanceCalendarDay[] }> => {
  const response = await apiRequest(`attendance/calendar?year=${year}`, {
    method: 'GET',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || 'Error al obtener el calendario de asistencias'
    );
  }

  const result = await response.json();
  return result.data;
};

// Obtener estadísticas de asistencia
export const getAttendanceStats = async (
  startDate?: string,
  endDate?: string
): Promise<any> => {
  let url = 'attendance/stats';
  const params = new URLSearchParams();

  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const response = await apiRequest(url, {
    method: 'GET',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message || 'Error al obtener estadísticas de asistencia'
    );
  }

  const result = await response.json();
  return result.data;
};

export interface SeasonStatRecord {
  date: string; // YYYY-MM-DD
  attendees: number;
}

export interface SeasonAttendanceStats {
  season: {
    id: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string;
  };
  summary: {
    cultos: number;
    actividades: number;
    eventos: number;
    totalAsistentes: number;
    promedioCulto: number;
    tendencia: number | null;
  };
  records: {
    cultoMax: SeasonStatRecord | null;
    cultoMin: SeasonStatRecord | null;
    actividadMax: SeasonStatRecord | null;
    actividadMin: SeasonStatRecord | null;
  };
  cultosSeries: SeasonStatRecord[];
  months: {
    month: string; // YYYY-MM
    attendees: number;
    eventos: number;
    cultos: number;
    actividades: number;
  }[];
  topMonths: { asistencia: string | null; actividades: string | null };
  split: {
    cultos: { eventos: number; attendees: number };
    actividades: { eventos: number; attendees: number };
  };
  constancia: {
    activos: number;
    constantes: number;
    porcentaje: number;
    umbral: number;
    top: {
      id: string;
      fullName: string;
      profileImage?: string;
      asistencias: number;
      cultos: number;
    }[];
  };
  enRiesgo: {
    total: number;
    racha: number;
    items: {
      id: string;
      fullName: string;
      profileImage?: string;
      streak: number;
    }[];
  };
  alcance: {
    activos: number;
    asistieron: number;
    sinAsistir: number;
    porcentaje: number;
  };
  nuevos: { total: number; porMes: { month: string; count: number }[] };
}

// Estadísticas de asistencia de una temporada (la activa si no se indica)
export const getSeasonAttendanceStats = async (
  seasonId?: string
): Promise<SeasonAttendanceStats> => {
  const query = seasonId ? `?seasonId=${encodeURIComponent(seasonId)}` : '';
  const response = await apiRequest(`attendance/season-stats${query}`, {
    method: 'GET',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || 'Error al obtener las estadísticas de la temporada'
    );
  }

  const result = await response.json();
  return result.data;
};
