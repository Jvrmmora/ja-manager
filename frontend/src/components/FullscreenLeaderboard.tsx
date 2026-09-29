import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeason } from '../context/SeasonContext';
import { getInitials } from '../utils/nameUtils';
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
  const TOP10_DURATION = 18000; // 18s mostrando Top 14 (más tiempo para scroll)
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

  // Auto-scroll suave en modo Top 20
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
        e.preventDefault();
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
  const getTop20 = () => leaderboard.slice(0, 20);

  const PositionChangeChip: React.FC<{ entry: ILeaderboardEntry; big?: boolean }> = ({
    entry,
    big = false,
  }) => {
    const size = big ? 'text-base' : 'text-[15px]';
    const difference = entry.rankChange ?? 0;
    if (difference === 0) {
      return <span className={`${size} font-semibold text-white/50`}>— Se mantiene</span>;
    }
    return difference > 0 ? (
      <span className={`${size} font-semibold text-emerald-400`}>▲ Subió {difference}</span>
    ) : (
      <span className={`${size} font-semibold text-red-300`}>▼ Bajó {Math.abs(difference)}</span>
    );
  };

  const Avatar: React.FC<{
    entry: ILeaderboardEntry;
    className: string;
    ring: string;
    style?: React.CSSProperties;
  }> = ({ entry, className, ring, style }) => (
    <span
      className={`flex items-center justify-center overflow-hidden rounded-full bg-ink-800 font-display ${ring} ${className}`}
      {...(style ? { style } : {})}
    >
      {entry.profileImage ? (
        <img src={entry.profileImage} alt="" className="h-full w-full object-cover" />
      ) : (
        getInitials(entry.youngName)
      )}
    </span>
  );

  if (!isFullscreen) {
    return (
      <button
        type="button"
        onClick={enterFullscreen}
        className="hidden h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-semibold text-white transition-colors hover:border-white/50 md:inline-flex"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
        Modo proyector
      </button>
    );
  }

  const top3 = getTop3();
  // Podio proporcional a la altura de la pantalla (vh) para no dejar huecos ni cortar barras
  const podium: Array<{
    entry: ILeaderboardEntry | undefined;
    place: number;
    avatarPx: string;
    ring: string;
    barPct: number;
    bar: string;
    numSize: string;
    numColor: string;
    delay: number;
  }> = [
    { entry: top3[1], place: 2, avatarPx: 'clamp(72px, 12vh, 132px)', ring: 'border-4 border-[#CBD5E1]', barPct: 30, bar: 'border-[#CBD5E1]/30 bg-[linear-gradient(180deg,rgba(203,213,225,.3),rgba(203,213,225,.05))]', numSize: 'clamp(40px, 8vh, 88px)', numColor: 'text-[#E2E8F0]', delay: 0.15 },
    { entry: top3[0], place: 1, avatarPx: 'clamp(88px, 15vh, 168px)', ring: 'border-[6px] border-brand-amber', barPct: 40, bar: 'border-brand-amber/55 bg-[linear-gradient(180deg,rgba(249,162,59,.45),rgba(242,106,46,.08))]', numSize: 'clamp(52px, 11vh, 116px)', numColor: 'text-[#FDE68A]', delay: 0.35 },
    { entry: top3[2], place: 3, avatarPx: 'clamp(72px, 12vh, 132px)', ring: 'border-4 border-[#D97745]', barPct: 22, bar: 'border-[#D97745]/35 bg-[linear-gradient(180deg,rgba(217,119,69,.34),rgba(217,119,69,.05))]', numSize: 'clamp(36px, 7vh, 76px)', numColor: 'text-[#F4B58C]', delay: 0.55 },
  ];

  return createPortal(
    <div className="brand-skin">
    <div className="dark fixed inset-0 z-[9999] flex flex-col overflow-hidden bg-ink-950 text-white">
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-[700px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(249,162,59,.24)_0%,rgba(20,11,16,0)_65%)] motion-safe:animate-pulse" />

      {/* Cabecera */}
      <div className="relative flex items-center justify-between gap-4 px-6 pt-6 lg:px-12 lg:pt-7">
        <span className="flex items-center gap-4">
          <span className="bg-gold flex h-14 w-14 items-center justify-center rounded-[18px] text-ink-950">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            </svg>
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="font-display text-3xl font-bold uppercase leading-none lg:text-[40px]">
              Ranking de la temporada
            </span>
            <span className="text-base text-white/55">
              {activeSeason?.name || 'Líderes de la temporada'}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-3">
          <span className="hidden rounded-full border border-white/10 bg-white/[0.06] p-1 sm:flex">
            {(['top3', 'top10'] as const).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setCurrentView(v)}
                aria-pressed={currentView === v}
                className={`h-10 rounded-full px-[18px] text-sm font-bold transition-colors ${
                  currentView === v ? 'bg-brand-amber text-ink-950' : 'text-white/70 hover:text-white'
                }`}
              >
                {v === 'top3' ? 'Podio' : 'Top 20'}
              </button>
            ))}
          </span>
          <button
            type="button"
            onClick={exitFullscreen}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-white/50"
            title="Salir (ESC)"
            aria-label="Salir del modo proyector"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </span>
      </div>
      {/* Tiempo hasta el cambio de vista */}
      <div className="relative mx-6 mt-3.5 h-[3px] overflow-hidden rounded bg-white/10 lg:mx-12">
        <motion.span
          key={currentView}
          className="block h-full bg-[linear-gradient(90deg,#F9A23B,#DC3340)]"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: (currentView === 'top3' ? TOP3_DURATION : TOP10_DURATION) / 1000, ease: 'linear' }}
        />
      </div>

      <div className="relative px-6 pt-3 lg:px-12">
        <SeasonStatsBar activeParticipants={leaderboard.length} compact />
      </div>

      <AnimatePresence mode="wait">
        {currentView === 'top3' ? (
          <motion.div
            key="top3-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="relative mt-2 grid min-h-0 flex-1 grid-cols-3 items-stretch gap-3 px-6 sm:gap-6 lg:gap-8 lg:px-12"
          >
            {podium.map(({ entry, place, avatarPx, ring, barPct, bar, numSize, numColor, delay }) =>
              entry ? (
                <motion.div
                  key={entry.youngId}
                  initial={{ opacity: 0, y: 60 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay, duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
                  className="mx-auto flex h-full w-full min-w-0 max-w-[400px] flex-col items-center justify-end"
                >
                  {/* Cabeza del podio: ocupa el espacio libre sobre la barra y se centra */}
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-end gap-[1.2vh] pb-[1.6vh] text-center">
                    {place === 1 && (
                      <motion.svg
                        className="flex-shrink-0"
                        style={{ width: 'clamp(40px, 6vh, 64px)', height: 'auto' }}
                        viewBox="0 0 24 18"
                        fill="#F9A23B"
                        animate={{ y: [0, -6, 0], rotate: [-4, 4, -4] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        aria-hidden="true"
                      >
                        <path d="M1 3l4.5 9h13L23 3l-6 4.5L12 0 7 7.5z" />
                        <rect x="5" y="14" width="14" height="3" rx="1" />
                      </motion.svg>
                    )}
                    <Avatar
                      entry={entry}
                      className="flex-shrink-0"
                      style={{ width: avatarPx, height: avatarPx, fontSize: `calc(${avatarPx} * 0.36)` }}
                      ring={ring}
                    />
                    <span
                      className="line-clamp-2 max-w-full flex-shrink-0 break-words text-center font-bold leading-tight"
                      style={{ fontSize: place === 1 ? 'clamp(22px, 3.6vh, 36px)' : 'clamp(20px, 3.1vh, 30px)' }}
                    >
                      {entry.youngName}
                    </span>
                    <span className="flex flex-shrink-0 flex-wrap items-center justify-center gap-x-3 text-[15px] text-white/60">
                      {entry.group && <span>Grupo {entry.group}</span>}
                      <PositionChangeChip entry={entry} />
                    </span>
                  </div>
                  <span
                    className={`flex w-full flex-shrink-0 flex-col items-center justify-center rounded-t-[28px] border border-b-0 ${bar}`}
                    style={{ height: `${barPct}%` }}
                  >
                    <span className={`font-display font-bold leading-none ${numColor}`} style={{ fontSize: numSize }}>
                      {place}
                    </span>
                    <span className="mt-1 text-xl font-bold lg:text-2xl">{entry.totalPoints} pts</span>
                  </span>
                </motion.div>
              ) : (
                <span key={`empty-${place}`} />
              )
            )}
          </motion.div>
        ) : (
          <motion.div
            key="top10-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="relative flex min-h-0 flex-1 flex-col px-6 pb-6 pt-5 lg:px-12"
          >
            <div
              ref={tableContainerRef}
              className="grid min-h-0 flex-1 grid-cols-1 content-start gap-2.5 overflow-y-auto [scrollbar-width:none] xl:grid-flow-col xl:grid-cols-2 xl:gap-x-6 xl:[grid-template-rows:repeat(var(--rows),auto)]"
              style={
                {
                  scrollBehavior: 'auto',
                  '--rows': Math.ceil(getTop20().length / 2),
                } as React.CSSProperties
              }
            >
              {getTop20().map((entry, index) => (
                <motion.div
                  key={entry.youngId}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className={`flex min-h-[72px] items-center gap-4 rounded-[20px] border px-5 ${
                    index === 0
                      ? 'border-emerald-400/55 bg-[linear-gradient(90deg,rgba(52,211,153,.24),rgba(16,185,129,.06))]'
                      : index === 1
                        ? 'border-[#CBD5E1]/45 bg-[linear-gradient(90deg,rgba(203,213,225,.20),rgba(148,163,184,.04))]'
                        : index === 2
                          ? 'border-[#D97745]/55 bg-[linear-gradient(90deg,rgba(217,119,69,.26),rgba(138,28,69,.08))]'
                          : 'border-white/10 bg-white/[0.04]'
                  }`}
                >
                  <span
                    className={`w-14 font-display text-[38px] font-bold leading-none ${
                      index === 0
                        ? 'text-emerald-300'
                        : index === 1
                          ? 'text-[#E2E8F0]'
                          : index === 2
                            ? 'text-[#F08A4B]'
                            : 'text-white/60'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <Avatar
                    entry={entry}
                    className="h-14 w-14 flex-shrink-0 text-xl"
                    ring={`border-[3px] ${index === 0 ? 'border-emerald-400' : index === 1 ? 'border-[#CBD5E1]' : index === 2 ? 'border-[#D97745]' : 'border-white/20'}`}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-xl font-bold">{entry.youngName}</span>
                    <span className="flex gap-3 text-sm text-white/55">
                      {entry.group && <span>Grupo {entry.group}</span>}
                      <PositionChangeChip entry={entry} />
                    </span>
                  </span>
                  <span className="flex flex-col items-end">
                    <span className="font-display text-[34px] font-bold leading-none">{entry.totalPoints}</span>
                    <span className="text-xs text-white/50">puntos</span>
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </div>,
    document.body
  );
};

export default FullscreenLeaderboard;
