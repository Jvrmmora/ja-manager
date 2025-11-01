import React, { useState, useEffect } from 'react';
import { seasonService } from '../services/seasonService';
import type { ISeason } from '../types';
import SeasonModal from './SeasonModal';
import SeasonDeleteConfirmModal from './SeasonDeleteConfirmModal';

interface SeasonManagerProps {
  onShowSuccess?: (message: string) => void;
  onShowError?: (message: string) => void;
}

const SeasonManager: React.FC<SeasonManagerProps> = ({
  onShowSuccess,
  onShowError,
}) => {
  const [seasons, setSeasons] = useState<ISeason[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSeason, setEditingSeason] = useState<ISeason | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingSeason, setDeletingSeason] = useState<ISeason | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadSeasons();
  }, []);

  const loadSeasons = async () => {
    try {
      setLoading(true);
      const data = await seasonService.getAll();
      setSeasons(data);
    } catch (error: any) {
      console.error('Error loading seasons:', error);
      onShowError?.(error.message || 'Error al cargar temporadas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingSeason(null);
    setShowModal(true);
  };

  const handleEdit = (season: ISeason) => {
    setEditingSeason(season);
    setShowModal(true);
  };

  const handleDelete = (season: ISeason) => {
    setDeletingSeason(season);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingSeason?.id) return;

    try {
      setActionLoading(deletingSeason.id);
      await seasonService.delete(deletingSeason.id);
      onShowSuccess?.('Temporada eliminada exitosamente');
      await loadSeasons();
      setShowDeleteModal(false);
      setDeletingSeason(null);
    } catch (error: any) {
      console.error('Error deleting season:', error);
      onShowError?.(error.message || 'Error al eliminar la temporada');
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (season: ISeason) => {
    if (!season.id) return;

    try {
      setActionLoading(season.id);
      await seasonService.activate(season.id);
      onShowSuccess?.(`Temporada "${season.name}" activada exitosamente`);
      await loadSeasons();
    } catch (error: any) {
      console.error('Error activating season:', error);
      onShowError?.(error.message || 'Error al activar la temporada');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (season: ISeason) => {
    const { status } = season;

    if (status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <span className="material-symbols-rounded text-sm">check_circle</span>
          Activa
        </span>
      );
    }

    if (status === 'UPCOMING') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          <span className="material-symbols-rounded text-sm">schedule</span>
          Próxima
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
        <span className="material-symbols-rounded text-sm">history</span>
        Completada
      </span>
    );
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : seasons.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center shadow-md">
          <span className="material-symbols-rounded text-6xl text-gray-400 mb-4">
            calendar_month
          </span>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No hay temporadas creadas aún
          </p>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <span className="material-symbols-rounded">add_circle</span>
            <span>Crear Primera Temporada</span>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Temporada
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Fechas
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Configuración
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {seasons.map(season => (
                  <tr
                    key={season.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {season.name}
                        </div>
                        {season.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {season.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-rounded text-sm text-gray-400">
                            event
                          </span>
                          <span>{formatDate(season.startDate)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="material-symbols-rounded text-sm text-gray-400">
                            event
                          </span>
                          <span>{formatDate(season.endDate)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(season)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-rounded text-xs">
                            event_available
                          </span>
                          <span>
                            Asistencia:{' '}
                            {season.settings?.attendancePoints || 10} pts
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-rounded text-xs">
                            person_add
                          </span>
                          <span>
                            Referido:{' '}
                            {season.settings?.referralBonusPoints || 30}/
                            {season.settings?.referralWelcomePoints || 10} pts
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-rounded text-xs">
                            local_fire_department
                          </span>
                          <span>
                            Racha: {season.settings?.streakMinDays || 3} días
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Botón activar (solo si no está activa) */}
                        {!season.isActive && season.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleActivate(season)}
                            disabled={actionLoading === season.id}
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                            title="Activar temporada"
                          >
                            {actionLoading === season.id ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                            ) : (
                              <span className="material-symbols-rounded">
                                check_circle
                              </span>
                            )}
                          </button>
                        )}

                        {/* Botón editar */}
                        <button
                          onClick={() => handleEdit(season)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Editar temporada"
                        >
                          <span className="material-symbols-rounded">edit</span>
                        </button>

                        {/* Botón eliminar - disponible para todas las temporadas */}
                        <button
                          onClick={() => handleDelete(season)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Eliminar temporada"
                        >
                          <span className="material-symbols-rounded">
                            delete
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal crear/editar */}
      <SeasonModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingSeason(null);
        }}
        season={editingSeason}
        onSuccess={message => {
          onShowSuccess?.(message);
          loadSeasons();
        }}
        onError={message => {
          onShowError?.(message);
        }}
      />

      {/* Modal confirmar eliminación */}
      <SeasonDeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingSeason(null);
        }}
        onConfirm={confirmDelete}
        seasonName={deletingSeason?.name || 'esta temporada'}
        isActive={
          !!(deletingSeason?.status === 'ACTIVE' || deletingSeason?.isActive)
        }
        loading={!!actionLoading}
      />
    </div>
  );
};

export default SeasonManager;
