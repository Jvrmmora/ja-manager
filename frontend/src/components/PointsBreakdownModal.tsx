import React, { useState, useEffect, useCallback } from 'react';
import { pointsService } from '../services/pointsService';
import type {
  IPointsBreakdown,
  IPointsTransaction,
  IYoung,
  ILeaderboardEntry,
} from '../types';

interface PointsBreakdownModalProps {
  young: IYoung;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  onAssignPoints?: () => void;
}

type StreakWeek = {
  weekStart?: string | Date;
  saturdayDate?: string | Date;
  attended?: boolean;
};
type StreakMeta = {
  currentWeeks?: number;
  bestWeeks?: number;
  violetFlameAwarded?: boolean;
  violetFlameAwardedAt?: string | Date | null;
  weeks?: StreakWeek[];
};
type BreakdownWithStreak = IPointsBreakdown & { streak?: StreakMeta };

const PointsBreakdownModal: React.FC<PointsBreakdownModalProps> = ({
  young,
  isOpen,
  onClose,
  isAdmin = false,
  onAssignPoints,
}) => {
  const [breakdown, setBreakdown] = useState<BreakdownWithStreak | null>(null);
  const [transactions, setTransactions] = useState<IPointsTransaction[]>([]);
  const [position, setPosition] = useState<{
    rank: number;
    totalParticipants: number;
  } | null>(null);
  const [streakWeeks, setStreakWeeks] = useState<number | null>(null);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!young.id) return;

    try {
      setLoading(true);
      setError(null);
      console.log('🔍 PointsBreakdownModal - Cargando datos para:', young.id);

      const [breakdownData, historyData, positionData, leaderboard] =
        await Promise.all([
          pointsService.getBreakdown(young.id),
          pointsService.getHistory(young.id, { limit: 10 }),
          pointsService.getPosition(young.id).catch(() => null),
          pointsService
            .getLeaderboard({})
            .catch(() => [] as ILeaderboardEntry[]),
        ]);

      console.log('✅ PointsBreakdownModal - Datos cargados:', {
        breakdown: breakdownData,
        transactions: historyData.transactions.length,
        position: positionData,
      });

      setBreakdown(breakdownData as BreakdownWithStreak);
      setTransactions(historyData.transactions);
      setPosition(positionData);
      const me = Array.isArray(leaderboard)
        ? leaderboard.find(entry => entry.youngId === young.id)
        : undefined;
      setStreakWeeks(
        (breakdownData as BreakdownWithStreak)?.streak?.currentWeeks ??
          me?.streak ??
          null
      );
    } catch (err: unknown) {
      console.error(
        '❌ PointsBreakdownModal - Error loading points data:',
        err
      );
      const message =
        err instanceof Error
          ? err.message
          : 'Error al cargar los datos de puntos';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [young.id]);

  useEffect(() => {
    if (isOpen && young.id) {
      // Resetear estados cuando se abre el modal
      setError(null);
      setBreakdown(null);
      setTransactions([]);
      setPosition(null);
      loadData();
    }
  }, [isOpen, young.id, loadData]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ATTENDANCE':
        return 'event_available';
      case 'ACTIVITY':
        return 'sports_score';
      case 'REFERRAL_BONUS':
        return 'person_add';
      case 'REFERRAL_WELCOME':
        return 'how_to_reg';
      case 'REFERRER_BONUS':
        return 'person_add';
      case 'REFERRED_BONUS':
        return 'how_to_reg';
      default:
        return 'star';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'ATTENDANCE':
        return 'Asistencia';
      case 'ACTIVITY':
        return 'Actividad';
      case 'REFERRAL_BONUS':
      case 'REFERRAL_WELCOME':
        return 'Bono Referido';
      case 'REFERRER_BONUS':
        return 'Bono Referido';
      case 'REFERRED_BONUS':
        return 'Bono Referido';
      default:
        return type;
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  const formatDateLong = (date?: string | Date | null) => {
    if (!date) return null;
    try {
      return new Date(date).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  };
  const formatShort = (date?: string | Date | null) => {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
      });
    } catch {
      return '';
    }
  };

  if (!isOpen) return null;

  console.log('🎨 PointsBreakdownModal - Renderizando:', {
    isOpen,
    loading,
    hasBreakdown: !!breakdown,
    hasError: !!error,
    youngId: young.id,
  });

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            {/* Foto del joven */}
            {young.profileImage ? (
              <img
                src={young.profileImage}
                alt={young.fullName}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                {young.fullName.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {young.fullName}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Desglose de Puntos
              </p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-2">
            {/* Botón para asignar puntos (solo admins) */}
            {isAdmin && onAssignPoints && (
              <button
                onClick={() => {
                  onClose();
                  onAssignPoints();
                }}
                className="p-2 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 rounded-lg transition-colors border border-amber-200 dark:border-amber-700"
                title="Asignar puntos"
              >
                <span className="material-symbols-rounded text-xl">
                  add_circle
                </span>
              </button>
            )}

            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <span className="material-symbols-rounded text-gray-500 dark:text-gray-400">
                close
              </span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : breakdown ? (
            <>
              {/* Puntos totales y ranking */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total de puntos */}
                <div className="bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="material-symbols-rounded text-3xl">
                      star
                    </span>
                    <span className="text-sm font-medium opacity-90">
                      Puntos Totales
                    </span>
                  </div>
                  <div className="text-4xl font-bold">{breakdown.total}</div>
                  <div className="text-sm opacity-90 mt-1">
                    {breakdown.transactionCount} transacciones
                  </div>
                </div>

                {/* Ranking */}
                {position && (
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="material-symbols-rounded text-3xl">
                        military_tech
                      </span>
                      <span className="text-sm font-medium opacity-90">
                        Posición
                      </span>
                    </div>
                    {position.rank > 0 && position.totalParticipants > 0 ? (
                      <>
                        <div className="text-4xl font-bold">
                          #{position.rank}
                        </div>
                        <div className="text-sm opacity-90 mt-1">
                          de {position.totalParticipants}{' '}
                          {position.totalParticipants === 1
                            ? 'participante'
                            : 'participantes'}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-4xl font-bold">#0</div>
                        <div className="text-sm opacity-90 mt-1">
                          Sin puntos aún
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Racha actual (clickable) */}
                <div
                  className={`rounded-xl p-6 text-white shadow-lg ${
                    (streakWeeks ?? 0) >= 4
                      ? 'bg-gradient-to-br from-violet-500 to-fuchsia-600'
                      : 'bg-gradient-to-br from-orange-400 to-amber-500'
                  } cursor-pointer hover:opacity-95 transition-opacity`}
                  onClick={() => setShowStreakModal(true)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="material-symbols-rounded text-3xl">
                      local_fire_department
                    </span>
                    <span className="text-sm font-medium opacity-90">
                      Racha actual
                    </span>
                  </div>
                  <div className="text-4xl font-bold">{streakWeeks ?? 0}</div>
                  <div className="text-sm opacity-90 mt-1">
                    {streakWeeks && streakWeeks >= 4
                      ? 'Llama Violeta activa'
                      : 'Semanas consecutivas (solo sábados)'}
                  </div>
                </div>
              </div>

              {/* Desglose por tipo */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Desglose por Tipo
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mb-1">
                      <span className="material-symbols-rounded text-sm">
                        event_available
                      </span>
                      <span className="text-sm">Asistencias</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {breakdown.byType.ATTENDANCE}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mb-1">
                      <span className="material-symbols-rounded text-sm">
                        sports_score
                      </span>
                      <span className="text-sm">Actividades</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {breakdown.byType.ACTIVITY}
                    </div>
                  </div>

                  {/* Bonos unificados: Referidos + Racha (BONUS) */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 col-span-2">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mb-1">
                      <span className="material-symbols-rounded text-sm">
                        stars
                      </span>
                      <span className="text-sm">Bonos (referidos y racha)</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {(() => {
                        const byType = (breakdown.byType ??
                          {}) as unknown as Record<string, number>;
                        const referrer = byType.REFERRER_BONUS ?? 0;
                        const referred = byType.REFERRED_BONUS ?? 0;
                        const legacy1 = byType.REFERRAL_BONUS ?? 0;
                        const legacy2 = byType.REFERRAL_WELCOME ?? 0;
                        const attendance = byType.ATTENDANCE ?? 0;
                        const activity = byType.ACTIVITY ?? 0;
                        const known =
                          referrer +
                          referred +
                          legacy1 +
                          legacy2 +
                          attendance +
                          activity;
                        const inferredBonus = Math.max(
                          0,
                          breakdown.total - known
                        );
                        return (
                          referrer +
                          referred +
                          legacy1 +
                          legacy2 +
                          inferredBonus
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Transacciones recientes */}
              {transactions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Transacciones Recientes
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-100 dark:bg-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
                            Fecha
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
                            Tipo
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
                            Descripción
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
                            Puntos
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {transactions.map(transaction => (
                          <tr key={transaction.id}>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                              {formatDate(transaction.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-rounded text-sm text-gray-500 dark:text-gray-400">
                                  {getTypeIcon(transaction.type)}
                                </span>
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {getTypeName(transaction.type)}
                                  {(() => {
                                    const ref = transaction.referredYoungId;
                                    const refName =
                                      ref && typeof ref === 'object'
                                        ? ref.fullName
                                        : undefined;
                                    if (!refName) return null;
                                    const isReferral =
                                      transaction.type === 'REFERRAL_BONUS' ||
                                      transaction.type === 'REFERRAL_WELCOME' ||
                                      transaction.type === 'REFERRAL';
                                    return (
                                      <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                                        {isReferral
                                          ? `a ${refName}`
                                          : `de ${refName}`}
                                      </span>
                                    );
                                  })()}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                              {transaction.description?.trim() ||
                                'No especificado'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                +{transaction.points}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Temporada actual */}
              {breakdown.season && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <span className="material-symbols-rounded text-lg">
                      calendar_month
                    </span>
                    <div>
                      <div className="font-semibold">
                        {breakdown.season.name}
                      </div>
                      <div className="text-xs opacity-75">
                        {formatDate(breakdown.season.startDate)} -{' '}
                        {formatDate(breakdown.season.endDate)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : error ? (
            <div className="text-center py-12">
              <span className="material-symbols-rounded text-5xl text-red-500 dark:text-red-400 mb-4">
                error
              </span>
              <p className="text-red-600 dark:text-red-400 font-medium mb-2">
                Error al cargar los datos
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {error}
              </p>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <span className="material-symbols-rounded text-5xl mb-4 opacity-50">
                info
              </span>
              <p>No hay datos de puntos disponibles</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
      {/* Modal Historial de Racha */}
      {showStreakModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-amber-500">
                  local_fire_department
                </span>
                Historial de Racha
              </h3>
              <button
                onClick={() => setShowStreakModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <span className="material-symbols-rounded text-gray-500">
                  close
                </span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gradient-to-br from-orange-400 to-amber-500 rounded-lg p-4 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-rounded">
                    local_fire_department
                  </span>
                  <span className="text-sm">Racha actual</span>
                </div>
                <div className="text-3xl font-bold">{streakWeeks ?? 0}</div>
                <div className="text-xs opacity-90">
                  Semanas consecutivas (solo sábados)
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mb-1">
                  <span className="material-symbols-rounded text-sm">
                    workspace_premium
                  </span>
                  <span className="text-sm">Mejor racha de la temporada</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {breakdown?.streak?.bestWeeks ?? '0'}
                </div>
              </div>
              {(breakdown?.streak?.violetFlameAwarded ?? false) && (
                <div className="bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-lg p-4 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-rounded">
                      auto_awesome
                    </span>
                    <span className="text-sm">Llama Violeta</span>
                  </div>
                  <div className="text-sm opacity-90">
                    Obtenida el{' '}
                    {formatDateLong(breakdown?.streak?.violetFlameAwardedAt) ||
                      '—'}
                  </div>
                </div>
              )}
              {/* Mini timeline últimas 6 semanas */}
              {Array.isArray(breakdown?.streak?.weeks) && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <span className="material-symbols-rounded text-sm">
                        timeline
                      </span>
                      <span className="text-sm">Últimas 6 semanas</span>
                    </div>
                    {(breakdown?.streak?.currentWeeks ?? 0) >= 4 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200">
                        <span className="material-symbols-rounded text-sm">
                          auto_awesome
                        </span>
                        Llama Violeta activa
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {(() => {
                      const weeks =
                        (breakdown?.streak?.weeks as StreakWeek[]) || [];
                      const violetActive =
                        (breakdown?.streak?.currentWeeks ?? 0) >= 4;
                      const violetIdxs = new Set<number>();
                      if (violetActive) {
                        let count = 0;
                        for (
                          let i = weeks.length - 1;
                          i >= 0 && count < 4;
                          i--
                        ) {
                          if (weeks[i]?.attended) {
                            violetIdxs.add(i);
                            count++;
                          } else {
                            break;
                          }
                        }
                      }
                      return weeks.map((w: StreakWeek, idx: number) => (
                        <div key={idx} className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow ${
                              w.attended
                                ? 'bg-green-500'
                                : 'bg-gray-400 dark:bg-gray-600'
                            } ${violetIdxs.has(idx) ? 'ring-2 ring-violet-400' : ''}`}
                            title={`Sábado ${formatDateLong(w.saturdayDate)} — ${w.attended ? 'Asistió' : 'No asistió'}`}
                          >
                            {w.attended ? '✓' : '–'}
                          </div>
                          <div className="text-[10px] mt-1 text-gray-600 dark:text-gray-300">
                            {formatShort(w.saturdayDate)}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                La racha solo cuenta por asistencias de sábado. Se pierde tras 2
                sábados consecutivos sin asistir.
              </p>
            </div>
            <div className="p-5 border-t border-gray-200 dark:border-gray-700 text-right">
              <button
                onClick={() => setShowStreakModal(false)}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PointsBreakdownModal;
