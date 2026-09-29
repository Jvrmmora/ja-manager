import React, { useState, useEffect, useCallback } from 'react';
import {
  getRecentYoungUsers,
  deleteYoungUser,
  markUserAsSpam,
} from '../services/api';
import type {
  IRegistrationRequest,
  RegistrationRequestsPaginationQuery,
} from '../types';
import LoadingSpinner from './LoadingSpinner';

interface RegistrationRequestsManagerProps {
  onShowSuccess?: (message: string) => void;
  onShowError?: (message: string) => void;
  onPendingCountChange?: (count: number) => void;
}

const RegistrationRequestsManager: React.FC<
  RegistrationRequestsManagerProps
> = ({ onShowSuccess, onShowError, onPendingCountChange }) => {
  const [requests, setRequests] = useState<IRegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingRequest, setDeletingRequest] =
    useState<IRegistrationRequest | null>(null);
  const [deleteReason, setDeleteReason] = useState<'spam' | 'other'>('other');
  const [filters, setFilters] = useState<RegistrationRequestsPaginationQuery>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [search, setSearch] = useState('');
  const [daysFilter, setDaysFilter] = useState(30); // Últimos 30 días por defecto
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: filters.page,
        limit: filters.limit,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        days: daysFilter,
      };
      if (search.trim()) {
        params.search = search.trim();
      }

      const result = await getRecentYoungUsers(params);
      setRequests(result.data || []);
      if (result.pagination) {
        setPagination(result.pagination);
      }

      // Notificar cambio en el conteo de registros recientes
      if (onPendingCountChange) {
        const recentCount = result.pagination?.totalItems || 0;
        onPendingCountChange(recentCount);
      }
    } catch (error: any) {
      console.error('Error loading recent users:', error);
      onShowError?.(error.message || 'Error al cargar registros recientes');
    } finally {
      setLoading(false);
    }
  }, [filters, search, daysFilter, onPendingCountChange, onShowError]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleDeleteClick = (request: IRegistrationRequest) => {
    setDeletingRequest(request);
    setDeleteReason('other');
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingRequest?.id) return;

    try {
      setActionLoading(deletingRequest.id);

      // Si se marca como spam, llamar a markUserAsSpam primero
      if (deleteReason === 'spam') {
        await markUserAsSpam(deletingRequest.id, true);
      }

      // Luego eliminar (soft delete)
      await deleteYoungUser(deletingRequest.id);

      onShowSuccess?.(
        `Usuario ${deletingRequest.fullName} eliminado exitosamente${deleteReason === 'spam' ? ' y marcado como spam' : ''}`
      );
      await loadRequests();
      setShowDeleteModal(false);
      setDeletingRequest(null);
      setDeleteReason('other');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      onShowError?.(error.message || 'Error al eliminar usuario');
    } finally {
      setActionLoading(null);
    }
  };
  const handleSearch = (value: string) => {
    setSearch(value);
    setFilters(prev => ({
      ...prev,
      page: 1,
    }));
  };

  const handleDaysFilterChange = (days: number) => {
    setDaysFilter(days);
    setFilters(prev => ({
      ...prev,
      page: 1,
    }));
  };

  const isRecentUser = (createdAt: string | Date) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffDays =
      (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7; // Menos de 7 días = "Nuevo"
  };

  const getNewUserBadge = (createdAt: string | Date) => {
    if (isRecentUser(createdAt)) {
      return (
        <span className="bg-fire inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-white">
          Nuevo
        </span>
      );
    }
    return null;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (date: string | Date) => {
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const recentCount = requests.filter(r => isRecentUser(r.createdAt!)).length;

  return (
    <div className="space-y-6">
      {/* Header con estadísticas y filtros */}
      <div className="rounded-[22px] border border-sand-200 bg-white p-5 dark:border-white/10 dark:bg-ink-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <div>
            <h3 className="m-0 font-display text-xl font-semibold uppercase text-cocoa-900 dark:text-white">
              Registros recientes
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Nuevos usuarios registrados en los últimos {daysFilter} días
            </p>
          </div>
          {recentCount > 0 && (
            <div className="inline-flex h-9 items-center gap-2 rounded-full border border-[#F6D6B8] bg-sand-50 px-4 dark:border-brand-orange/30 dark:bg-brand-orange/10">
              <span className="text-sm font-semibold text-[#9A3412] dark:text-brand-amber">
                {recentCount} nuevo{recentCount !== 1 ? 's' : ''} (últimos 7
                días)
              </span>
            </div>
          )}
        </div>

        {/* Barra de búsqueda */}
        <div className="mb-4">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-rounded text-cocoa-400">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre, email o placa..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="field-brand h-12 !pl-11 text-[15px]"
            />
          </div>
        </div>

        {/* Filtros por período de tiempo */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 self-center mr-2">
            Mostrar últimos:
          </span>
          <button
            onClick={() => handleDaysFilterChange(7)}
            className={`h-9 rounded-full border px-4 text-[13px] font-semibold transition-colors ${
              daysFilter === 7
                ? 'border-ink-950 bg-ink-950 text-white dark:border-white dark:bg-white dark:text-ink-950'
                : 'border-sand-300 bg-white text-cocoa-600 hover:border-cocoa-400 dark:border-white/15 dark:bg-transparent dark:text-white/75'
            }`}
          >
            7 días
          </button>
          <button
            onClick={() => handleDaysFilterChange(30)}
            className={`h-9 rounded-full border px-4 text-[13px] font-semibold transition-colors ${
              daysFilter === 30
                ? 'border-ink-950 bg-ink-950 text-white dark:border-white dark:bg-white dark:text-ink-950'
                : 'border-sand-300 bg-white text-cocoa-600 hover:border-cocoa-400 dark:border-white/15 dark:bg-transparent dark:text-white/75'
            }`}
          >
            30 días
          </button>
          <button
            onClick={() => handleDaysFilterChange(90)}
            className={`h-9 rounded-full border px-4 text-[13px] font-semibold transition-colors ${
              daysFilter === 90
                ? 'border-ink-950 bg-ink-950 text-white dark:border-white dark:bg-white dark:text-ink-950'
                : 'border-sand-300 bg-white text-cocoa-600 hover:border-cocoa-400 dark:border-white/15 dark:bg-transparent dark:text-white/75'
            }`}
          >
            90 días
          </button>
        </div>
      </div>

      {/* Lista de registros recientes */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-[22px] border border-sand-200 bg-white p-12 text-center dark:border-white/10 dark:bg-ink-800">
          <span className="material-symbols-rounded text-6xl text-gray-400 dark:text-gray-500 mb-4">
            assignment_ind
          </span>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No hay registros recientes
            {search
              ? ' que coincidan con tu búsqueda'
              : ` en los últimos ${daysFilter} días`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(request => (
            <div
              key={request.id}
              className="overflow-hidden rounded-[22px] border border-sand-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-28px_rgba(78,15,58,0.45)] dark:border-white/10 dark:bg-ink-800"
            >
              <div className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Información principal */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-4">
                      {/* Imagen de perfil */}
                      <div className="flex-shrink-0">
                        {request.profileImage ? (
                          <img
                            src={request.profileImage}
                            alt={request.fullName}
                            className="h-14 w-14 rounded-full border-2 border-[#F4B58C] object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#F4B58C] bg-ink-800">
                            <span className="material-symbols-rounded text-3xl text-white/70">
                              person
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Datos del solicitante */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h4 className="m-0 text-base font-bold text-cocoa-900 dark:text-white">
                            {request.fullName}
                          </h4>
                          {getNewUserBadge(request.createdAt!)}
                        </div>

                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-600 dark:text-gray-400">
                          {request.email && (
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-rounded text-base">
                                email
                              </span>
                              <span className="truncate">{request.email}</span>
                            </div>
                          )}
                          {request.phone && (
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-rounded text-base">
                                phone
                              </span>
                              <span>{request.phone}</span>
                            </div>
                          )}
                          {request.placa && (
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-rounded text-base">
                                badge
                              </span>
                              <span className="font-mono font-semibold text-brand-wine dark:text-[#F4A3C0]">{request.placa}</span>
                            </div>
                          )}
                          {request.birthday && (
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-rounded text-base">
                                cake
                              </span>
                              <span>
                                {formatDateShort(request.birthday)} (
                                {request.ageRange})
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-rounded text-base">
                              person
                            </span>
                            <span className="capitalize">{request.role}</span>
                          </div>
                          {request.gender && (
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-rounded text-base">
                                {request.gender === 'masculino'
                                  ? 'male'
                                  : 'female'}
                              </span>
                              <span className="capitalize">
                                {request.gender}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Información adicional */}
                        <div className="mt-3 space-y-2">
                          {request.referredBy && (
                            <div className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#F6E1E8] px-3 text-xs font-semibold text-brand-wine dark:bg-brand-wine/25 dark:text-[#F4A3C0]">
                              <span>Referido por:</span>{' '}
                              {request.referredBy.fullName} (
                              {request.referredBy.placa})
                            </div>
                          )}
                          {request.skills && request.skills.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {request.skills.slice(0, 5).map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-full bg-sand-50 px-2.5 py-0.5 text-xs font-semibold text-cocoa-600 dark:bg-white/5 dark:text-white/70"
                                >
                                  {skill}
                                </span>
                              ))}
                              {request.skills.length > 5 && (
                                <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                                  +{request.skills.length - 5} más
                                </span>
                              )}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            <span>Fecha de registro:</span>{' '}
                            {formatDate(request.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col sm:flex-row gap-2 lg:flex-shrink-0">
                    <button
                      onClick={() => handleDeleteClick(request)}
                      disabled={actionLoading === request.id}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-full border-[1.5px] border-red-200 bg-white px-4 text-[13px] font-semibold text-red-700 transition-colors hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-transparent dark:text-red-300"
                    >
                      {actionLoading === request.id ? (
                        <>
                          <LoadingSpinner size="sm" />
                          <span>Procesando...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-rounded text-lg">
                            delete
                          </span>
                          <span>Eliminar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación */}
      {!loading && requests.length > 0 && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Mostrando {requests.length} de {pagination.totalItems} registros
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setFilters(prev => ({ ...prev, page: prev.page! - 1 }))
              }
              disabled={!pagination.hasPreviousPage}
              className="h-10 rounded-full border border-sand-300 bg-white px-4 text-[13px] font-semibold text-cocoa-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-ink-800 dark:text-white/80"
            >
              Anterior
            </button>
            <div className="flex h-10 items-center rounded-full bg-ink-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-ink-950">
              {pagination.currentPage} / {pagination.totalPages}
            </div>
            <button
              onClick={() =>
                setFilters(prev => ({ ...prev, page: prev.page! + 1 }))
              }
              disabled={!pagination.hasNextPage}
              className="h-10 rounded-full border border-sand-300 bg-white px-4 text-[13px] font-semibold text-cocoa-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-ink-800 dark:text-white/80"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal para eliminar usuario */}
      {showDeleteModal && deletingRequest && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-[#0C0609]/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white shadow-2xl dark:bg-ink-900" role="alertdialog" aria-modal="true" aria-label="Eliminar usuario">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="m-0 font-display text-2xl font-semibold uppercase text-cocoa-900 dark:text-white">
                  Eliminar usuario
                </h3>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingRequest(null);
                    setDeleteReason('other');
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <span className="material-symbols-rounded">close</span>
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                ¿Estás seguro de que deseas eliminar a{' '}
                <span className="font-semibold">
                  {deletingRequest.fullName}
                </span>
                ?
              </p>
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={deleteReason === 'spam'}
                    onChange={e =>
                      setDeleteReason(e.target.checked ? 'spam' : 'other')
                    }
                    className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 dark:focus:ring-red-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Marcar como spam
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      El usuario será marcado y eliminado
                    </div>
                  </div>
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingRequest(null);
                    setDeleteReason('other');
                  }}
                  className="h-12 flex-1 rounded-full border-[1.5px] border-sand-300 bg-white text-sm font-semibold text-cocoa-600 hover:border-cocoa-400 dark:border-white/15 dark:bg-transparent dark:text-white/80"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading === deletingRequest.id}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-red-700 text-sm font-semibold text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === deletingRequest.id ? (
                    <>
                      <LoadingSpinner size="sm" className="text-white" />
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    'Eliminar'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationRequestsManager;
