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
      `${API_BASE}/breakdown/${youngId}${params}`,
      {
        method: 'GET',
      }
    );
    const data = await response.json();
    return data.breakdown;
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
      `${API_BASE}/history/${youngId}${queryString}`,
      {
        method: 'GET',
      }
    );
    const data = await response.json();
    return {
      transactions: data.transactions || [],
      total: data.total || 0,
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
