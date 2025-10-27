import React, { useState, useEffect } from 'react';
import { pointsService } from '../services/pointsService';
import { seasonService } from '../services/seasonService';
import type { ILeaderboardEntry, ISeason } from '../types';
import StreakBadge from './StreakBadge';
import { authService } from '../services/auth';

const LeaderboardSection: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<ILeaderboardEntry[]>([]);
  const [seasons, setSeasons] = useState<ISeason[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUser = authService.getUserInfo();
  const currentUserId = currentUser?.id;

  useEffect(() => {
    loadSeasons();
  }, []);

  useEffect(() => {
    if (selectedSeason || seasons.length > 0) {
      loadLeaderboard();
    }
  }, [selectedSeason, selectedGroup]);

  const loadSeasons = async () => {
    try {
      const seasonsData = await seasonService.getAll();
      setSeasons(seasonsData);

      // Seleccionar la temporada activa por defecto
      const activeSeason = seasonsData.find(s => s.isActive);
      if (activeSeason && activeSeason.id) {
        setSelectedSeason(activeSeason.id);
      }
    } catch (error) {
      console.error('Error loading seasons:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const options: any = {};
      if (selectedSeason) options.seasonId = selectedSeason;
      if (selectedGroup) options.group = selectedGroup;

      const data = await pointsService.getLeaderboard(options);
      setLeaderboard(data);
    } catch (err: any) {
      console.error('Error loading leaderboard:', err);
      setError(err.message || 'Error al cargar el ranking');
    } finally {
      setLoading(false);
    }
  };

  const getTop3 = () => leaderboard.slice(0, 3);
  const getRest = () => leaderboard.slice(3);

  const currentUserEntry = leaderboard.find(
    entry => entry.youngId === currentUserId
  );

  return (
    <div className="space-y-6">
      {/* Header y filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-rounded text-3xl text-primary">
            leaderboard
          </span>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Ranking de Puntos
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Clasificación de la temporada actual
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          {/* Selector de temporada */}
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

          {/* Selector de grupo */}
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
      </div>

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
          {/* Podio Top 3 */}
          {getTop3().length > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 text-center">
                Top 3 de la Temporada
              </h3>

              <div className="flex justify-center items-end gap-4 sm:gap-8">
                {/* 2do lugar */}
                {getTop3()[1] && (
                  <div className="flex flex-col items-center">
                    <div className="relative mb-3">
                      <div className="w-20 h-20 sm:w-24 sm:h-24">
                        {getTop3()[1].young.profileImage ? (
                          <img
                            src={getTop3()[1].young.profileImage}
                            alt={getTop3()[1].young.fullName}
                            className="w-full h-full rounded-full object-cover border-4 border-gray-400 shadow-lg"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-gray-400 shadow-lg">
                            {getTop3()[1]
                              .young.fullName.charAt(0)
                              .toUpperCase()}
                          </div>
                        )}
                        <div className="absolute -top-2 -right-2 bg-white dark:bg-gray-800 rounded-full p-1 shadow-lg">
                          <span className="material-symbols-rounded text-3xl text-gray-400">
                            workspace_premium
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-md w-32 sm:w-40 text-center">
                      <div className="text-2xl font-bold text-gray-400 mb-1">
                        #2
                      </div>
                      <div className="font-semibold text-gray-900 dark:text-white text-sm mb-1 truncate">
                        {getTop3()[1].young.fullName}
                      </div>
                      <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                        {getTop3()[1].totalPoints} pts
                      </div>
                    </div>
                  </div>
                )}

                {/* 1er lugar */}
                {getTop3()[0] && (
                  <div className="flex flex-col items-center -mt-8">
                    <div className="relative mb-3">
                      <div className="w-24 h-24 sm:w-32 sm:h-32">
                        {getTop3()[0].young.profileImage ? (
                          <img
                            src={getTop3()[0].young.profileImage}
                            alt={getTop3()[0].young.fullName}
                            className="w-full h-full rounded-full object-cover border-4 border-yellow-400 shadow-2xl"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-yellow-400 shadow-2xl">
                            {getTop3()[0]
                              .young.fullName.charAt(0)
                              .toUpperCase()}
                          </div>
                        )}
                        <div className="absolute -top-2 -right-2 bg-white dark:bg-gray-800 rounded-full p-1 shadow-lg">
                          <span className="material-symbols-rounded text-4xl text-yellow-500">
                            workspace_premium
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-white rounded-xl p-5 shadow-xl w-36 sm:w-48 text-center">
                      <div className="text-3xl font-bold mb-1">#1</div>
                      <div className="font-bold text-sm sm:text-base mb-2 truncate">
                        {getTop3()[0].young.fullName}
                      </div>
                      <div className="text-2xl font-bold">
                        {getTop3()[0].totalPoints} pts
                      </div>
                    </div>
                  </div>
                )}

                {/* 3er lugar */}
                {getTop3()[2] && (
                  <div className="flex flex-col items-center">
                    <div className="relative mb-3">
                      <div className="w-20 h-20 sm:w-24 sm:h-24">
                        {getTop3()[2].young.profileImage ? (
                          <img
                            src={getTop3()[2].young.profileImage}
                            alt={getTop3()[2].young.fullName}
                            className="w-full h-full rounded-full object-cover border-4 border-orange-600 shadow-lg"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-400 to-orange-700 flex items-center justify-center text-white text-2xl font-bold border-4 border-orange-600 shadow-lg">
                            {getTop3()[2]
                              .young.fullName.charAt(0)
                              .toUpperCase()}
                          </div>
                        )}
                        <div className="absolute -top-2 -right-2 bg-white dark:bg-gray-800 rounded-full p-1 shadow-lg">
                          <span className="material-symbols-rounded text-3xl text-orange-600">
                            workspace_premium
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-md w-32 sm:w-40 text-center">
                      <div className="text-2xl font-bold text-orange-600 mb-1">
                        #3
                      </div>
                      <div className="font-semibold text-gray-900 dark:text-white text-sm mb-1 truncate">
                        {getTop3()[2].young.fullName}
                      </div>
                      <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                        {getTop3()[2].totalPoints} pts
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mi posición (si no está en top 3) */}
          {currentUserEntry && currentUserEntry.rank > 3 && (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                    #{currentUserEntry.rank}
                  </div>
                  {currentUserEntry.young.profileImage ? (
                    <img
                      src={currentUserEntry.young.profileImage}
                      alt={currentUserEntry.young.fullName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold">
                      {currentUserEntry.young.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">
                      Tu Posición
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {currentUserEntry.young.fullName}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {currentUserEntry.streak && currentUserEntry.streak > 0 && (
                    <StreakBadge
                      streak={currentUserEntry.streak}
                      isActive={true}
                    />
                  )}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                      {currentUserEntry.totalPoints}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      puntos
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabla del resto */}
          {getRest().length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Posición
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Joven
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Racha
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Puntos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {getRest().map(entry => (
                      <tr
                        key={entry.youngId}
                        className={`
                          hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                          ${entry.youngId === currentUserId ? 'bg-amber-50 dark:bg-amber-900/20' : ''}
                        `}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            #{entry.rank}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {entry.young.profileImage ? (
                              <img
                                src={entry.young.profileImage}
                                alt={entry.young.fullName}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                                {entry.young.fullName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">
                                {entry.young.fullName}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {entry.young.role}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
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
                        <td className="px-4 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-white font-bold">
                            <span className="material-symbols-rounded text-sm">
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
