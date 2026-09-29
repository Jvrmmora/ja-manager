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

  const getStatusBadge = (season: ISeason, dark: boolean) => {
    const { status } = season;
    const [label, cls] =
      status === 'ACTIVE'
        ? ['Activa', dark ? 'bg-emerald-400/15 text-emerald-300' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300']
        : status === 'UPCOMING'
          ? ['Próxima', 'bg-sand-100 text-[#9A3412] dark:bg-brand-orange/15 dark:text-brand-amber']
          : ['Completada', 'bg-[#F5EFEA] text-cocoa-500 dark:bg-white/5 dark:text-white/55'];
    return (
      <span className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-bold ${cls}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {label}
      </span>
    );
  };

  const formatDate = (date: string | Date) => {
    // Parsear la fecha sin conversión de zona horaria
    let d: Date;
    if (typeof date === 'string') {
      // Si es string en formato ISO (YYYY-MM-DD), crear la fecha en UTC y ajustar a local
      const [year, month, day] = date.split('T')[0].split('-').map(Number);
      d = new Date(year, month - 1, day);
    } else {
      d = new Date(date);
    }

    return d.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const iconBtn = (dark: boolean) =>
    `flex h-9 w-9 items-center justify-center rounded-[11px] border transition-colors disabled:opacity-50 ${
      dark
        ? 'border-white/15 text-white/75 hover:border-white/40 hover:text-white'
        : 'border-sand-200 bg-white text-cocoa-500 hover:border-[#F4B58C] hover:text-brand-deep dark:border-white/10 dark:bg-ink-800 dark:text-white/70'
    }`;

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="h-12 w-12 animate-spin rounded-full border-4 border-sand-200 border-t-brand-ember" />
        </div>
      ) : seasons.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[22px] border border-sand-200 bg-white p-12 text-center dark:border-white/10 dark:bg-ink-800">
          <p className="m-0 text-cocoa-500 dark:text-white/60">No hay temporadas creadas aún</p>
          <button type="button" onClick={handleCreate} className="btn-fire h-12 px-6 text-sm">
            Crear primera temporada
          </button>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <button type="button" onClick={handleCreate} className="btn-fire h-11 px-5 text-sm">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Nueva temporada
            </button>
          </div>
          {seasons.map(season => {
            const dark = season.status === 'ACTIVE' || !!season.isActive;
            return (
              <div
                key={season.id}
                className={`grid gap-3 rounded-[20px] border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_250px_120px_auto] ${
                  dark
                    ? 'border-ink-950 bg-ink-950 text-white'
                    : 'border-sand-200 bg-white dark:border-white/10 dark:bg-ink-800'
                }`}
              >
                <div className="min-w-0">
                  <p className={`m-0 font-display text-xl font-semibold uppercase ${dark ? 'text-white' : 'text-cocoa-900 dark:text-white'}`}>
                    {season.name}
                  </p>
                  {season.description && (
                    <p className={`m-0 mt-0.5 text-[13px] ${dark ? 'text-white/65' : 'text-cocoa-500 dark:text-white/60'}`}>
                      {season.description}
                    </p>
                  )}
                  <p className={`m-0 mt-1 text-xs ${dark ? 'text-white/55' : 'text-cocoa-400 dark:text-white/50'}`}>
                    Asistencia {season.settings?.attendancePoints || 10} pts · Referido{' '}
                    {season.settings?.referralBonusPoints || 30}/{season.settings?.referralWelcomePoints || 10} pts · Racha{' '}
                    {season.settings?.streakMinDays || 3} días
                  </p>
                </div>
                <span className={`text-[13px] ${dark ? 'text-white/70' : 'text-cocoa-500 dark:text-white/60'}`}>
                  {formatDate(season.startDate)} – {formatDate(season.endDate)}
                </span>
                <span>{getStatusBadge(season, dark)}</span>
                <span className="flex gap-1.5 sm:justify-end">
                  {!season.isActive && season.status !== 'COMPLETED' && (
                    <button
                      type="button"
                      onClick={() => handleActivate(season)}
                      disabled={actionLoading === season.id}
                      className={iconBtn(dark)}
                      title="Activar temporada"
                      aria-label="Activar temporada"
                    >
                      {actionLoading === season.id ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleEdit(season)}
                    className={iconBtn(dark)}
                    title="Editar temporada"
                    aria-label="Editar temporada"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(season)}
                    className={`${iconBtn(dark)} hover:!border-red-300 hover:!text-red-500`}
                    title="Eliminar temporada"
                    aria-label="Eliminar temporada"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </span>
              </div>
            );
          })}
        </>
      )}

      {/* Modal crear/editar */}
      <SeasonModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingSeason(null);
        }}
        season={editingSeason}
        onSuccess={async message => {
          onShowSuccess?.(message);
          await loadSeasons();
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
