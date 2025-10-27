import React from 'react';

interface StreakBadgeProps {
  streak: number;
  isActive: boolean;
  compact?: boolean;
}

const StreakBadge: React.FC<StreakBadgeProps> = ({
  streak,
  isActive,
  compact = false,
}) => {
  // No mostrar si no hay racha
  if (streak === 0 && isActive) return null;

  return (
    <div
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-1 rounded-full text-xs font-semibold
        ${
          isActive
            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
        }
      `}
    >
      {/* Icono */}
      <span className="material-symbols-rounded text-sm">
        {isActive ? 'local_fire_department' : 'close'}
      </span>

      {/* Texto */}
      {!compact && (
        <span>
          {isActive
            ? `${streak} semana${streak !== 1 ? 's' : ''}`
            : 'Racha perdida'}
        </span>
      )}

      {/* Versión compacta solo muestra el número */}
      {compact && isActive && <span>{streak}</span>}
    </div>
  );
};

export default StreakBadge;
