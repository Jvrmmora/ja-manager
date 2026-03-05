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
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <span className="material-symbols-rounded text-sm">fiber_new</span>
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-rounded text-xl">groups</span>
              Registros Recientes
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Nuevos usuarios registrados en los últimos {daysFilter} días
            </p>
          </div>
          {recentCount > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <span className="material-symbols-rounded text-blue-600 dark:text-blue-400">
                fiber_new
              </span>
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {recentCount} nuevo{recentCount !== 1 ? 's' : ''} (últimos 7
                días)
              </span>
            </div>
          )}
        </div>

        {/* Barra de búsqueda */}
        <div className="mb-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 material-symbols-rounded text-gray-400">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre, email o placa..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              daysFilter === 7
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            7 días
          </button>
          <button
            onClick={() => handleDaysFilterChange(30)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              daysFilter === 30
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            30 días
          </button>
          <button
            onClick={() => handleDaysFilterChange(90)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              daysFilter === 90
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center shadow-md">
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
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
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
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
                            <span className="material-symbols-rounded text-3xl text-gray-400 dark:text-gray-500">
                              person
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Datos del solicitante */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
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
                              <span className="font-mono">{request.placa}</span>
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
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Referido por:</span>{' '}
                              {request.referredBy.fullName} (
                              {request.referredBy.placa})
                            </div>
                          )}
                          {request.skills && request.skills.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {request.skills.slice(0, 5).map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-md"
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
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === request.id ? (
                        <>
                          <LoadingSpinner size="sm" className="text-white" />
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
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Mostrando {requests.length} de {pagination.totalItems} registros
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setFilters(prev => ({ ...prev, page: prev.page! - 1 }))
              }
              disabled={!pagination.hasPreviousPage}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <div className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              {pagination.currentPage} / {pagination.totalPages}
            </div>
            <button
              onClick={() =>
                setFilters(prev => ({ ...prev, page: prev.page! + 1 }))
              }
              disabled={!pagination.hasNextPage}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal para eliminar usuario */}
      {showDeleteModal && deletingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Eliminar Usuario
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
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading === deletingRequest.id}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
