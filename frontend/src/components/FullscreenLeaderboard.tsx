import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeason } from '../context/SeasonContext';
import { getInitials, getColorFromName } from '../utils/nameUtils';
import type { ILeaderboardEntry } from '../types';
import SeasonStatsBar from './SeasonStatsBar';

interface FullscreenLeaderboardProps {
  leaderboard: ILeaderboardEntry[];
}

const FullscreenLeaderboard: React.FC<FullscreenLeaderboardProps> = ({
  leaderboard,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentView, setCurrentView] = useState<'top3' | 'top10'>('top3');
  const { activeSeason } = useSeason();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);
  const cleanupFnsRef = useRef<Array<() => void>>([]);

  const TOP3_DURATION = 12000; // 12s mostrando Top 3
  const TOP10_DURATION = 18000; // 18s mostrando Top 10 (más tiempo para scroll)
  const SCROLL_START_DELAY = 1200; // 1.2s para que framer-motion termine animaciones

  // Rotación automática con duración diferente por vista
  useEffect(() => {
    if (!isFullscreen) return;

    const timeout = setTimeout(
      () => {
        setCurrentView(prev => (prev === 'top3' ? 'top10' : 'top3'));
      },
      currentView === 'top3' ? TOP3_DURATION : TOP10_DURATION
    );

    return () => clearTimeout(timeout);
  }, [isFullscreen, currentView]);

  // Limpieza total de scroll
  const cleanupScroll = useCallback(() => {
    abortRef.current = true;
    cleanupFnsRef.current.forEach(fn => fn());
    cleanupFnsRef.current = [];
  }, []);

  // Helper para registrar timeouts/frames que se limpian automáticamente
  const safeTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      if (!abortRef.current) fn();
    }, ms);
    cleanupFnsRef.current.push(() => clearTimeout(id));
  }, []);

  const safeAnimationFrame = useCallback((fn: () => void) => {
    const id = requestAnimationFrame(() => {
      if (!abortRef.current) fn();
    });
    cleanupFnsRef.current.push(() => cancelAnimationFrame(id));
  }, []);

  // Auto-scroll suave en modo Top 10
  useEffect(() => {
    // Limpiar siempre al cambiar de vista
    cleanupScroll();

    if (!isFullscreen || currentView !== 'top10') {
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollTop = 0;
      }
      return;
    }

    // Activar nuevo ciclo
    abortRef.current = false;

    safeTimeout(() => {
      const container = tableContainerRef.current;
      if (!container) return;

      const maxScroll = container.scrollHeight - container.clientHeight;
      if (maxScroll <= 0) return;

      // Resetear posición
      container.scrollTop = 0;

      // Tiempo disponible para scroll: TOP10_DURATION - delay - margen de seguridad
      const availableTime = TOP10_DURATION - SCROLL_START_DELAY - 1500;
      // Dividir: 45% bajar, 10% pausa, 45% subir
      const scrollDownDuration = availableTime * 0.45;
      const pauseDuration = availableTime * 0.1;
      const scrollUpDuration = availableTime * 0.45;

      const smoothScroll = (
        from: number,
        to: number,
        duration: number,
        onComplete: () => void
      ) => {
        const startTime = performance.now();

        const step = () => {
          if (abortRef.current) return;

          const elapsed = performance.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Easing ease-in-out
          const ease =
            progress < 0.5
              ? 2 * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 2) / 2;

          container.scrollTop = from + (to - from) * ease;

          if (progress < 1) {
            safeAnimationFrame(step);
          } else {
            onComplete();
          }
        };

        safeAnimationFrame(step);
      };

      // Fase 1: Scroll hacia abajo
      smoothScroll(0, maxScroll, scrollDownDuration, () => {
        // Fase 2: Pausa abajo
        safeTimeout(() => {
          // Fase 3: Scroll hacia arriba
          smoothScroll(maxScroll, 0, scrollUpDuration, () => {
            // Ciclo completo, la vista cambiará pronto
          });
        }, pauseDuration);
      });
    }, SCROLL_START_DELAY);

    return cleanupScroll;
  }, [
    isFullscreen,
    currentView,
    cleanupScroll,
    safeTimeout,
    safeAnimationFrame,
  ]);

  // Listener para salir con ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        exitFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const enterFullscreen = useCallback(() => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
      setIsFullscreen(true);
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen();
    }
    setIsFullscreen(false);
  }, []);

  // Listener para cambios de fullscreen desde navegador
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const getTop3 = () => leaderboard.slice(0, 3);
  const getTop10 = () => leaderboard.slice(0, 10);

  const PositionChangeChip: React.FC<{ entry: ILeaderboardEntry }> = ({
    entry,
  }) => {
    if (!entry.previousRank || entry.previousRank === entry.currentRank) {
      return (
        <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
          <span className="material-symbols-rounded text-sm">remove</span>
          <span className="text-sm font-medium">=</span>
        </div>
      );
    }

    const difference = entry.previousRank - entry.currentRank;
    const isUp = difference > 0;

    if (isUp) {
      return (
        <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
          <span className="material-symbols-rounded text-sm">trending_up</span>
          <span className="text-sm font-bold">+{Math.abs(difference)}</span>
        </div>
      );
    }

    return (
      <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
        <span className="material-symbols-rounded text-sm">trending_down</span>
        <span className="text-sm font-bold">-{Math.abs(difference)}</span>
      </div>
    );
  };

  if (!isFullscreen) {
    return (
      <button
        onClick={enterFullscreen}
        className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
      >
        <span className="material-symbols-rounded">fullscreen</span>
        Modo Proyector
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 dark:from-black dark:via-gray-900 dark:to-black z-50 overflow-auto">
      {/* Exit Button */}
      <button
        onClick={exitFullscreen}
        className="absolute top-4 right-4 z-50 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-white transition-all duration-200"
        title="Salir (ESC)"
      >
        <span className="material-symbols-rounded text-2xl">
          close_fullscreen
        </span>
      </button>

      {/* View Indicator */}
      <div className="absolute top-4 left-4 z-50 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm font-medium">
        {currentView === 'top3' ? 'Top 3 Líderes' : 'Top 10 Ranking'}
      </div>

      <div className="container mx-auto px-4 py-8 h-full flex flex-col">
        {/* Stats Bar */}
        <SeasonStatsBar activeParticipants={leaderboard.length} />

        <AnimatePresence mode="wait">
          {currentView === 'top3' ? (
            <motion.div
              key="top3-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="flex-1 flex items-center justify-center"
            >
              {/* Podio Top 3 con animaciones de brillo */}
              <div className="w-full max-w-6xl">
                <div className="text-center mb-12">
                  <h2 className="text-5xl md:text-7xl font-black bg-gradient-to-r from-yellow-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent mb-4 drop-shadow-2xl">
                    🏆 Top 3 🏆
                  </h2>
                  <p className="text-2xl text-white/80 font-medium">
                    {activeSeason?.name || 'Líderes de la Temporada'}
                  </p>
                </div>

                <div className="flex justify-center items-end gap-8 px-4">
                  {/* 2do Lugar */}
                  {(() => {
                    const secondPlace = getTop3()[1];
                    if (!secondPlace) return null;

                    return (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="flex flex-col items-center"
                      >
                        <div className="relative mb-6">
                          {secondPlace.profileImage ? (
                            <img
                              src={secondPlace.profileImage}
                              alt={secondPlace.youngName}
                              className="w-40 h-40 rounded-full object-cover border-8 border-gray-300 shadow-2xl animate-shimmer-silver"
                            />
                          ) : (
                            <div
                              className={`w-40 h-40 rounded-full bg-gradient-to-br ${getColorFromName(secondPlace.youngName, 2)} flex items-center justify-center text-white text-5xl font-bold border-8 border-gray-300 shadow-2xl animate-shimmer-silver`}
                            >
                              {getInitials(secondPlace.youngName)}
                            </div>
                          )}
                          <div className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-2xl">
                            <span className="text-6xl">🥈</span>
                          </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 min-w-[280px] text-center shadow-2xl">
                          <div className="text-4xl font-bold text-gray-300 mb-2">
                            #2
                          </div>
                          <div className="font-bold text-white text-2xl mb-2 break-words">
                            {secondPlace.youngName}
                          </div>
                          {secondPlace.group && (
                            <div className="text-lg text-white/60 mb-3">
                              Grupo {secondPlace.group}
                            </div>
                          )}
                          <div className="text-3xl font-black text-white">
                            {secondPlace.totalPoints} pts
                          </div>
                          <div className="mt-3">
                            <PositionChangeChip entry={secondPlace} />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })()}

                  {/* 1er Lugar */}
                  {(() => {
                    const firstPlace = getTop3()[0];
                    if (!firstPlace) return null;

                    return (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0, duration: 0.6 }}
                        className="flex flex-col items-center"
                      >
                        <div className="relative mb-6">
                          {firstPlace.profileImage ? (
                            <img
                              src={firstPlace.profileImage}
                              alt={firstPlace.youngName}
                              className="w-52 h-52 rounded-full object-cover border-8 border-yellow-400 shadow-2xl animate-shimmer-gold"
                            />
                          ) : (
                            <div
                              className={`w-52 h-52 rounded-full bg-gradient-to-br ${getColorFromName(firstPlace.youngName, 1)} flex items-center justify-center text-white text-6xl font-bold border-8 border-yellow-400 shadow-2xl animate-shimmer-gold`}
                            >
                              {getInitials(firstPlace.youngName)}
                            </div>
                          )}
                          <div className="absolute -top-6 -right-6 bg-white rounded-full p-3 shadow-2xl">
                            <span className="text-7xl">👑</span>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-500/20 to-amber-600/20 backdrop-blur-md rounded-2xl p-8 min-w-[320px] text-center shadow-2xl border-2 border-yellow-400/50">
                          <div className="text-5xl font-bold text-yellow-400 mb-2">
                            #1
                          </div>
                          <div className="font-black text-white text-3xl mb-2 break-words">
                            {firstPlace.youngName}
                          </div>
                          {firstPlace.group && (
                            <div className="text-xl text-white/70 mb-4">
                              Grupo {firstPlace.group}
                            </div>
                          )}
                          <div className="text-4xl font-black text-yellow-300">
                            {firstPlace.totalPoints} pts
                          </div>
                          <div className="mt-4">
                            <PositionChangeChip entry={firstPlace} />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })()}

                  {/* 3er Lugar */}
                  {(() => {
                    const thirdPlace = getTop3()[2];
                    if (!thirdPlace) return null;

                    return (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="flex flex-col items-center"
                      >
                        <div className="relative mb-6">
                          {thirdPlace.profileImage ? (
                            <img
                              src={thirdPlace.profileImage}
                              alt={thirdPlace.youngName}
                              className="w-40 h-40 rounded-full object-cover border-8 border-orange-600 shadow-2xl animate-shimmer-bronze"
                            />
                          ) : (
                            <div
                              className={`w-40 h-40 rounded-full bg-gradient-to-br ${getColorFromName(thirdPlace.youngName, 3)} flex items-center justify-center text-white text-5xl font-bold border-8 border-orange-600 shadow-2xl animate-shimmer-bronze`}
                            >
                              {getInitials(thirdPlace.youngName)}
                            </div>
                          )}
                          <div className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-2xl">
                            <span className="text-6xl">🥉</span>
                          </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 min-w-[280px] text-center shadow-2xl">
                          <div className="text-4xl font-bold text-orange-400 mb-2">
                            #3
                          </div>
                          <div className="font-bold text-white text-2xl mb-2 break-words">
                            {thirdPlace.youngName}
                          </div>
                          {thirdPlace.group && (
                            <div className="text-lg text-white/60 mb-3">
                              Grupo {thirdPlace.group}
                            </div>
                          )}
                          <div className="text-3xl font-black text-white">
                            {thirdPlace.totalPoints} pts
                          </div>
                          <div className="mt-3">
                            <PositionChangeChip entry={thirdPlace} />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="top10-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="flex-1 flex flex-col"
            >
              {/* Top 10 Table */}
              <div
                ref={tableContainerRef}
                className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl overflow-y-scroll h-[calc(100vh-250px)] scrollbar-thin scrollbar-thumb-blue-500/50 scrollbar-track-transparent hover:scrollbar-thumb-blue-500"
                style={{ scrollBehavior: 'auto' }}
              >
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 sticky top-0 z-10">
                  <h3 className="text-4xl font-black text-white text-center">
                    📊 Ranking Completo - Top 10
                  </h3>
                </div>
                <div className="p-8">
                  <div className="space-y-8 pb-20">
                    {getTop10().map((entry, index) => (
                      <motion.div
                        key={entry.youngId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex items-center gap-8 p-10 rounded-2xl backdrop-blur-sm transition-all duration-200 ${
                          index < 3
                            ? 'bg-gradient-to-r from-yellow-500/20 to-amber-600/20 border-2 border-yellow-400/50'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        {/* Rank */}
                        <div
                          className={`text-7xl font-black w-32 text-center ${
                            index === 0
                              ? 'text-yellow-400'
                              : index === 1
                                ? 'text-gray-300'
                                : index === 2
                                  ? 'text-orange-400'
                                  : 'text-white/60'
                          }`}
                        >
                          #{index + 1}
                        </div>

                        {/* Avatar */}
                        {entry.profileImage ? (
                          <img
                            src={entry.profileImage}
                            alt={entry.youngName}
                            className="w-28 h-28 rounded-full object-cover border-4 border-white/30 shadow-lg"
                          />
                        ) : (
                          <div
                            className={`w-28 h-28 rounded-full bg-gradient-to-br ${getColorFromName(entry.youngName, entry.currentRank)} flex items-center justify-center text-white text-4xl font-bold border-4 border-white/30 shadow-lg`}
                          >
                            {getInitials(entry.youngName)}
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1">
                          <div className="font-bold text-white text-5xl mb-3">
                            {entry.youngName}
                          </div>
                          {entry.group && (
                            <div className="text-white/60 text-2xl">
                              Grupo {entry.group}
                            </div>
                          )}
                        </div>

                        {/* Change */}
                        <div>
                          <PositionChangeChip entry={entry} />
                        </div>

                        {/* Points */}
                        <div className="text-right">
                          <div className="text-6xl font-black text-white">
                            {entry.totalPoints}
                          </div>
                          <div className="text-white/60 text-2xl">puntos</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FullscreenLeaderboard;
