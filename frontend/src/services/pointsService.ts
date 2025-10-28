import { apiRequest } from './api';
import type {
  IPointsBreakdown,
  IPointsTransaction,
  IAssignPointsRequest,
  ILeaderboardEntry,
} from '../types';

const API_BASE = 'points';

/**
 * Servicio para gestión de puntos
 */
export const pointsService = {
  /**
   * Obtener el desglose de puntos de un joven en la temporada actual
   */
  async getBreakdown(
    youngId: string,
    seasonId?: string
  ): Promise<IPointsBreakdown> {
    const params = seasonId ? `?seasonId=${seasonId}` : '';
    const response = await apiRequest(
      `${API_BASE}/young/${youngId}/breakdown${params}`,
      {
        method: 'GET',
      }
    );
    const result = await response.json();
    console.log('📊 pointsService.getBreakdown - Response:', result);

    // El backend devuelve { success: true, data: breakdown }
    if (!result.data) {
      throw new Error('No se recibieron datos de puntos del servidor');
    }

    return result.data;
  },

  /**
   * Obtener el historial de transacciones de puntos de un joven
   */
  async getHistory(
    youngId: string,
    options?: { seasonId?: string; limit?: number; page?: number }
  ): Promise<{ transactions: IPointsTransaction[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.seasonId) params.append('seasonId', options.seasonId);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.page) params.append('page', options.page.toString());

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await apiRequest(
      `${API_BASE}/young/${youngId}/history${queryString}`,
      {
        method: 'GET',
      }
    );
    const result = await response.json();
    // El backend devuelve { success: true, count: X, data: [...transactions] }
    return {
      transactions: result.data || [],
      total: result.count || 0,
    };
  },

  /**
   * Asignar puntos manualmente a un joven (solo admin)
   */
  async assign(request: IAssignPointsRequest): Promise<IPointsTransaction> {
    const response = await apiRequest(`${API_BASE}/assign`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    const data = await response.json();

    // Validar si la respuesta fue exitosa
    if (!response.ok || !data.success) {
      const errorMsg =
        data?.message ||
        (typeof data?.error === 'string'
          ? data.error
          : data?.error?.message ||
          (Array.isArray(data?.error?.details?.fields)
            ? data.error.details.fields
              .map((f: any) => `${f.field}: ${f.message}`)
              .join(', ')
            : undefined)) ||
        'Error al asignar puntos';
      throw new Error(errorMsg);
    }

    if (!data.transaction) {
      throw new Error('No se recibió información de la transacción');
    }

    return data.transaction;
  },

  /**
   * Obtener el ranking global de la temporada actual
   */
  async getLeaderboard(options?: {
    seasonId?: string;
    group?: number;
    limit?: number;
  }): Promise<ILeaderboardEntry[]> {
    const params = new URLSearchParams();
    if (options?.seasonId) params.append('seasonId', options.seasonId);
    if (options?.group) params.append('group', options.group.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await apiRequest(`${API_BASE}/leaderboard${queryString}`, {
      method: 'GET',
    });

    const data = await response.json();

    // Validar si la respuesta fue exitosa
    if (!response.ok || !data.success) {
      throw new Error(
        data.message || data.error || 'Error al obtener el ranking'
      );
    }

    return data.ranking || [];
  },

  /**
   * Obtener la posición de un joven específico en el ranking
   */
  async getPosition(
    youngId: string,
    seasonId?: string
  ): Promise<{
    rank: number;
    totalParticipants: number;
    percentile: number;
  }> {
    const params = seasonId ? `?seasonId=${seasonId}` : '';
    const response = await apiRequest(
      `${API_BASE}/position/${youngId}${params}`,
      {
        method: 'GET',
      }
    );
    const data = await response.json();
    return data.position;
  },
};
