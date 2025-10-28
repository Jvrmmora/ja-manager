import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { pointsService } from '../services/pointsService';
import type { IPointsBreakdown } from '../types';
import { hasDeepChanged } from '../hooks/useDeepCompareEffect';

interface PointsStatsCardsProps {
  youngId: string;
  onViewDetails: () => void;
  onViewRanking?: () => void;
}

const PointsStatsCards: React.FC<PointsStatsCardsProps> = ({
  youngId,
  onViewDetails,
  onViewRanking,
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

  // Obtener estilos según posición en ranking
  const getRankingStyles = (rank: number | undefined) => {
    if (!rank) {
      return {
        gradient:
          'from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700',
        icon: 'military_tech',
        badge: null,
        animation: '',
      };
    }

    if (rank === 1) {
      return {
        gradient:
          'from-yellow-400 to-amber-500 dark:from-yellow-500 dark:to-amber-600',
        icon: 'emoji_events',
        badge: '¡Primer Lugar!',
        animation: 'animate-shimmer-gold',
      };
    }

    if (rank === 2) {
      return {
        gradient:
          'from-gray-300 to-gray-500 dark:from-gray-400 dark:to-gray-600',
        icon: 'workspace_premium',
        badge: 'Segundo Lugar',
        animation: 'animate-shimmer-silver',
      };
    }

    if (rank === 3) {
      return {
        gradient:
          'from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-700',
        icon: 'stars',
        badge: 'Tercer Lugar',
        animation: 'animate-shimmer-bronze',
      };
    }

    return {
      gradient:
        'from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700',
      icon: 'military_tech',
      badge: null,
      animation: '',
    };
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto mb-8">
        {/* Skeleton Cards */}
        {[1, 2].map(i => (
          <div
            key={i}
            className="bg-gray-200 dark:bg-gray-700 rounded-xl p-6 animate-pulse"
          >
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 mb-4"></div>
            <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-16 mb-2"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!breakdown) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card de Puntos Totales */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="group relative bg-gradient-to-br from-amber-400 to-yellow-500 dark:from-amber-500 dark:to-yellow-600 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden"
        >
          {/* Efecto de brillo sutil */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-rounded text-white text-2xl">
                star
              </span>
              <h3 className="text-sm font-medium text-white/90 uppercase tracking-wide">
                Puntos Totales
              </h3>
            </div>

            {/* Puntos */}
            <div className="mb-3">
              <div className="text-5xl font-bold text-white mb-1">
                {breakdown.total}
              </div>
              <p className="text-sm text-white/80">
                {breakdown.transactionCount}{' '}
                {breakdown.transactionCount === 1
                  ? 'transacción'
                  : 'transacciones'}
              </p>
            </div>

            {/* Botón Ver Detalle */}
            <button
              onClick={onViewDetails}
              className="inline-flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white transition-colors group/btn"
            >
              <span>Ver Desglose</span>
              <span className="material-symbols-rounded text-lg transform group-hover/btn:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </button>
          </div>
        </motion.div>

        {/* Card de Ranking */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          onClick={onViewRanking}
          className={`group relative bg-gradient-to-br ${
            position && position.totalParticipants > 0
              ? getRankingStyles(position?.rank).gradient
              : 'from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700'
          } rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden ${
            position && position.totalParticipants > 0
              ? getRankingStyles(position?.rank).animation
              : ''
          } ${onViewRanking ? 'cursor-pointer hover:scale-105' : ''}`}
        >
          {/* Borde animado para top 3 */}
          {position && position.totalParticipants > 0 && position.rank <= 3 && (
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer-border"></div>
          )}

          {/* Efecto de brillo sutil */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-rounded text-white text-2xl">
                {position && position.totalParticipants > 0
                  ? getRankingStyles(position?.rank).icon
                  : 'military_tech'}
              </span>
              <h3 className="text-sm font-medium text-white/90 uppercase tracking-wide">
                Tu Posición
              </h3>
            </div>

            {/* Ranking */}
            {position ? (
              <div className="mb-3">
                <div className="text-5xl font-bold text-white mb-1">
                  #{position.totalParticipants > 0 ? position.rank : 0}
                </div>
                <p className="text-sm text-white/80">
                  de {position.totalParticipants}{' '}
                  {position.totalParticipants === 1
                    ? 'participante'
                    : 'participantes'}
                </p>
              </div>
            ) : (
              <div className="mb-3">
                <div className="text-3xl font-bold text-white mb-1">—</div>
                <p className="text-sm text-white/80">Sin ranking disponible</p>
              </div>
            )}

            {/* Badge si es top 3 */}
            {position &&
              position.totalParticipants > 0 &&
              getRankingStyles(position.rank).badge && (
                <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <span className="material-symbols-rounded text-white text-lg">
                    {getRankingStyles(position.rank).icon}
                  </span>
                  <span className="text-xs font-semibold text-white">
                    {getRankingStyles(position.rank).badge}
                  </span>
                </div>
              )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PointsStatsCards;
