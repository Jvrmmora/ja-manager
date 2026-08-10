import { apiRequest, buildApiUrl } from './api';
import type { IContactMessage } from '../types';

interface ContactFormPayload {
  fullName: string;
  email: string;
  message: string;
}

interface ContactMessagesResponse {
  data: IContactMessage[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export const contactService = {
  async submitContact(payload: ContactFormPayload): Promise<{ message: string }> {
    const response = await fetch(buildApiUrl('contact'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || result.error?.message || 'No se pudo enviar el mensaje');
    }

    return {
      message: result.message || 'Mensaje enviado con exito',
    };
  },

  async getContactMessages(page = 1, limit = 10): Promise<ContactMessagesResponse> {
    const response = await apiRequest(`contact?page=${page}&limit=${limit}`, {
      method: 'GET',
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || result.error?.message || 'No se pudo cargar los contactos');
    }

    return result.data;
  },

  async deleteContactMessage(id: string): Promise<{ message: string }> {
    const response = await apiRequest(`contact/${id}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || result.error?.message || 'No se pudo eliminar el mensaje');
    }

    return { message: result.message || 'Mensaje eliminado correctamente' };
  },

  async deleteMultipleContactMessages(ids: string[]): Promise<{ message: string; deletedCount: number }> {
    const response = await apiRequest('contact', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || result.error?.message || 'No se pudieron eliminar los mensajes');
    }

    return { 
      message: result.message || 'Mensajes eliminados correctamente',
      deletedCount: result.data?.deletedCount || ids.length,
    };
  },
};
