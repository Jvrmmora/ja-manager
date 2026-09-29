import React, { useState, useEffect } from 'react';
import { pointsService } from '../services/pointsService';
import type { IPointsBreakdown } from '../types';

interface PointsCardProps {
  youngId: string;
  totalPoints?: number; // ✅ Puntos totales pre-cargados (opcional)
  onClick?: () => void;
}

const PointsCard: React.FC<PointsCardProps> = ({
  youngId,
  totalPoints,
  onClick,
}) => {
  const [breakdown, setBreakdown] = useState<IPointsBreakdown | null>(null);
  const [loading, setLoading] = useState(totalPoints === undefined); // Solo cargar si no hay totalPoints
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Solo cargar breakdown si no tenemos totalPoints
    if (youngId && totalPoints === undefined) {
      loadPoints();
    }
  }, [youngId, totalPoints]);

  const loadPoints = async () => {
    if (!youngId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await pointsService.getBreakdown(youngId);
      setBreakdown(data);
    } catch (err: any) {
      console.error('Error loading points:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!youngId) {
    return null;
  }

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sand-100 dark:bg-white/10 animate-pulse">
        <span className="material-symbols-rounded text-sm text-gray-400">
          star
        </span>
        <span className="text-sm text-gray-400">Cargando...</span>
      </div>
    );
  }

  // Si hay error en la carga pero tenemos totalPoints, mostrar solo totalPoints sin tooltip
  if (error && totalPoints === undefined) {
    return null;
  }

  // Usar totalPoints si está disponible, sino usar breakdown
  const displayPoints =
    totalPoints !== undefined ? totalPoints : breakdown?.total || 0;
  const hasBreakdown = breakdown !== null;

  return (
    <div className="relative inline-block">
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex h-[30px] items-center gap-1.5 rounded-full bg-sand-100 px-2.5 font-display text-[15px] font-semibold text-brand-ember transition-transform duration-200 hover:scale-105 dark:bg-brand-orange/15 dark:text-brand-amber ${
          onClick ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        {/* Icono de estrella */}
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>

        {/* Puntos totales */}
        <span>{displayPoints}</span>
      </button>

      {/* Tooltip personalizado - Solo mostrar si tenemos breakdown */}
      {showTooltip && hasBreakdown && breakdown && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="bg-ink-950 text-white px-3 py-2 rounded-xl shadow-xl text-xs whitespace-nowrap">
            <div className="space-y-1">
              <div className="flex justify-between gap-4">
                <span>Asistencias:</span>
                <span className="font-semibold">
                  {breakdown.byType.ATTENDANCE} pts
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Actividades:</span>
                <span className="font-semibold">
                  {breakdown.byType.ACTIVITY} pts
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Referidos:</span>
                <span className="font-semibold">
                  {breakdown.byType.REFERRER_BONUS} pts
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Bono Referido:</span>
                <span className="font-semibold">
                  {breakdown.byType.REFERRED_BONUS} pts
                </span>
              </div>
              {breakdown.season && (
                <>
                  <div className="border-t border-white/15 my-1.5"></div>
                  <div className="text-white/55 text-center">
                    {breakdown.season.name}
                  </div>
                </>
              )}
            </div>
            {/* Flecha del tooltip */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="border-4 border-transparent border-t-ink-950"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PointsCard;
