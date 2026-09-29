import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { pointsService } from '../services/pointsService';
import type { ILeaderboardEntry, IPointsBreakdown } from '../types';
import { hasDeepChanged } from '../hooks/useDeepCompareEffect';

interface PointsStatsCardsProps {
  youngId: string;
  onViewDetails: () => void;
  onViewRanking?: () => void;
  topThree?: ILeaderboardEntry[];
}

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map(p => p.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

const PointsStatsCards: React.FC<PointsStatsCardsProps> = ({
  youngId,
  onViewDetails,
  onViewRanking,
  topThree,
}) => {
  const [breakdown, setBreakdown] = useState<IPointsBreakdown | null>(null);
  const [position, setPosition] = useState<{
    rank: number;
    totalParticipants: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Polling cada 15 segundos (solo actualiza si hay cambios)
  useEffect(() => {
    loadData();

    // Configurar intervalo de 15 segundos
    const interval = setInterval(() => {
      loadData(false); // No mostrar loading en polling
    }, 15000); // 15 segundos

    return () => clearInterval(interval);
  }, [youngId]);

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const [breakdownData, positionData] = await Promise.all([
        pointsService.getBreakdown(youngId),
        pointsService.getPosition(youngId).catch(() => null),
      ]);

      // Solo actualizar si hay cambios reales (evita re-renders innecesarios)
      if (hasDeepChanged(breakdown, breakdownData)) {
        setBreakdown(breakdownData);
      }

      if (hasDeepChanged(position, positionData)) {
        setPosition(positionData);
      }
    } catch (error) {
      console.error('Error cargando estadísticas de puntos:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const rankBadge = (rank?: number) => {
    if (rank === 1)
      return { label: '¡Primer Lugar!', cls: 'from-[#F9A23B] via-[#FDE68A] to-[#F9A23B]' };
    if (rank === 2)
      return { label: 'Segundo Lugar', cls: 'from-[#CBD5E1] via-[#F8FAFC] to-[#CBD5E1]' };
    if (rank === 3)
      return { label: 'Tercer Lugar', cls: 'from-[#D97745] via-[#F4B58C] to-[#D97745]' };
    return null;
  };

  if (loading) {
    return (
      <>
        {[1, 2].map(i => (
          <div
            key={i}
            className="h-[260px] rounded-[28px] border border-sand-200 bg-white animate-pulse dark:border-white/10 dark:bg-ink-900"
          />
        ))}
      </>
    );
  }

  if (!breakdown) {
    return null;
  }

  const hasRank = !!position && position.rank > 0 && position.totalParticipants > 0;
  const badge = hasRank ? rankBadge(position?.rank) : null;
  const podiumOrder = [topThree?.[1], topThree?.[0], topThree?.[2]];
  const podiumStyle = [
    { ring: 'border-[#CBD5E1]', bar: 'h-[34px] bg-[#CBD5E1]/20 text-[#CBD5E1]', size: 'h-10 w-10', n: 2 },
    { ring: 'border-brand-amber', bar: 'h-[50px] bg-brand-amber/25 text-brand-amber', size: 'h-12 w-12', n: 1 },
    { ring: 'border-[#D97745]', bar: 'h-6 bg-[#D97745]/20 text-[#E8A27A]', size: 'h-10 w-10', n: 3 },
  ];

  return (
    <>
      {/* Puntos totales */}
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-3.5 rounded-[28px] border border-sand-200 bg-white p-6 sm:p-7 text-left shadow-[0_20px_40px_-30px_rgba(78,15,58,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_56px_-28px_rgba(78,15,58,0.45)] dark:border-white/10 dark:bg-ink-900"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold text-cocoa-500 dark:text-white/65">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sand-100 text-brand-ember dark:bg-brand-orange/15 dark:text-brand-amber">
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </span>
          Puntos Totales
        </span>
        <span className="text-fire font-display text-6xl sm:text-7xl font-bold leading-none">
          {breakdown.total}
        </span>
        <span className="text-sm text-cocoa-500 dark:text-white/60">
          {breakdown.transactionCount}{' '}
          {breakdown.transactionCount === 1 ? 'transacción' : 'transacciones'}
        </span>
        <button
          onClick={onViewDetails}
          className="group/btn mt-auto inline-flex items-center gap-1.5 self-start pt-1 text-[15px] font-semibold text-brand-deep hover:text-brand-wine dark:text-brand-amber"
        >
          Ver Desglose
          <svg className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </motion.article>

      {/* Ranking */}
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="order-first md:order-none relative flex flex-col gap-5 overflow-hidden rounded-[28px] bg-ink-900 p-6 sm:p-7 text-left text-white shadow-[0_30px_60px_-30px_rgba(20,11,16,0.7)] transition-transform duration-300 hover:-translate-y-1 dark:border dark:border-white/10"
      >
        <div className="pointer-events-none absolute -right-28 -top-40 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,rgba(249,162,59,.3)_0%,rgba(30,18,24,0)_65%)]" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-2.5 text-sm font-semibold text-white/70">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-amber/15 text-brand-amber">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                </svg>
              </span>
              Tu Posición
            </span>
            {position ? (
              hasRank ? (
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-display text-6xl sm:text-7xl font-bold leading-none text-brand-amber">
                    #{position.rank}
                  </span>
                  <span className="text-[15px] text-white/60">
                    de {position.totalParticipants}{' '}
                    {position.totalParticipants === 1 ? 'participante' : 'participantes'}
                  </span>
                </span>
              ) : (
                <span className="flex flex-col gap-1">
                  <span className="font-display text-5xl font-bold leading-none text-brand-amber">#0</span>
                  <span className="max-w-xs text-sm text-white/65">
                    Sin puntos aún. ¡Participa en actividades para subir de posición!
                  </span>
                </span>
              )
            ) : (
              <span className="flex flex-col gap-1">
                <span className="font-display text-5xl font-bold leading-none text-white/70">—</span>
                <span className="text-sm text-white/65">Sin ranking disponible</span>
              </span>
            )}
            {badge && (
              <span
                className={`animate-shimmer-border inline-flex self-start h-8 items-center rounded-full bg-gradient-to-r px-3.5 text-[13px] font-bold text-ink-950 ${badge.cls}`}
              >
                {badge.label}
              </span>
            )}
          </div>

          {topThree && topThree.length > 0 && (
            <div className="hidden sm:flex items-end gap-1.5 pt-2" aria-hidden="true">
              {podiumOrder.map((entry, i) =>
                entry ? (
                  <span key={entry.youngId} className="flex flex-col items-center gap-1.5">
                    <span
                      className={`${podiumStyle[i].size} overflow-hidden rounded-full border-2 ${podiumStyle[i].ring} bg-ink-800 flex items-center justify-center text-xs font-bold`}
                    >
                      {entry.profileImage ? (
                        <img src={entry.profileImage} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initials(entry.youngName)
                      )}
                    </span>
                    <span
                      className={`flex w-11 items-center justify-center rounded-t-lg font-display text-[15px] ${podiumStyle[i].bar}`}
                    >
                      {podiumStyle[i].n}
                    </span>
                  </span>
                ) : null
              )}
            </div>
          )}
        </div>

        {onViewRanking && (
          <button
            onClick={onViewRanking}
            className="bg-gold relative mt-auto flex h-[60px] items-center justify-center gap-3 rounded-[18px] font-display text-lg sm:text-[22px] font-semibold uppercase tracking-[0.06em] text-ink-950 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-10px_rgba(249,162,59,0.8)] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-amber/50"
          >
            <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
            Ver ranking de la temporada
            <svg className="hidden sm:block h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        )}
      </motion.article>
    </>
  );
};

export default PointsStatsCards;
