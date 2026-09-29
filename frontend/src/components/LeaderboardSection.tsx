import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pointsService } from '../services/pointsService';
import { seasonService } from '../services/seasonService';
import type { ILeaderboardEntry, ISeason } from '../types';
import { authService } from '../services/auth';
import { getInitials } from '../utils/nameUtils';
import { hasDeepChanged } from '../hooks/useDeepCompareEffect';

const LeaderboardSection: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<ILeaderboardEntry[]>([]);
  const [seasons, setSeasons] = useState<ISeason[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankChanges, setRankChanges] = useState<
    Map<string, { old: number; new: number }>
  >(new Map());

  const currentUser = authService.getUserInfo();
  const currentUserId = currentUser?.id;
  const isAdmin = currentUser?.role_name === 'Super Admin';
  const isYoung = currentUser?.role_name === 'joven adventista';

  useEffect(() => {
    loadSeasons();
  }, []);

  useEffect(() => {
    if (selectedSeason !== '' || seasons.length >= 0) {
      loadLeaderboard();
    }
  }, [selectedSeason, selectedGroup, seasons.length]);

  // Listen for global points updates to refresh immediately
  useEffect(() => {
    const onPointsUpdated = () => {
      loadLeaderboard(false);
    };
    window.addEventListener('points:updated', onPointsUpdated);
    return () => window.removeEventListener('points:updated', onPointsUpdated);
  }, [selectedSeason, selectedGroup]);

  // Polling cada 15 segundos
  useEffect(() => {
    if (!selectedSeason && seasons.length === 0) return;

    const interval = setInterval(() => {
      loadLeaderboard(false);
    }, 15000);

    return () => clearInterval(interval);
  }, [selectedSeason, selectedGroup, seasons.length]);

  const loadSeasons = async () => {
    try {
      const seasonsData = await seasonService.getAll();
      setSeasons(seasonsData);

      const activeSeason = seasonsData.find(s => s.isActive);
      if (activeSeason && activeSeason.id) {
        setSelectedSeason(activeSeason.id);
      }
    } catch (error) {
      console.error('Error loading seasons:', error);
    }
  };

  const loadLeaderboard = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const options: any = {};
      if (selectedSeason) options.seasonId = selectedSeason;
      if (selectedGroup) options.group = selectedGroup;

      const data = await pointsService.getLeaderboard(options);

      // Detectar cambios de posición (entre polls) para las animaciones temporales.
      // "previousRank"/"rankChange" ya vienen calculados por el backend contra el
      // último snapshot semanal — esto solo anima el "acaba de subir/bajar" en vivo.
      if (hasDeepChanged(leaderboard, data) && leaderboard.length > 0) {
        const changes = new Map<string, { old: number; new: number }>();

        data.forEach((newEntry: ILeaderboardEntry) => {
          const oldEntry = leaderboard.find(
            e => e.youngId === newEntry.youngId
          );
          if (oldEntry && oldEntry.currentRank !== newEntry.currentRank) {
            changes.set(newEntry.youngId, {
              old: oldEntry.currentRank,
              new: newEntry.currentRank,
            });
          }
        });

        if (changes.size > 0) {
          setRankChanges(changes);
          setTimeout(() => setRankChanges(new Map()), 3000);
        }
      }

      // Solo actualizar si hay cambios
      if (hasDeepChanged(leaderboard, data)) {
        setLeaderboard(data);
      }
    } catch (err: any) {
      console.error('Error loading leaderboard:', err);
      setError(err.message || 'Error al cargar el ranking');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const getTop3 = () => leaderboard.slice(0, 3);
  const getRest = () => leaderboard.slice(3);

  const PODIUM = {
    1: {
      ring: 'from-[#FDE68A] via-[#F9A23B] to-[#DC3340]',
      pedestal: 'from-[#B8741F]/75 to-[#5A3410]/30 border-brand-amber/40',
      number: 'text-[#FCD34D]',
      height: 'h-[128px] sm:h-[156px]',
      avatar: 'h-[76px] w-[76px] sm:h-[96px] sm:w-[96px]',
    },
    2: {
      ring: 'from-[#F3F4F6] to-[#9CA3AF]',
      pedestal: 'from-white/[0.16] to-white/[0.02] border-white/25',
      number: 'text-[#E5E7EB]',
      height: 'h-[96px] sm:h-[116px]',
      avatar: 'h-[60px] w-[60px] sm:h-[72px] sm:w-[72px]',
    },
    3: {
      ring: 'from-[#F26A2E] to-[#8A1C45]',
      pedestal: 'from-[#B4532A]/55 to-[#3A1A10]/20 border-brand-orange/40',
      number: 'text-[#F26A2E]',
      height: 'h-[76px] sm:h-[92px]',
      avatar: 'h-[60px] w-[60px] sm:h-[72px] sm:w-[72px]',
    },
  } as const;

  const StreakChip: React.FC<{ value?: number | undefined }> = ({ value }) => {
    if (!value || value <= 0) return null;
    return (
      <span
        className={`inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-bold ${
          value >= 4
            ? 'bg-violet-500/25 text-violet-200'
            : 'bg-brand-orange/20 text-brand-amber'
        }`}
        title={`Racha: ${value} semana${value !== 1 ? 's' : ''}`}
      >
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2c1 3.5-1 5-2.5 7C8 11 7 12.5 7 14.5a5 5 0 0 0 10 0c0-2-1-3.5-2-5 0 1.5-.8 2.5-1.8 2.5C12.5 10 13.5 6 12 2z" />
        </svg>
        {value}
      </span>
    );
  };

  const RankChangeIndicator: React.FC<{ youngId: string }> = ({ youngId }) => {
    const change = rankChanges.get(youngId);
    if (!change) return null;
    const isUp = change.new < change.old;
    return (
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.6 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        transition={{ type: 'spring', stiffness: 300 }}
        className="absolute -top-7 left-1/2 z-10 -translate-x-1/2"
      >
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white shadow-lg ${
            isUp ? 'bg-emerald-500' : 'bg-red-500'
          }`}
        >
          {isUp ? '▲ ¡Subió!' : '▼ Bajó'}
        </span>
      </motion.div>
    );
  };

  const PositionChange: React.FC<{ entry: ILeaderboardEntry }> = ({ entry }) => {
    const difference = entry.rankChange ?? 0;
    if (difference === 0) return <span className="text-white/30">—</span>;
    return difference > 0 ? (
      <span className="text-xs font-bold text-emerald-400">▲ +{difference}</span>
    ) : (
      <span className="text-xs font-bold text-red-400">▼ {difference}</span>
    );
  };

  const Avatar: React.FC<{
    entry: ILeaderboardEntry;
    className: string;
    text: string;
  }> = ({ entry, className, text }) => (
    <span
      className={`flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-800 font-display text-white ${className} ${text}`}
    >
      {entry.profileImage ? (
        <img src={entry.profileImage} alt={entry.youngName} className="h-full w-full object-cover" />
      ) : (
        getInitials(entry.youngName)
      )}
    </span>
  );

  const renderSlot = (rank: 1 | 2 | 3) => {
    const entry = getTop3()[rank - 1];
    if (!entry) return null;
    const c = PODIUM[rank];
    return (
      <motion.div
        key={`rank-${rank}-${entry.youngId}`}
        layout
        initial={{ opacity: 0, scale: 0.6, y: 80 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.6, y: -80 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 20,
          layout: { duration: 0.6 },
        }}
        className="relative flex min-w-0 flex-1 flex-col items-center"
      >
        <RankChangeIndicator youngId={entry.youngId} />
        {rank === 1 && (
          <svg className="mb-1 h-6 w-6 text-brand-amber" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z" />
          </svg>
        )}
        <span className={`rounded-full bg-gradient-to-br p-[3px] ${c.ring}`}>
          <Avatar
            entry={entry}
            className={`border-[3px] border-ink-950 ${c.avatar}`}
            text={rank === 1 ? 'text-3xl' : 'text-xl'}
          />
        </span>
        <span className="mt-2 line-clamp-2 max-w-full break-words px-1 text-center text-[13px] font-bold leading-tight text-white sm:text-sm">
          {entry.youngName}
          {entry.youngId === currentUserId && (
            <span className="ml-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-extrabold text-gray-900">
              TÚ
            </span>
          )}
        </span>
        <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/50">
          {!isYoung && entry.group && <span>Grupo {entry.group}</span>}
          <StreakChip value={entry.streak} />
        </span>
        <div
          className={`mt-3 flex w-full flex-col items-center justify-center rounded-t-2xl border-t bg-gradient-to-b ${c.pedestal} ${c.height}`}
        >
          <span className={`font-display text-4xl font-bold leading-none sm:text-5xl ${c.number}`}>
            {rank}
          </span>
          <span className="mt-1.5 text-xs font-semibold text-white/85 sm:text-sm">
            {entry.totalPoints} pts
          </span>
        </div>
      </motion.div>
    );
  };

  const selectCls =
    'h-10 rounded-xl border border-white/15 bg-ink-800 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-orange';
  const th =
    'px-2 sm:px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white/45';

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="flex flex-wrap justify-end gap-2.5">
          {seasons.length > 0 && (
            <select
              value={selectedSeason}
              onChange={e => setSelectedSeason(e.target.value)}
              className={selectCls}
              aria-label="Temporada"
            >
              {seasons.map(season => (
                <option key={season.id} value={season.id}>
                  {season.name} {season.isActive && '(Activa)'}
                </option>
              ))}
            </select>
          )}
          <select
            value={selectedGroup || ''}
            onChange={e =>
              setSelectedGroup(e.target.value ? parseInt(e.target.value) : null)
            }
            className={selectCls}
            aria-label="Grupo"
          >
            <option value="">Todos los grupos</option>
            {[1, 2, 3, 4, 5].map(g => (
              <option key={g} value={g}>
                Grupo {g}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/15 border-t-brand-orange" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-red-300">
          {error}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-12 text-center text-white/55">
          No hay participantes en el ranking aún
        </div>
      ) : (
        <>
          {getTop3().length > 0 && (
            <div className="mx-auto flex max-w-2xl items-end justify-center gap-3 pt-6 sm:gap-6">
              <AnimatePresence mode="popLayout">
                {renderSlot(2)}
                {renderSlot(1)}
                {renderSlot(3)}
              </AnimatePresence>
            </div>
          )}

          {getRest().length > 0 && (
            <div>
              <h3 className="m-0 mb-1 border-t border-white/10 pt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-amber">
                Ranking completo
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left">
                      <th className={th}>Pos</th>
                      <th className={th}>Joven</th>
                      <th className={`${th} hidden text-center md:table-cell`}>Cambio</th>
                      <th className={`${th} hidden text-center sm:table-cell`}>Racha</th>
                      <th className={`${th} text-right`}>Puntos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getRest().map((entry, index) => (
                      <tr
                        key={entry.youngId}
                        className={`border-t border-white/5 transition-colors hover:bg-white/[0.03] ${
                          entry.youngId === currentUserId ? 'bg-brand-amber/10' : ''
                        }`}
                      >
                        <td className="whitespace-nowrap px-2 py-3 sm:px-4">
                          <span className="font-display text-xl text-white/55">#{index + 4}</span>
                        </td>
                        <td className="px-2 py-3 sm:px-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              entry={entry}
                              className="h-9 w-9 border border-white/10"
                              text="text-xs"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                                <span className="truncate">{entry.youngName}</span>
                                {entry.youngId === currentUserId && (
                                  <span className="flex-shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-gray-900">
                                    TÚ
                                  </span>
                                )}
                              </div>
                              {entry.group && (
                                <div className="text-[11px] text-white/45">Grupo {entry.group}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-2 py-3 text-center md:table-cell sm:px-4">
                          <PositionChange entry={entry} />
                        </td>
                        <td className="hidden px-2 py-3 text-center text-xs font-semibold text-brand-amber sm:table-cell sm:px-4">
                          {entry.streak && entry.streak > 0 ? (
                            `${entry.streak} sem`
                          ) : (
                            <span className="text-white/30">—</span>
                          )}
                        </td>
                        <td className="px-2 py-3 text-right sm:px-4">
                          <span className="font-display text-xl font-semibold text-white">
                            {entry.totalPoints}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LeaderboardSection;
