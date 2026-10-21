import React, { useEffect, useMemo, useState } from 'react';
import {
  getAttendanceCalendar,
  type AttendanceCalendarDay,
} from '../services/api';
import { getCurrentDateColombia } from '../utils/dateUtils';

interface AttendanceYearCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
  refreshTrigger?: number;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
// La semana empieza en domingo (convención del proyecto)
const WEEKDAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

// Colores validados (CVD y contraste) para claro y oscuro
const KIND_STYLE = {
  CULTO: {
    label: 'Culto joven (sábado)',
    filled: 'bg-[#E8590C] text-white',
    hollow: 'border-2 border-[#E8590C] text-[#E8590C]',
    swatch: 'bg-[#E8590C]',
  },
  ACTIVIDAD: {
    label: 'Actividad (otro día)',
    filled: 'bg-[#7C3AED] text-white dark:bg-[#8B5CF6]',
    hollow: 'border-2 border-[#7C3AED] text-[#7C3AED] dark:border-[#8B5CF6] dark:text-[#A78BFA]',
    swatch: 'bg-[#7C3AED] dark:bg-[#8B5CF6]',
  },
} as const;

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

const formatLong = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  const text = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(Date.UTC(y!, m! - 1, d!, 12)));
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const describeDay = (date: string, info?: AttendanceCalendarDay) => {
  if (!info) return `${formatLong(date)} · sin culto ni actividad`;
  const kind = info.kind === 'CULTO' ? 'Culto joven' : 'Actividad';
  const people =
    info.attendees === 0
      ? 'sin asistentes'
      : `${info.attendees} asistente${info.attendees === 1 ? '' : 's'}`;
  return `${formatLong(date)} · ${kind} · ${people} · QR de ${info.points} pts`;
};

// Calendario anual: muestra de un vistazo en qué días hubo culto joven o
// actividad (días con QR) y cuánta gente asistió. Tocar un día lo selecciona.
const AttendanceYearCalendar: React.FC<AttendanceYearCalendarProps> = ({
  selectedDate,
  onSelect,
  refreshTrigger = 0,
}) => {
  const today = getCurrentDateColombia();
  const currentYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(() => Number(selectedDate.slice(0, 4)) || currentYear);
  const [days, setDays] = useState<AttendanceCalendarDay[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    getAttendanceCalendar(year)
      .then(data => !cancelled && setDays(data.days))
      .catch(err => !cancelled && setError(err instanceof Error ? err.message : 'Error al cargar el calendario'));
    return () => {
      cancelled = true;
    };
  }, [year, refreshTrigger]);

  // Si el día seleccionado cambia de año (p. ej. botón "Hoy"), seguirlo
  useEffect(() => {
    const y = Number(selectedDate.slice(0, 4));
    if (y && y !== year) setYear(y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const byDate = useMemo(
    () => new Map((days ?? []).map(d => [d.date, d])),
    [days]
  );

  const summary = useMemo(() => {
    const cultos = (days ?? []).filter(d => d.kind === 'CULTO');
    const actividades = (days ?? []).filter(d => d.kind === 'ACTIVIDAD');
    const conGente = cultos.filter(d => d.attendees > 0);
    const promedio = conGente.length
      ? Math.round(conGente.reduce((a, d) => a + d.attendees, 0) / conGente.length)
      : 0;
    const mejor = [...(days ?? [])].sort((a, b) => b.attendees - a.attendees)[0];
    return { cultos: cultos.length, actividades: actividades.length, promedio, mejor };
  }, [days]);

  const detailDate = hovered ?? selectedDate;
  const chip =
    'inline-flex h-8 items-center gap-1.5 rounded-full border border-sand-200 bg-white px-3 text-xs text-cocoa-600 dark:border-white/10 dark:bg-ink-800 dark:text-white/70';

  return (
    <div className="rounded-[22px] border border-sand-200 bg-white p-4 sm:p-5 dark:border-white/10 dark:bg-ink-800">
      {/* Encabezado: navegación de año + leyenda */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setYear(y => y - 1)}
            aria-label="Año anterior"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-sand-300 text-cocoa-600 hover:border-cocoa-400 dark:border-white/15 dark:text-white/80"
          >
            ‹
          </button>
          <span className="min-w-[64px] text-center font-display text-2xl font-bold text-cocoa-900 dark:text-white">
            {year}
          </span>
          <button
            type="button"
            onClick={() => setYear(y => y + 1)}
            disabled={year >= currentYear}
            aria-label="Año siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-sand-300 text-cocoa-600 hover:border-cocoa-400 disabled:opacity-30 dark:border-white/15 dark:text-white/80"
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => onSelect(today)}
            className="ml-1 inline-flex h-9 items-center rounded-full border border-sand-300 px-3.5 text-[13px] font-semibold text-cocoa-600 hover:border-cocoa-400 dark:border-white/15 dark:text-white/80"
          >
            Hoy
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-cocoa-500 dark:text-white/60">
          {(['CULTO', 'ACTIVIDAD'] as const).map(k => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded ${KIND_STYLE[k].swatch}`} />
              {KIND_STYLE[k].label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border-2 border-cocoa-400 dark:border-white/50" />
            QR sin asistentes
          </span>
        </div>
      </div>

      {/* Resumen del año */}
      {days && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className={chip}><b className="text-cocoa-900 dark:text-white">{summary.cultos}</b> cultos jóvenes</span>
          <span className={chip}><b className="text-cocoa-900 dark:text-white">{summary.actividades}</b> actividades</span>
          {summary.promedio > 0 && (
            <span className={chip}><b className="text-cocoa-900 dark:text-white">{summary.promedio}</b> asistentes por culto (promedio)</span>
          )}
          {summary.mejor && summary.mejor.attendees > 0 && (
            <button type="button" onClick={() => onSelect(summary.mejor!.date)} className={`${chip} hover:border-cocoa-400`}>
              Récord: <b className="text-cocoa-900 dark:text-white">{summary.mejor.attendees}</b> el {formatLong(summary.mejor.date).toLowerCase()}
            </button>
          )}
        </div>
      )}

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-300">{error}</p>
      ) : !days ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-sand-200 border-t-brand-orange dark:border-white/15" />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {MONTHS.map((monthName, m) => {
            const daysInMonth = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
            // Domingo = 0 ... sábado = 6
            const offset = new Date(Date.UTC(year, m, 1)).getUTCDay();
            const monthEvents = Array.from({ length: daysInMonth }, (_, i) =>
              byDate.get(toKey(year, m, i + 1))
            ).filter(Boolean).length;
            return (
              <div key={monthName}>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-[13px] font-bold text-cocoa-900 dark:text-white">{monthName}</span>
                  {monthEvents > 0 && (
                    <span className="text-[11px] text-cocoa-400 dark:text-white/45">{monthEvents}</span>
                  )}
                </div>
                <div className="grid grid-cols-7 gap-[3px] text-center">
                  {WEEKDAYS.map((w, i) => (
                    <span
                      key={i}
                      className={`text-[9px] font-semibold ${i === 6 ? 'text-[#E8590C]' : 'text-cocoa-400 dark:text-white/40'}`}
                    >
                      {w}
                    </span>
                  ))}
                  {Array.from({ length: offset }, (_, i) => <span key={`e${i}`} />)}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const key = toKey(year, m, i + 1);
                    const info = byDate.get(key);
                    const isFuture = key > today;
                    const isSelected = key === selectedDate;
                    const isToday = key === today;
                    const style = info
                      ? info.attendees > 0
                        ? KIND_STYLE[info.kind].filled
                        : KIND_STYLE[info.kind].hollow
                      : 'text-cocoa-500 hover:bg-sand-100 dark:text-white/55 dark:hover:bg-white/10';
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={isFuture}
                        onClick={() => onSelect(key)}
                        onMouseEnter={() => setHovered(key)}
                        onMouseLeave={() => setHovered(null)}
                        onFocus={() => setHovered(key)}
                        onBlur={() => setHovered(null)}
                        aria-label={describeDay(key, info)}
                        aria-pressed={isSelected}
                        className={`flex aspect-square items-center justify-center rounded-md text-[10.5px] tabular-nums transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber disabled:cursor-default disabled:opacity-30 ${
                          info ? 'font-bold hover:scale-110' : ''
                        } ${style} ${
                          isSelected
                            ? 'ring-2 ring-cocoa-900 ring-offset-1 ring-offset-white dark:ring-white dark:ring-offset-ink-800'
                            : isToday
                              ? 'outline outline-1 outline-dashed outline-cocoa-500 dark:outline-white/60'
                              : ''
                        }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detalle del día (al pasar el mouse o del día seleccionado) */}
      <div
        className="mt-4 rounded-xl bg-sand-50 px-3.5 py-2.5 text-[13px] text-cocoa-600 dark:bg-white/[0.05] dark:text-white/75"
        aria-live="polite"
      >
        {describeDay(detailDate, byDate.get(detailDate))}
      </div>
    </div>
  );
};

export default AttendanceYearCalendar;
