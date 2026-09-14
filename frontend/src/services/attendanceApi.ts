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
