import React from 'react';
import { useSeason } from '../context/SeasonContext';

interface SeasonStatsBarProps {
  activeParticipants: number;
}

const SeasonStatsBar: React.FC<SeasonStatsBarProps> = ({
  activeParticipants,
}) => {
  const { activeSeason, countdown, progressPercent } = useSeason();

  const formatTime = (value: number): string => {
    return value.toString().padStart(2, '0');
  };

  return (
    <div className="mb-6 space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Registered Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Participantes Activos
              </p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {activeParticipants}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <span className="material-symbols-rounded text-5xl text-blue-600 dark:text-blue-400">
                group
              </span>
            </div>
          </div>
        </div>

        {/* Remaining Time Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-rounded text-2xl text-amber-600 dark:text-amber-400">
              schedule
            </span>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Tiempo Restante
            </p>
          </div>
          {countdown.isExpired ? (
            <p className="text-lg font-semibold text-red-600 dark:text-red-400">
              Temporada Finalizada
            </p>
          ) : (
            <div className="flex items-center justify-center gap-1.5">
              {/* Días */}
              <div className="flex flex-col items-center bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2.5 py-2 min-w-[55px]">
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono leading-none">
                  {formatTime(countdown.days)}
                </div>
                <div className="text-[10px] font-semibold text-blue-600/70 dark:text-blue-400/70 mt-1 uppercase tracking-wider">
                  Días
                </div>
              </div>

              {/* Separador */}
              <div className="text-xl font-bold text-gray-400 dark:text-gray-600 self-center -mt-3">
                :
              </div>

              {/* Horas */}
              <div className="flex flex-col items-center bg-green-50 dark:bg-green-900/20 rounded-lg px-2.5 py-2 min-w-[55px]">
                <div className="text-2xl font-black text-green-600 dark:text-green-400 font-mono leading-none">
                  {formatTime(countdown.hours)}
                </div>
                <div className="text-[10px] font-semibold text-green-600/70 dark:text-green-400/70 mt-1 uppercase tracking-wider">
                  Hrs
                </div>
              </div>

              {/* Separador */}
              <div className="text-xl font-bold text-gray-400 dark:text-gray-600 self-center -mt-3">
                :
              </div>

              {/* Minutos */}
              <div className="flex flex-col items-center bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2.5 py-2 min-w-[55px]">
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono leading-none">
                  {formatTime(countdown.minutes)}
                </div>
                <div className="text-[10px] font-semibold text-amber-600/70 dark:text-amber-400/70 mt-1 uppercase tracking-wider">
                  Min
                </div>
              </div>

              {/* Separador */}
              <div className="text-xl font-bold text-gray-400 dark:text-gray-600 self-center -mt-3">
                :
              </div>

              {/* Segundos */}
              <div className="flex flex-col items-center bg-purple-50 dark:bg-purple-900/20 rounded-lg px-2.5 py-2 min-w-[55px]">
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono leading-none">
                  {formatTime(countdown.seconds)}
                </div>
                <div className="text-[10px] font-semibold text-purple-600/70 dark:text-purple-400/70 mt-1 uppercase tracking-wider">
                  Seg
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Season Progress Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-rounded text-2xl text-emerald-600 dark:text-emerald-400">
                calendar_month
              </span>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avance de Temporada
              </p>
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-rounded text-xl text-emerald-600 dark:text-emerald-400">
                trending_up
              </span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {progressPercent.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>

          {/* Season Info */}
          {activeSeason && (
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              <p className="font-semibold text-gray-700 dark:text-gray-300">
                {activeSeason.name}
              </p>
              <p className="mt-1">
                {new Date(activeSeason.startDate).toLocaleDateString('es-ES')} -{' '}
                {new Date(activeSeason.endDate).toLocaleDateString('es-ES')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Optional: Additional info bar */}
      {activeSeason?.description && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-4 border border-blue-200 dark:border-gray-600">
          <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
            {activeSeason.description}
          </p>
        </div>
      )}
    </div>
  );
};

export default SeasonStatsBar;
