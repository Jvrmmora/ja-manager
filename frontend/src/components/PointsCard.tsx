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
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 animate-pulse">
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
        className={`
          inline-flex items-center gap-2 
          px-3 py-1.5 rounded-full
          bg-gradient-to-r from-amber-400 to-yellow-500
          text-white font-semibold
          hover:from-amber-500 hover:to-yellow-600
          transition-all duration-200
          transform hover:scale-105
          shadow-md hover:shadow-lg
          ${onClick ? 'cursor-pointer' : 'cursor-default'}
        `}
      >
        {/* Icono de estrella */}
        <span className="material-symbols-rounded text-lg">star</span>

        {/* Puntos totales */}
        <span className="text-sm">{displayPoints} pts</span>
      </button>

      {/* Tooltip personalizado - Solo mostrar si tenemos breakdown */}
      {showTooltip && hasBreakdown && breakdown && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="bg-gray-800 dark:bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs whitespace-nowrap">
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
                  <div className="border-t border-gray-600 my-1.5"></div>
                  <div className="text-gray-400 text-center">
                    {breakdown.season.name}
                  </div>
                </>
              )}
            </div>
            {/* Flecha del tooltip */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="border-4 border-transparent border-t-gray-800 dark:border-t-gray-900"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PointsCard;
