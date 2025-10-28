import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pointsService } from '../services/pointsService';
import { seasonService } from '../services/seasonService';
import type { ILeaderboardEntry, ISeason } from '../types';
import StreakBadge from './StreakBadge';
import { authService } from '../services/auth';
import { getInitials, getColorFromName } from '../utils/nameUtils';
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

      // Detectar cambios de posición
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
  const StreakChip: React.FC<{ value?: number }> = ({ value }) => {
    if (!value || value <= 0) return null;
    const isViolet = value >= 4;
    const base = isViolet
      ? 'from-violet-500 to-fuchsia-600'
      : 'from-orange-400 to-amber-500';
    return (
      <div
        className={`absolute -top-3 -right-3 rounded-full px-2 py-1 text-[10px] sm:text-xs font-bold text-white shadow bg-gradient-to-r ${base} flex items-center gap-1`}
        title={`Racha: ${value} semana${value !== 1 ? 's' : ''}`}
      >
        <span className="material-symbols-rounded text-[12px] sm:text-sm">
          local_fire_department
        </span>
        {value}
      </div>
    );
  };

  // Componente para el indicador de cambio de posición
  const RankChangeIndicator: React.FC<{ youngId: string }> = ({ youngId }) => {
    const change = rankChanges.get(youngId);
    if (!change) return null;

    const isUp = change.new < change.old;

    return (
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.5 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        transition={{ type: 'spring', stiffness: 300 }}
        className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-10"
      >
        <div
          className={`px-3 py-1 rounded-full text-white font-bold text-xs flex items-center gap-1 shadow-lg ${
            isUp ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          <span className="material-symbols-rounded text-sm">
            {isUp ? 'trending_up' : 'trending_down'}
          </span>
          {isUp ? '¡Subió!' : 'Bajó'}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filtros - Solo para admin */}
      {isAdmin && (
        <div className="flex flex-wrap gap-3 justify-end">
          {seasons.length > 0 && (
            <select
              value={selectedSeason}
              onChange={e => setSelectedSeason(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Todos los grupos</option>
            <option value="1">Grupo 1</option>
            <option value="2">Grupo 2</option>
            <option value="3">Grupo 3</option>
            <option value="4">Grupo 4</option>
            <option value="5">Grupo 5</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
          <span className="text-red-700 dark:text-red-300">{error}</span>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-12 text-center">
          <span className="material-symbols-rounded text-6xl text-gray-400 mb-4">
            emoji_events
          </span>
          <p className="text-gray-500 dark:text-gray-400">
            No hay participantes en el ranking aún
          </p>
        </div>
      ) : (
        <>
          {/* Podio Top 3 con animaciones */}
          {getTop3().length > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg overflow-hidden">
              <div className="text-center mb-6 sm:mb-8">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="material-symbols-rounded text-yellow-500 text-2xl sm:text-3xl lg:text-4xl">
                    emoji_events
                  </span>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-black bg-gradient-to-r from-yellow-600 via-yellow-500 to-amber-500 dark:from-yellow-400 dark:via-yellow-300 dark:to-amber-300 bg-clip-text text-transparent">
                    Top 3
                  </h3>
                  <span className="material-symbols-rounded text-yellow-500 text-2xl sm:text-3xl lg:text-4xl">
                    emoji_events
                  </span>
                </div>
                <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-400 font-medium">
                  Líderes de la Temporada
                </p>
              </div>

              <div className="flex justify-center items-end gap-2 sm:gap-4 lg:gap-8 px-1 sm:px-2 relative">
                <AnimatePresence mode="popLayout">
                  {/* 2do lugar */}
                  {getTop3()[1] && (
                    <motion.div
                      key={`rank-2-${getTop3()[1].youngId}`}
                      layout
                      initial={{ opacity: 0, scale: 0.5, y: 100 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5, y: -100 }}
                      transition={{
                        type: 'spring',
                        stiffness: 200,
                        damping: 20,
                        layout: { duration: 0.6 },
                      }}
                      className="flex flex-col items-center relative"
                    >
                      <RankChangeIndicator youngId={getTop3()[1].youngId} />
                      <div className="relative mb-2 sm:mb-3">
                        <div className="w-14 h-14 sm:w-20 sm:h-20 lg:w-24 lg:h-24">
                          {getTop3()[1].profileImage ? (
                            <img
                              src={getTop3()[1].profileImage}
                              alt={getTop3()[1].youngName}
                              className="w-full h-full rounded-full object-cover border-2 sm:border-4 border-gray-400 shadow-lg"
                            />
                          ) : (
                            <div
                              className={`w-full h-full rounded-full bg-gradient-to-br ${getColorFromName(getTop3()[1].youngName, 2)} flex items-center justify-center text-white text-base sm:text-2xl font-bold border-2 sm:border-4 border-gray-400 shadow-lg`}
                            >
                              {getInitials(getTop3()[1].youngName)}
                            </div>
                          )}
                          <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-white dark:bg-gray-800 rounded-full p-0.5 sm:p-1 shadow-lg">
                            <span className="material-symbols-rounded text-xl sm:text-2xl lg:text-3xl text-gray-400">
                              workspace_premium
                            </span>
                          </div>
                        </div>
                        <StreakChip value={getTop3()[1].streak} />
                      </div>
                      <div className="bg-white dark:bg-gray-700 rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 shadow-md min-w-[6rem] max-w-[10rem] sm:min-w-[8rem] sm:max-w-[12rem] text-center">
                        <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-400 mb-0.5 sm:mb-1">
                          #2
                        </div>
                        <div className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm mb-0.5 sm:mb-1 break-words px-0.5 sm:px-1">
                          {getTop3()[1].youngName}
                        </div>
                        {!isYoung && getTop3()[1].group && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Grupo {getTop3()[1].group}
                          </div>
                        )}
                        <div className="text-sm sm:text-base lg:text-lg font-bold text-gray-700 dark:text-gray-300">
                          {getTop3()[1].totalPoints} pts
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* 1er lugar */}
                  {getTop3()[0] && (
                    <motion.div
                      key={`rank-1-${getTop3()[0].youngId}`}
                      layout
                      initial={{ opacity: 0, scale: 0.5, y: 100 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5, y: -100 }}
                      transition={{
                        type: 'spring',
                        stiffness: 200,
                        damping: 20,
                        layout: { duration: 0.6 },
                      }}
                      className="flex flex-col items-center -mt-6 sm:-mt-8 relative"
                    >
                      <RankChangeIndicator youngId={getTop3()[0].youngId} />
                      <div className="relative mb-2 sm:mb-3">
                        <div className="w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32">
                          {getTop3()[0].profileImage ? (
                            <img
                              src={getTop3()[0].profileImage}
                              alt={getTop3()[0].youngName}
                              className="w-full h-full rounded-full object-cover border-2 sm:border-4 border-yellow-400 shadow-2xl"
                            />
                          ) : (
                            <div
                              className={`w-full h-full rounded-full bg-gradient-to-br ${getColorFromName(getTop3()[0].youngName, 1)} flex items-center justify-center text-white text-xl sm:text-3xl font-bold border-2 sm:border-4 border-yellow-400 shadow-2xl`}
                            >
                              {getInitials(getTop3()[0].youngName)}
                            </div>
                          )}
                          <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-white dark:bg-gray-800 rounded-full p-0.5 sm:p-1 shadow-lg">
                            <span className="material-symbols-rounded text-2xl sm:text-3xl lg:text-4xl text-yellow-500">
                              workspace_premium
                            </span>
                          </div>
                        </div>
                        <StreakChip value={getTop3()[0].streak} />
                      </div>
                      <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 shadow-xl min-w-[7rem] max-w-[11rem] sm:min-w-[9rem] sm:max-w-[14rem] text-center">
                        <div className="text-2xl sm:text-3xl font-bold mb-0.5 sm:mb-1">
                          #1
                        </div>
                        <div className="font-bold text-xs sm:text-sm lg:text-base mb-1 sm:mb-2 break-words px-0.5 sm:px-1">
                          {getTop3()[0].youngName}
                        </div>
                        {!isYoung && getTop3()[0].group && (
                          <div className="text-xs text-yellow-100 mb-1">
                            Grupo {getTop3()[0].group}
                          </div>
                        )}
                        <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                          {getTop3()[0].totalPoints} pts
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* 3er lugar */}
                  {getTop3()[2] && (
                    <motion.div
                      key={`rank-3-${getTop3()[2].youngId}`}
                      layout
                      initial={{ opacity: 0, scale: 0.5, y: 100 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5, y: -100 }}
                      transition={{
                        type: 'spring',
                        stiffness: 200,
                        damping: 20,
                        layout: { duration: 0.6 },
                      }}
                      className="flex flex-col items-center relative"
                    >
                      <RankChangeIndicator youngId={getTop3()[2].youngId} />
                      <div className="relative mb-2 sm:mb-3">
                        <div className="w-14 h-14 sm:w-20 sm:h-20 lg:w-24 lg:h-24">
                          {getTop3()[2].profileImage ? (
                            <img
                              src={getTop3()[2].profileImage}
                              alt={getTop3()[2].youngName}
                              className="w-full h-full rounded-full object-cover border-2 sm:border-4 border-orange-600 shadow-lg"
                            />
                          ) : (
                            <div
                              className={`w-full h-full rounded-full bg-gradient-to-br ${getColorFromName(getTop3()[2].youngName, 3)} flex items-center justify-center text-white text-base sm:text-2xl font-bold border-2 sm:border-4 border-orange-600 shadow-lg`}
                            >
                              {getInitials(getTop3()[2].youngName)}
                            </div>
                          )}
                          <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-white dark:bg-gray-800 rounded-full p-0.5 sm:p-1 shadow-lg">
                            <span className="material-symbols-rounded text-xl sm:text-2xl lg:text-3xl text-orange-600">
                              workspace_premium
                            </span>
                          </div>
                        </div>
                        <StreakChip value={getTop3()[2].streak} />
                      </div>
                      <div className="bg-white dark:bg-gray-700 rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 shadow-md min-w-[6rem] max-w-[10rem] sm:min-w-[8rem] sm:max-w-[12rem] text-center">
                        <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600 mb-0.5 sm:mb-1">
                          #3
                        </div>
                        <div className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm mb-0.5 sm:mb-1 break-words px-0.5 sm:px-1">
                          {getTop3()[2].youngName}
                        </div>
                        {!isYoung && getTop3()[2].group && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Grupo {getTop3()[2].group}
                          </div>
                        )}
                        <div className="text-sm sm:text-base lg:text-lg font-bold text-gray-700 dark:text-gray-300">
                          {getTop3()[2].totalPoints} pts
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Tabla completa - Para admin y young (a partir del 4to lugar) */}
          {getRest().length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-rounded text-blue-500">
                    leaderboard
                  </span>
                  Ranking Completo
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Pos
                      </th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Joven
                      </th>
                      <th className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Racha
                      </th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Puntos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {getRest().map((entry, index) => (
                      <tr
                        key={entry.youngId}
                        className={`
                          hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                          ${entry.youngId === currentUserId ? 'bg-amber-50 dark:bg-amber-900/20' : ''}
                        `}
                      >
                        <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                            #{index + 4}
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-3 sm:py-4">
                          <div className="flex items-center gap-2 sm:gap-3">
                            {entry.profileImage ? (
                              <img
                                src={entry.profileImage}
                                alt={entry.youngName}
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div
                                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br ${getColorFromName(entry.youngName, entry.currentRank)} flex items-center justify-center text-white text-xs sm:text-sm font-bold`}
                              >
                                {getInitials(entry.youngName)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                                {entry.youngName}
                              </div>
                              {entry.group && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Grupo {entry.group}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-2 sm:px-4 py-3 sm:py-4 text-center">
                          {entry.streak && entry.streak > 0 ? (
                            <StreakBadge
                              streak={entry.streak}
                              isActive={true}
                              compact={true}
                            />
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600 text-xs">
                              -
                            </span>
                          )}
                        </td>
                        <td className="px-2 sm:px-4 py-3 sm:py-4 text-right">
                          <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-white font-bold text-xs sm:text-sm">
                            <span className="material-symbols-rounded text-xs sm:text-sm">
                              star
                            </span>
                            <span>{entry.totalPoints}</span>
                          </div>
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
