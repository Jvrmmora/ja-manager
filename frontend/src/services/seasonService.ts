import { apiRequest } from './api';
import type { ISeason, ISeasonCreate, ISeasonUpdate } from '../types';

const API_BASE = 'seasons';

/**
 * Servicio para gestión de temporadas
 */
export const seasonService = {
  /**
   * Obtener todas las temporadas
   */
  async getAll(): Promise<ISeason[]> {
    const response = await apiRequest(API_BASE, { method: 'GET' });
    const data = await response.json();
    return data.data || [];
  },

  /**
   * Obtener la temporada activa actual
   */
  async getActive(): Promise<ISeason | null> {
    const response = await apiRequest(`${API_BASE}/active`, { method: 'GET' });
    const data = await response.json();
    return data.data || null;
  },

  /**
   * Obtener una temporada por ID
   */
  async getById(id: string): Promise<ISeason> {
    const response = await apiRequest(`${API_BASE}/${id}`, { method: 'GET' });
    const data = await response.json();
    return data.data;
  },

  /**
   * Crear una nueva temporada
   */
  async create(seasonData: ISeasonCreate): Promise<ISeason> {
    const response = await apiRequest(API_BASE, {
      method: 'POST',
      body: JSON.stringify(seasonData),
    });
    const data = await response.json();
    return data.data;
  },

  /**
   * Actualizar una temporada existente
   */
  async update(id: string, seasonData: ISeasonUpdate): Promise<ISeason> {
    const response = await apiRequest(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(seasonData),
    });
    const data = await response.json();
    return data.data;
  },

  /**
   * Eliminar una temporada
   */
  async delete(id: string): Promise<void> {
    await apiRequest(`${API_BASE}/${id}`, { method: 'DELETE' });
  },

  /**
   * Activar una temporada (desactiva las demás automáticamente)
   */
  async activate(id: string): Promise<ISeason> {
    const response = await apiRequest(`${API_BASE}/${id}/activate`, {
      method: 'POST',
    });
    const data = await response.json();
    return data.data;
  },

  /**
   * Obtener ranking de una temporada específica
   */
  async getRanking(
    id: string,
    options?: { group?: number; limit?: number }
  ): Promise<any[]> {
    const params = new URLSearchParams();
    if (options?.group) params.append('group', options.group.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await apiRequest(
      `${API_BASE}/${id}/ranking${queryString}`,
      {
        method: 'GET',
      }
    );
    const data = await response.json();
    return data.ranking || [];
  },

  /**
   * Obtener estadísticas de una temporada
   */
  async getStats(id: string): Promise<any> {
    const response = await apiRequest(`${API_BASE}/${id}/stats`, {
      method: 'GET',
    });
    const data = await response.json();
    return data.stats;
  },
};
