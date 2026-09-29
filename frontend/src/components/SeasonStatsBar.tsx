import React from 'react';
import { useSeason } from '../context/SeasonContext';

interface SeasonStatsBarProps {
  activeParticipants: number;
  /** Fila delgada de una sola línea (modo proyector) */
  compact?: boolean;
}

const SeasonStatsBar: React.FC<SeasonStatsBarProps> = ({
  activeParticipants,
  compact = false,
}) => {
  const { activeSeason, countdown, progressPercent } = useSeason();

  const formatTime = (value: number): string => {
    return value.toString().padStart(2, '0');
  };

  if (compact) {
    const chip =
      'flex items-baseline gap-2.5 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-2.5';
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className={chip}>
          <span className="text-sm text-white/60">Participantes activos</span>
          <span className="ml-auto font-display text-3xl font-bold leading-none text-white">
            {activeParticipants}
          </span>
        </div>
        <div className={`${chip} !items-center`}>
          <span className="text-sm text-white/60">Tiempo restante</span>
          {countdown.isExpired ? (
            <span className="ml-auto font-display text-2xl font-semibold leading-none text-red-300">
              Finalizada
            </span>
          ) : (
            <span className="ml-auto flex gap-1.5">
              {(
                [
                  [countdown.days, 'Días', 'text-brand-amber'],
                  [countdown.hours, 'Hrs', 'text-white'],
                  [countdown.minutes, 'Min', 'text-white'],
                  [countdown.seconds, 'Seg', 'text-white'],
                ] as const
              ).map(([value, unit, tone]) => (
                <span
                  key={unit}
                  className="flex min-w-[52px] flex-col items-center rounded-xl border border-white/5 bg-white/[0.05] px-2 py-1.5"
                >
                  <span className={`font-display text-2xl font-semibold leading-none ${tone}`}>
                    {formatTime(value)}
                  </span>
                  <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white/45">
                    {unit}
                  </span>
                </span>
              ))}
            </span>
          )}
        </div>
        <div className={`${chip} flex-col !items-stretch gap-1.5`}>
          <span className="flex items-baseline justify-between text-sm text-white/60">
            {activeSeason?.name || 'Avance de temporada'}
            <strong className="font-display text-xl leading-none text-white">
              {progressPercent.toFixed(1)}%
            </strong>
          </span>
          <span className="block h-2 overflow-hidden rounded-full bg-white/10">
            <span
              className="block h-full rounded-full bg-[linear-gradient(90deg,#F9A23B,#DC3340,#8A1C45)]"
              style={{ width: `${progressPercent}%` }}
            />
          </span>
        </div>
      </div>
    );
  }

  const card =
    'rounded-2xl border border-white/10 bg-white/[0.04] p-5';
  const label = 'text-[13px] font-medium text-white/60';
  const timeBox = (value: number, unit: string, tone: string) => (
    <div className="flex min-w-0 flex-1 flex-col items-center rounded-xl border border-white/5 bg-white/[0.04] px-1 py-2">
      <span className={`font-display text-2xl font-semibold leading-none ${tone}`}>
        {formatTime(value)}
      </span>
      <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white/45">
        {unit}
      </span>
    </div>
  );

  return (
    <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
      <div className={card}>
        <p className={`m-0 ${label}`}>Participantes activos</p>
        <p className="m-0 mt-2 font-display text-[44px] font-bold leading-none text-white">
          {activeParticipants}
        </p>
      </div>

      <div className={card}>
        <p className={`m-0 ${label}`}>Tiempo restante</p>
        {countdown.isExpired ? (
          <p className="m-0 mt-3 font-display text-xl font-semibold text-red-300">
            Temporada finalizada
          </p>
        ) : (
          <div className="mt-3 flex gap-2">
            {timeBox(countdown.days, 'Días', 'text-brand-amber')}
            {timeBox(countdown.hours, 'Hrs', 'text-white')}
            {timeBox(countdown.minutes, 'Min', 'text-white')}
            {timeBox(countdown.seconds, 'Seg', 'text-white')}
          </div>
        )}
      </div>

      <div className={card}>
        <div className="flex items-baseline justify-between gap-2">
          <p className={`m-0 ${label}`}>Avance de temporada</p>
          <strong className="font-display text-xl leading-none text-white">
            {progressPercent.toFixed(1)}%
          </strong>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#F9A23B,#DC3340,#8A1C45)] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {activeSeason && (
          <p className="m-0 mt-3 text-xs text-white/45">
            {new Date(activeSeason.startDate).toLocaleDateString('es-ES')} –{' '}
            {new Date(activeSeason.endDate).toLocaleDateString('es-ES')}
          </p>
        )}
      </div>
    </div>
  );
};

export default SeasonStatsBar;
