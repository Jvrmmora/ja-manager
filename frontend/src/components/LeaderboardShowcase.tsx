import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useSeason } from '../context/SeasonContext';
import type { ILeaderboardEntry } from '../types';
import SeasonStatsBar from './SeasonStatsBar';
import AvatarPhoto from './ui/AvatarPhoto';
import ImageModal from './ImageModal';

interface LeaderboardShowcaseProps {
  leaderboard: ILeaderboardEntry[];
  onClose: () => void;
  closeLabel?: string;
  /** Acciones extra en la cabecera (p. ej. Compartir). */
  actions?: React.ReactNode;
  /** Resalta a este joven y muestra su puesto abajo (vista compartida). */
  highlightUserId?: string | undefined;
  /** Confeti al mostrar el podio (vista compartida). */
  celebrate?: boolean;
}

const TOP3_DURATION = 12000; // 12s mostrando Top 3
const TOP10_DURATION = 18000; // 18s mostrando Top 20 (más tiempo para scroll)
const SCROLL_START_DELAY = 1200; // 1.2s para que framer-motion termine animaciones

/**
 * Ranking a pantalla completa con rotación Podio ↔ Top 20 y auto-scroll.
 * Lo usan el modo proyector (FullscreenLeaderboard) y la página /ranking que
 * se comparte por WhatsApp. En escritorio se ve igual que el proyector; en
 * móvil compacta cabecera, estadísticas y filas.
 */
const LeaderboardShowcase: React.FC<LeaderboardShowcaseProps> = ({
  leaderboard,
  onClose,
  closeLabel = 'Salir del modo proyector',
  actions,
  highlightUserId,
  celebrate = false,
}) => {
  const [currentView, setCurrentView] = useState<'top3' | 'top10'>('top3');
  // Si alguien desplaza la lista a mano, se detiene la rotación automática
  const [paused, setPaused] = useState(false);
  const [photo, setPhoto] = useState<{ url: string; name: string } | null>(null);
  const { activeSeason, countdown, progressPercent } = useSeason();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);
  const cleanupFnsRef = useRef<Array<() => void>>([]);
  const autoPlay = !paused && !photo;

  // Rotación automática con duración diferente por vista
  useEffect(() => {
    if (!autoPlay) return;

    const timeout = setTimeout(
      () => {
        setCurrentView(prev => (prev === 'top3' ? 'top10' : 'top3'));
      },
      currentView === 'top3' ? TOP3_DURATION : TOP10_DURATION
    );

    return () => clearTimeout(timeout);
  }, [autoPlay, currentView]);

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

    if (currentView !== 'top10') {
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollTop = 0;
      }
      return;
    }
    if (!autoPlay) return;

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
  }, [autoPlay, currentView, cleanupScroll, safeTimeout, safeAnimationFrame]);

  // Salir con ESC (si la foto está abierta, ESC cierra solo la foto)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !photo) {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, photo]);

  // Confeti dorado cada vez que aparece el podio (solo vista compartida)
  useEffect(() => {
    if (!celebrate || currentView !== 'top3' || leaderboard.length === 0) return;
    const timer = setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 75,
        origin: { x: 0.5, y: 0.35 },
        colors: ['#F9A23B', '#FDE68A', '#F26A2E', '#DC3340', '#FFFFFF'],
        gravity: 0.7,
        scalar: 0.9,
        ticks: 220,
        startVelocity: 32,
        disableForReducedMotion: true,
      });
    }, 900);
    return () => clearTimeout(timer);
  }, [celebrate, currentView, leaderboard.length]);

  const pauseAutoPlay = () => {
    if (paused) return;
    cleanupScroll();
    setPaused(true);
  };

  const openPhoto = (url: string, name: string) => setPhoto({ url, name });

  const top3 = leaderboard.slice(0, 3);
  const top20 = leaderboard.slice(0, 20);
  const myIndex = highlightUserId
    ? leaderboard.findIndex(e => e.youngId === highlightUserId)
    : -1;
  const myEntry = myIndex >= 0 ? leaderboard[myIndex] : undefined;
  const pad = (n: number) => n.toString().padStart(2, '0');

  const PositionChangeChip: React.FC<{ entry: ILeaderboardEntry }> = ({ entry }) => {
    const size = 'text-[11px] sm:text-[15px]';
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

  // Podio proporcional a la pantalla (vh y, en móvil, vw) para no dejar huecos ni cortar barras
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
    { entry: top3[1], place: 2, avatarPx: 'clamp(64px, min(12vh, 22vw), 132px)', ring: 'border-4 border-[#CBD5E1]', barPct: 30, bar: 'border-[#CBD5E1]/30 bg-[linear-gradient(180deg,rgba(203,213,225,.3),rgba(203,213,225,.05))]', numSize: 'clamp(40px, 8vh, 88px)', numColor: 'text-[#E2E8F0]', delay: 0.15 },
    { entry: top3[0], place: 1, avatarPx: 'clamp(76px, min(15vh, 27vw), 168px)', ring: 'border-[6px] border-brand-amber', barPct: 40, bar: 'border-brand-amber/55 bg-[linear-gradient(180deg,rgba(249,162,59,.45),rgba(242,106,46,.08))]', numSize: 'clamp(52px, 11vh, 116px)', numColor: 'text-[#FDE68A]', delay: 0.35 },
    { entry: top3[2], place: 3, avatarPx: 'clamp(64px, min(12vh, 22vw), 132px)', ring: 'border-4 border-[#D97745]', barPct: 22, bar: 'border-[#D97745]/35 bg-[linear-gradient(180deg,rgba(217,119,69,.34),rgba(217,119,69,.05))]', numSize: 'clamp(36px, 7vh, 76px)', numColor: 'text-[#F4B58C]', delay: 0.55 },
  ];

  const viewToggle = (extra: string, stretch = false) => (
    <span className={`rounded-full border border-white/10 bg-white/[0.06] p-1 ${extra}`}>
      {(['top3', 'top10'] as const).map(v => (
        <button
          key={v}
          type="button"
          onClick={() => setCurrentView(v)}
          aria-pressed={currentView === v}
          className={`h-10 whitespace-nowrap rounded-full px-[18px] text-sm font-bold transition-colors ${stretch ? 'flex-1' : ''} ${
            currentView === v ? 'bg-brand-amber text-ink-950' : 'text-white/70 hover:text-white'
          }`}
        >
          {v === 'top3' ? 'Podio' : 'Top 20'}
        </button>
      ))}
    </span>
  );

  return (
    <div className="dark relative flex h-full flex-col overflow-hidden bg-ink-950 text-white">
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-[700px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(249,162,59,.24)_0%,rgba(20,11,16,0)_65%)] motion-safe:animate-pulse" />

      {/* Cabecera */}
      <div className="relative flex items-center justify-between gap-3 px-4 pt-5 sm:gap-4 sm:px-6 sm:pt-6 lg:px-12 lg:pt-7">
        <span className="flex min-w-0 items-center gap-3 sm:gap-4">
          <span className="bg-gold flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px] text-ink-950 sm:h-14 sm:w-14 sm:rounded-[18px]">
            <svg className="h-6 w-6 sm:h-7 sm:w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            </svg>
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-display text-[26px] font-bold uppercase leading-none sm:text-3xl lg:text-[40px]">
              <span className="sm:hidden">Ranking</span>
              <span className="hidden sm:inline">Ranking de la temporada</span>
            </span>
            <span className="truncate text-sm text-white/55 sm:text-base">
              {activeSeason?.name || 'Líderes de la temporada'}
            </span>
          </span>
        </span>
        <span className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
          {viewToggle('hidden sm:flex')}
          {actions}
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-white/50 sm:h-12 sm:w-12"
            title="Salir (ESC)"
            aria-label={closeLabel}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </span>
      </div>

      {/* Tiempo hasta el cambio de vista */}
      {autoPlay ? (
        <div className="relative mx-4 mt-3.5 h-[3px] overflow-hidden rounded bg-white/10 sm:mx-6 lg:mx-12">
          <motion.span
            key={currentView}
            className="block h-full bg-[linear-gradient(90deg,#F9A23B,#DC3340)]"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: (currentView === 'top3' ? TOP3_DURATION : TOP10_DURATION) / 1000, ease: 'linear' }}
          />
        </div>
      ) : (
        <div className="relative mx-4 mt-2 flex items-center gap-3 sm:mx-6 lg:mx-12">
          <span className="h-[3px] flex-1 rounded bg-white/10" />
          {paused && (
            <button
              type="button"
              onClick={() => setPaused(false)}
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 text-xs font-semibold text-white/80 transition-colors hover:border-white/40 hover:text-white"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
              Reanudar animación
            </button>
          )}
        </div>
      )}

      {/* Estadísticas: fila completa desde sm; en móvil una línea compacta */}
      <div className="relative hidden px-6 pt-3 sm:block lg:px-12">
        <SeasonStatsBar activeParticipants={leaderboard.length} compact />
      </div>
      <div className="relative flex flex-col gap-3 px-4 pt-3 sm:hidden">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5">
          <span className="flex items-baseline gap-1.5">
            <span className="font-display text-2xl font-bold leading-none">{leaderboard.length}</span>
            <span className="text-xs text-white/55">participantes</span>
          </span>
          {countdown.isExpired ? (
            <span className="font-display text-lg font-semibold text-red-300">Finalizada</span>
          ) : (
            <span className="flex items-baseline gap-1 font-display text-lg font-semibold leading-none tabular-nums">
              <span className="text-brand-amber">{countdown.days}d</span>
              <span>{pad(countdown.hours)}h</span>
              <span>{pad(countdown.minutes)}m</span>
              <span className="text-white/60">{pad(countdown.seconds)}s</span>
            </span>
          )}
        </div>
        <span className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <span
            className="block h-full rounded-full bg-[linear-gradient(90deg,#F9A23B,#DC3340)]"
            style={{ width: `${progressPercent}%` }}
          />
        </span>
        {viewToggle('flex', true)}
      </div>

      <AnimatePresence mode="wait">
        {currentView === 'top3' ? (
          <motion.div
            key="top3-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="relative mt-2 grid min-h-0 flex-1 grid-cols-3 items-stretch gap-2 px-4 sm:gap-6 sm:px-6 lg:gap-8 lg:px-12"
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
                        style={{ width: 'clamp(36px, 6vh, 64px)', height: 'auto' }}
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
                    <AvatarPhoto
                      name={entry.youngName}
                      image={entry.profileImage}
                      className={ring}
                      style={{ width: avatarPx, height: avatarPx, fontSize: `calc(${avatarPx} * 0.36)` }}
                      onOpen={openPhoto}
                    />
                    <span
                      className="line-clamp-2 max-w-full flex-shrink-0 break-words text-center font-bold leading-tight"
                      style={{
                        fontSize:
                          place === 1
                            ? 'clamp(15px, min(3.6vh, 4.6vw), 36px)'
                            : 'clamp(14px, min(3.1vh, 4vw), 30px)',
                      }}
                    >
                      {entry.youngName}
                      {entry.youngId === highlightUserId && <YouChip />}
                    </span>
                    <span className="flex flex-shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[11px] text-white/60 sm:text-[15px]">
                      {entry.group && <span>Grupo {entry.group}</span>}
                      <PositionChangeChip entry={entry} />
                    </span>
                  </div>
                  <span
                    className={`flex w-full flex-shrink-0 flex-col items-center justify-center rounded-t-[20px] border border-b-0 sm:rounded-t-[28px] ${bar}`}
                    style={{ height: `${barPct}%` }}
                  >
                    <span className={`font-display font-bold leading-none ${numColor}`} style={{ fontSize: numSize }}>
                      {place}
                    </span>
                    <span className="mt-1 text-base font-bold sm:text-xl lg:text-2xl">{entry.totalPoints} pts</span>
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
            className="relative flex min-h-0 flex-1 flex-col px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-5 lg:px-12"
          >
            <div
              ref={tableContainerRef}
              onWheel={pauseAutoPlay}
              onTouchStart={pauseAutoPlay}
              className="grid min-h-0 flex-1 grid-cols-1 content-start gap-2 overflow-y-auto [scrollbar-width:none] sm:gap-2.5 xl:grid-flow-col xl:grid-cols-2 xl:gap-x-6 xl:[grid-template-rows:repeat(var(--rows),auto)]"
              style={
                {
                  scrollBehavior: 'auto',
                  '--rows': Math.ceil(top20.length / 2),
                } as React.CSSProperties
              }
            >
              {top20.map((entry, index) => {
                const isMe = entry.youngId === highlightUserId;
                return (
                  <motion.div
                    key={entry.youngId}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className={`flex min-h-[62px] items-center gap-3 rounded-[18px] border px-3.5 sm:min-h-[72px] sm:gap-4 sm:rounded-[20px] sm:px-5 ${
                      index === 0
                        ? 'border-emerald-400/55 bg-[linear-gradient(90deg,rgba(52,211,153,.24),rgba(16,185,129,.06))]'
                        : index === 1
                          ? 'border-[#CBD5E1]/45 bg-[linear-gradient(90deg,rgba(203,213,225,.20),rgba(148,163,184,.04))]'
                          : index === 2
                            ? 'border-[#D97745]/55 bg-[linear-gradient(90deg,rgba(217,119,69,.26),rgba(138,28,69,.08))]'
                            : 'border-white/10 bg-white/[0.04]'
                    } ${isMe ? 'ring-2 ring-brand-amber' : ''}`}
                  >
                    <span
                      className={`w-9 flex-shrink-0 font-display text-[28px] font-bold leading-none sm:w-14 sm:text-[38px] ${
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
                    <AvatarPhoto
                      name={entry.youngName}
                      image={entry.profileImage}
                      className={`h-11 w-11 text-base sm:h-14 sm:w-14 sm:text-xl border-[3px] ${index === 0 ? 'border-emerald-400' : index === 1 ? 'border-[#CBD5E1]' : index === 2 ? 'border-[#D97745]' : 'border-white/20'}`}
                      onOpen={openPhoto}
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:gap-1">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-base font-bold sm:text-xl">{entry.youngName}</span>
                        {isMe && <YouChip />}
                      </span>
                      <span className="flex gap-2 text-xs text-white/55 sm:gap-3 sm:text-sm">
                        {entry.group && <span>Grupo {entry.group}</span>}
                        <PositionChangeChip entry={entry} />
                      </span>
                    </span>
                    <span className="flex flex-col items-end">
                      <span className="font-display text-2xl font-bold leading-none sm:text-[34px]">{entry.totalPoints}</span>
                      <span className="text-[11px] text-white/50 sm:text-xs">puntos</span>
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tu puesto (vista compartida) */}
      {highlightUserId && (
        <div className="relative flex-shrink-0 border-t border-white/10 bg-black/30 px-4 py-3 sm:px-6 lg:px-12">
          {myEntry ? (
            <span className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-brand-amber">Tu puesto</span>
              <span className="font-display text-2xl font-bold leading-none">#{myIndex + 1}</span>
              <span className="text-sm text-white/70">{myEntry.totalPoints} pts</span>
              <span className="ml-auto">
                <PositionChangeChip entry={myEntry} />
              </span>
            </span>
          ) : (
            <span className="text-sm text-white/70">
              Aún no tienes puntos esta temporada. <strong className="text-brand-amber">¡Asiste este sábado y entra al ranking!</strong>
            </span>
          )}
        </div>
      )}

      {photo && (
        <ImageModal
          isOpen
          onClose={() => setPhoto(null)}
          imageUrl={photo.url}
          altText={`Foto de perfil de ${photo.name}`}
        />
      )}
    </div>
  );
};

const YouChip: React.FC = () => (
  <span className="ml-1.5 inline-flex flex-shrink-0 rounded-full bg-amber-400 px-1.5 py-0.5 align-middle text-[10px] font-extrabold leading-none tracking-wide text-gray-900">
    TÚ
  </span>
);

export default LeaderboardShowcase;
