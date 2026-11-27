import { useEffect, useState } from 'react';
import { seasonService } from '../../../services/seasonService';
import type { ISeason } from '../../../types';
import { getCurrentDateColombia } from '../../../utils/dateUtils';

const DAY_MS = 86_400_000;

// Las fechas de temporada son fechas de calendario: se usa solo YYYY-MM-DD
// para que la zona horaria no las corra un día.
const toDay = (value: string | Date) =>
  Date.parse(`${new Date(value).toISOString().slice(0, 10)}T00:00:00Z`);

const shortDate = (value: string | Date) =>
  new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(toDay(value));

const getProgress = (season: ISeason) => {
  const start = toDay(season.startDate);
  const end = toDay(season.endDate);
  const today = toDay(getCurrentDateColombia());
  const percent = ((today - start) / Math.max(end - start, DAY_MS)) * 100;
  return {
    daysLeft: Math.round((end - today) / DAY_MS),
    percent: Math.min(100, Math.max(0, Math.round(percent))),
  };
};

const PRIZE_PLACES = [
  { key: 'first', place: 1, badge: 'bg-[#FDE68A]' },
  { key: 'second', place: 2, badge: 'bg-gray-200' },
  { key: 'third', place: 3, badge: 'bg-[#F0A875]' },
] as const;

const CARD_CLASS =
  'h-full rounded-[28px] border border-brand-amber/35 bg-[linear-gradient(165deg,#3A1426_0%,#1E1218_62%)] p-7';

// Tarjeta de la temporada activa. Sin temporada (404) o si falla la consulta,
// muestra un texto genérico.
export default function SeasonCard() {
  const [season, setSeason] = useState<ISeason | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    seasonService
      .getActive()
      .catch(() => null)
      .then(active => {
        if (!alive) return;
        setSeason(active);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className={`${CARD_CLASS} min-h-[380px] motion-safe:animate-pulse`} aria-hidden="true" />
    );
  }

  if (!season) {
    return (
      <div className={`${CARD_CLASS} flex min-h-[380px] flex-col items-center justify-center gap-4 text-center`}>
        <h3 className="m-0 font-display text-3xl font-bold uppercase text-white">
          Se viene una nueva temporada
        </h3>
        <p className="m-0 max-w-xs text-[15px] leading-relaxed text-white/75">
          Regístrate desde ya para arrancar con todos. Los premios se anuncian
          al abrir la temporada.
        </p>
      </div>
    );
  }

  const { daysLeft, percent } = getProgress(season);
  const prizes = PRIZE_PLACES.map(p => ({
    ...p,
    text: season.prizes?.[p.key]?.trim(),
  })).filter(p => p.text);

  return (
    <div className={`${CARD_CLASS} flex flex-col gap-5`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#FDE68A]">
          Temporada actual
        </span>
        <span className="inline-flex h-7 items-center rounded-full bg-emerald-500/15 px-3 text-xs font-extrabold text-emerald-300">
          En curso
        </span>
      </div>
      <h3 className="m-0 font-display text-[34px] font-bold uppercase leading-tight text-white">
        {season.name}
      </h3>
      {daysLeft > 0 ? (
        <p className="m-0 flex items-end gap-3">
          <span className="font-display text-7xl font-bold leading-none text-brand-amber">
            {daysLeft}
          </span>
          <span className="max-w-[8rem] text-[15px] font-semibold leading-snug text-white/80">
            {daysLeft === 1 ? 'día para el cierre' : 'días para el cierre'}
          </span>
        </p>
      ) : (
        <p className="m-0 font-display text-3xl font-semibold uppercase text-brand-amber">
          {daysLeft === 0 ? 'Hoy cierra' : 'En su recta final'}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <div
          role="progressbar"
          aria-label="Avance de la temporada"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-3 overflow-hidden rounded-full bg-white/10"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-amber to-[#DC3340]"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-white/70">
          <span>{shortDate(season.startDate)}</span>
          <span>{shortDate(season.endDate)}</span>
        </div>
      </div>
      {prizes.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {prizes.map(prize => (
            <li key={prize.key} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] px-3.5 py-2.5">
              <span
                aria-label={`Puesto ${prize.place}`}
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full font-display text-lg font-bold text-ink-950 ${prize.badge}`}
              >
                {prize.place}
              </span>
              <span className="min-w-0 break-words text-[15px] font-semibold text-white">
                {prize.text}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-[15px] leading-relaxed text-white/75">
          Los premios para el top 3 se anuncian pronto.
        </p>
      )}
    </div>
  );
}
