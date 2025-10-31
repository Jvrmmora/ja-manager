import React, { useState, useEffect, useCallback } from 'react';
import {
  getAllRegistrationRequests,
  reviewRegistrationRequest,
} from '../services/api';
import type {
  IRegistrationRequest,
  RegistrationRequestStatus,
  RegistrationRequestsPaginationQuery,
} from '../types';
import LoadingSpinner from './LoadingSpinner';

interface RegistrationRequestsManagerProps {
  onShowSuccess?: (message: string) => void;
  onShowError?: (message: string) => void;
  onPendingCountChange?: (count: number) => void;
}

const RegistrationRequestsManager: React.FC<RegistrationRequestsManagerProps> = ({
  onShowSuccess,
  onShowError,
  onPendingCountChange,
}) => {
  const [requests, setRequests] = useState<IRegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingRequest, setRejectingRequest] =
    useState<IRegistrationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filters, setFilters] = useState<RegistrationRequestsPaginationQuery>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [search, setSearch] = useState('');
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
      };
      if (filters.status) {
        params.status = filters.status;
      }
      if (search.trim()) {
        params.search = search.trim();
      }

      const result = await getAllRegistrationRequests(params);
      setRequests(result.data || []);
      if (result.pagination) {
        setPagination(result.pagination);
      }
      
      // Notificar cambio en el conteo de pendientes si se está mostrando todas o solo pendientes
      if ((!filters.status || filters.status === 'pending') && onPendingCountChange) {
        // Obtener conteo de pendientes
        try {
          const pendingResult = await getAllRegistrationRequests({
            page: 1,
            limit: 1,
            status: 'pending',
          });
          const pendingCount = pendingResult.pagination?.totalItems || 0;
          onPendingCountChange(pendingCount);
        } catch (error) {
          console.error('Error getting pending count:', error);
        }
      }
    } catch (error: any) {
      console.error('Error loading registration requests:', error);
      onShowError?.(error.message || 'Error al cargar solicitudes de registro');
    } finally {
      setLoading(false);
    }
  }, [filters, search]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleStatusFilter = (status: RegistrationRequestStatus | undefined) => {
    setFilters(prev => {
      const newFilters: RegistrationRequestsPaginationQuery = {
        ...prev,
        page: 1,
      };
      if (status) {
        newFilters.status = status;
      } else {
        delete newFilters.status;
      }
      return newFilters;
    });
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setFilters(prev => ({
      ...prev,
      page: 1,
    }));
  };

  const handleApprove = async (request: IRegistrationRequest) => {
    if (!request.id) return;

    try {
      setActionLoading(request.id);
      await reviewRegistrationRequest(request.id, {
        status: 'approved',
      });
      onShowSuccess?.(
        `Solicitud de ${request.fullName} aprobada exitosamente`
      );
      await loadRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      onShowError?.(
        error.message || 'Error al aprobar la solicitud de registro'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectClick = (request: IRegistrationRequest) => {
    setRejectingRequest(request);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectingRequest?.id) return;

    try {
      setActionLoading(rejectingRequest.id);
      const reviewData: {
        status: 'rejected';
        rejectionReason?: string;
      } = {
        status: 'rejected',
      };
      if (rejectionReason.trim()) {
        reviewData.rejectionReason = rejectionReason.trim();
      }
      await reviewRegistrationRequest(rejectingRequest.id, reviewData);
      onShowSuccess?.(
        `Solicitud de ${rejectingRequest.fullName} rechazada exitosamente`
      );
      await loadRequests();
      setShowRejectModal(false);
      setRejectingRequest(null);
      setRejectionReason('');
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      onShowError?.(
        error.message || 'Error al rechazar la solicitud de registro'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: RegistrationRequestStatus) => {
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          <span className="material-symbols-rounded text-sm">pending</span>
          Pendiente
        </span>
      );
    }

    if (status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <span className="material-symbols-rounded text-sm">check_circle</span>
          Aprobada
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        <span className="material-symbols-rounded text-sm">cancel</span>
        Rechazada
      </span>
    );
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

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header con estadísticas y filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-rounded text-xl">
                assignment_ind
              </span>
              Solicitudes de Registro
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Gestiona las solicitudes de registro de nuevos jóvenes
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <span className="material-symbols-rounded text-yellow-600 dark:text-yellow-400">
                notifications_active
              </span>
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
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

        {/* Filtros por estado */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleStatusFilter(undefined)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !filters.status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Todas ({pagination.totalItems})
          </button>
          <button
            onClick={() => handleStatusFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filters.status === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => handleStatusFilter('approved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filters.status === 'approved'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Aprobadas
          </button>
          <button
            onClick={() => handleStatusFilter('rejected')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filters.status === 'rejected'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Rechazadas
          </button>
        </div>
      </div>

      {/* Lista de solicitudes */}
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
            No hay solicitudes de registro
            {filters.status
              ? ` con estado "${filters.status}"`
              : search
                ? ' que coincidan con tu búsqueda'
                : ''}
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
                          {getStatusBadge(request.status)}
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
                                {formatDateShort(request.birthday)} ({request.ageRange})
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
                              <span className="capitalize">{request.gender}</span>
                            </div>
                          )}
                        </div>

                        {/* Información adicional */}
                        <div className="mt-3 space-y-2">
                          {request.referredBy && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Referido por:</span>{' '}
                              {request.referredBy.fullName} ({request.referredBy.placa})
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
                            <span>Fecha de solicitud:</span>{' '}
                            {formatDate(request.createdAt)}
                            {request.reviewedAt && (
                              <>
                                <span className="mx-2">•</span>
                                <span>
                                  Revisada:{' '}
                                  {formatDate(request.reviewedAt)}
                                  {request.reviewedBy && (
                                    <> por {request.reviewedBy.fullName}</>
                                  )}
                                </span>
                              </>
                            )}
                          </div>
                          {request.rejectionReason && (
                            <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                              <div className="text-sm font-medium text-red-800 dark:text-red-200">
                                Razón de rechazo:
                              </div>
                              <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                                {request.rejectionReason}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  {request.status === 'pending' && (
                    <div className="flex flex-col sm:flex-row gap-2 lg:flex-shrink-0">
                      <button
                        onClick={() => handleApprove(request)}
                        disabled={actionLoading === request.id}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading === request.id ? (
                          <>
                            <LoadingSpinner size="sm" className="text-white" />
                            <span>Procesando...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-rounded text-lg">
                              check_circle
                            </span>
                            <span>Aprobar</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleRejectClick(request)}
                        disabled={actionLoading === request.id}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-rounded text-lg">
                          cancel
                        </span>
                        <span>Rechazar</span>
                      </button>
                    </div>
                  )}
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
            Mostrando {requests.length} de {pagination.totalItems} solicitudes
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

      {/* Modal para rechazar solicitud */}
      {showRejectModal && rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Rechazar Solicitud
                </h3>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectingRequest(null);
                    setRejectionReason('');
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <span className="material-symbols-rounded">close</span>
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                ¿Estás seguro de que deseas rechazar la solicitud de{' '}
                <span className="font-semibold">
                  {rejectingRequest.fullName}
                </span>
                ?
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Razón de rechazo (opcional)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Ingresa una razón para el rechazo (opcional)"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectingRequest(null);
                    setRejectionReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading === rejectingRequest.id}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionLoading === rejectingRequest.id ? (
                    <>
                      <LoadingSpinner size="sm" className="text-white" />
                      <span>Rechazando...</span>
                    </>
                  ) : (
                    'Rechazar'
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

