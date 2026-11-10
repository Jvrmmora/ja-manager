import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

type View = 'mes' | 'semana' | 'año';
const VIEWS: { id: View; label: string }[] = [
  { id: 'mes', label: 'Mes' },
  { id: 'semana', label: 'Semana' },
  { id: 'año', label: 'Año' },
];
const WEEKDAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const parseKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, 12));
};
const dateToKey = (dt: Date) => toKey(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
const addDays = (key: string, n: number) => {
  const dt = parseKey(key);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dateToKey(dt);
};
const addMonths = (key: string, n: number) => {
  const dt = parseKey(key);
  dt.setUTCDate(1);
  dt.setUTCMonth(dt.getUTCMonth() + n);
  return dateToKey(dt);
};
const startOfWeek = (key: string) => addDays(key, -parseKey(key).getUTCDay()); // domingo

// Calendario de asistencias con tres vistas (mes, semana, año). Abre en el mes
// actual; el año completo queda como vista de resumen. Tocar un día lo selecciona.
const AttendanceYearCalendar: React.FC<AttendanceYearCalendarProps> = ({
  selectedDate,
  onSelect,
  refreshTrigger = 0,
}) => {
  const today = getCurrentDateColombia();
  const [view, setView] = useState<View>('mes');
  const [cursor, setCursor] = useState(selectedDate || today);
  const [byYear, setByYear] = useState<Record<number, AttendanceCalendarDay[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // Rango visible → años que hay que tener cargados
  const range = useMemo(() => {
    if (view === 'año') {
      const y = Number(cursor.slice(0, 4));
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    }
    if (view === 'mes') {
      const start = `${cursor.slice(0, 7)}-01`;
      return { start, end: addDays(addMonths(start, 1), -1) };
    }
    const start = startOfWeek(cursor);
    return { start, end: addDays(start, 6) };
  }, [view, cursor]);
  const yearsNeeded = useMemo(() => {
    const a = Number(range.start.slice(0, 4));
    const b = Number(range.end.slice(0, 4));
    return a === b ? [a] : [a, b];
  }, [range]);
  const yearsKey = yearsNeeded.join(',');

  useEffect(() => {
    let cancelled = false;
    setError(null);
    yearsNeeded.forEach(y => {
      getAttendanceCalendar(y)
        .then(data => !cancelled && setByYear(prev => ({ ...prev, [y]: data.days })))
        .catch(err => !cancelled && setError(err instanceof Error ? err.message : 'Error al cargar el calendario'));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearsKey, refreshTrigger]);

  // Si el día seleccionado cambia (p. ej. botón "Hoy"), seguirlo
  useEffect(() => {
    if (selectedDate) setCursor(selectedDate);
  }, [selectedDate]);

  const loaded = yearsNeeded.every(y => byYear[y]);
  const byDate = useMemo(
    () => new Map(Object.values(byYear).flat().map(d => [d.date, d])),
    [byYear]
  );
  const inRange = useMemo(
    () => [...byDate.values()].filter(d => d.date >= range.start && d.date <= range.end),
    [byDate, range]
  );

  const summary = useMemo(() => {
    const cultos = inRange.filter(d => d.kind === 'CULTO');
    const conGente = cultos.filter(d => d.attendees > 0);
    const promedio = conGente.length
      ? Math.round(conGente.reduce((a, d) => a + d.attendees, 0) / conGente.length)
      : 0;
    const mejor = [...inRange].sort((a, b) => b.attendees - a.attendees)[0];
    return {
      cultos: cultos.length,
      actividades: inRange.length - cultos.length,
      promedio,
      mejor,
    };
  }, [inRange]);

  const step = useCallback(
    (dir: 1 | -1) =>
      setCursor(c =>
        view === 'mes' ? addMonths(c, dir) : view === 'semana' ? addDays(c, 7 * dir) : addMonths(c, 12 * dir)
      ),
    [view]
  );
  const canNext = range.end < today;

  const title =
    view === 'año'
      ? cursor.slice(0, 4)
      : view === 'mes'
        ? `${MONTHS[Number(cursor.slice(5, 7)) - 1]} ${cursor.slice(0, 4)}`
        : (() => {
            const a = parseKey(range.start);
            const b = parseKey(range.end);
            const fmt = (dt: Date, withMonth = true) =>
              `${dt.getUTCDate()}${withMonth ? ` ${MONTHS[dt.getUTCMonth()]!.slice(0, 3).toLowerCase()}` : ''}`;
            return a.getUTCMonth() === b.getUTCMonth()
              ? `${fmt(a, false)}–${fmt(b)}`
              : `${fmt(a)} – ${fmt(b)}`;
          })();

  const goToday = () => {
    setCursor(today);
    onSelect(today);
  };

  const detailDate = hovered ?? selectedDate;
  const chip =
    'inline-flex h-8 items-center gap-1.5 rounded-full border border-sand-200 bg-white px-3 text-xs text-cocoa-600 dark:border-white/10 dark:bg-ink-800 dark:text-white/70';
  const navBtn =
    'flex h-9 w-9 items-center justify-center rounded-full border border-sand-300 text-cocoa-600 hover:border-cocoa-400 disabled:opacity-30 dark:border-white/15 dark:text-white/80';

  const dayStyle = (info?: AttendanceCalendarDay) =>
    info
      ? info.attendees > 0
        ? KIND_STYLE[info.kind].filled
        : KIND_STYLE[info.kind].hollow
      : 'text-cocoa-500 hover:bg-sand-100 dark:text-white/55 dark:hover:bg-white/10';
  const dayRing = (key: string) =>
    key === selectedDate
      ? 'ring-2 ring-cocoa-900 ring-offset-1 ring-offset-white dark:ring-white dark:ring-offset-ink-800'
      : key === today
        ? 'outline outline-1 outline-dashed outline-cocoa-500 dark:outline-white/60'
        : '';

  const renderMonthGrid = (year: number, m: number, compact: boolean) => {
    const daysInMonth = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
    const offset = new Date(Date.UTC(year, m, 1)).getUTCDay(); // domingo = 0
    return (
      <div className={`grid grid-cols-7 text-center ${compact ? 'gap-[3px]' : 'gap-1.5 sm:gap-2'}`}>
        {WEEKDAYS.map((w, i) => (
          <span
            key={i}
            className={`font-semibold ${compact ? 'text-[9px]' : 'py-1 text-xs'} ${i === 6 ? 'text-[#E8590C]' : 'text-cocoa-400 dark:text-white/40'}`}
          >
            {w}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const key = toKey(year, m, i + 1);
          const info = byDate.get(key);
          return (
            <button
              key={key}
              type="button"
              disabled={key > today}
              onClick={() => onSelect(key)}
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(key)}
              onBlur={() => setHovered(null)}
              aria-label={describeDay(key, info)}
              aria-pressed={key === selectedDate}
              className={`flex items-center justify-center rounded-md tabular-nums transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber disabled:cursor-default disabled:opacity-30 ${
                compact
                  ? 'aspect-square text-[10.5px]'
                  : 'aspect-square flex-col gap-0.5 rounded-xl text-sm sm:text-base'
              } ${info ? 'font-bold hover:scale-105' : ''} ${dayStyle(info)} ${dayRing(key)}`}
            >
              {i + 1}
              {!compact && info && info.attendees > 0 && (
                <span className="text-[10px] font-semibold leading-none opacity-90">{info.attendees}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="rounded-[22px] border border-sand-200 bg-white p-4 sm:p-5 dark:border-white/10 dark:bg-ink-800">
      {/* Selector de vista */}
      <div
        role="tablist"
        aria-label="Vista del calendario"
        className="mb-3 grid grid-cols-3 gap-1 rounded-full bg-sand-100 p-1 dark:bg-white/[0.06] sm:inline-grid sm:w-72"
      >
        {VIEWS.map(v => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            onClick={() => setView(v.id)}
            className={`h-9 rounded-full text-[13px] font-semibold transition-colors ${
              view === v.id
                ? 'bg-white text-cocoa-900 shadow-sm dark:bg-ink-700 dark:text-white'
                : 'text-cocoa-500 hover:text-cocoa-900 dark:text-white/55 dark:hover:text-white'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Navegación del periodo + leyenda */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => step(-1)} aria-label="Periodo anterior" className={navBtn}>‹</button>
          <span className="min-w-[120px] text-center font-display text-xl font-bold text-cocoa-900 dark:text-white sm:text-2xl">
            {title}
          </span>
          <button type="button" onClick={() => step(1)} disabled={!canNext} aria-label="Periodo siguiente" className={navBtn}>›</button>
          <button
            type="button"
            onClick={goToday}
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

      {/* Resumen del periodo */}
      {loaded && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className={chip}><b className="text-cocoa-900 dark:text-white">{summary.cultos}</b> cultos jóvenes</span>
          <span className={chip}><b className="text-cocoa-900 dark:text-white">{summary.actividades}</b> actividades</span>
          {summary.promedio > 0 && (
            <span className={chip}><b className="text-cocoa-900 dark:text-white">{summary.promedio}</b> por culto (promedio)</span>
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
      ) : !loaded ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-sand-200 border-t-brand-orange dark:border-white/15" />
        </div>
      ) : view === 'mes' ? (
        <div className="mx-auto mt-4 max-w-xl">
          {renderMonthGrid(Number(cursor.slice(0, 4)), Number(cursor.slice(5, 7)) - 1, false)}
        </div>
      ) : view === 'semana' ? (
        <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
          {Array.from({ length: 7 }, (_, i) => addDays(range.start, i)).map(key => {
            const info = byDate.get(key);
            const future = key > today;
            return (
              <li key={key}>
                <button
                  type="button"
                  disabled={future}
                  onClick={() => onSelect(key)}
                  aria-label={describeDay(key, info)}
                  aria-pressed={key === selectedDate}
                  className={`flex w-full items-center gap-3 rounded-2xl border border-sand-200 px-3 py-2.5 text-left transition-colors hover:border-cocoa-400 disabled:opacity-40 dark:border-white/10 ${
                    key === selectedDate ? 'ring-2 ring-cocoa-900 dark:ring-white' : ''
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-base font-bold leading-none ${
                      info ? (info.attendees > 0 ? KIND_STYLE[info.kind].filled : KIND_STYLE[info.kind].hollow) : 'bg-sand-100 text-cocoa-500 dark:bg-white/10 dark:text-white/60'
                    }`}
                  >
                    {Number(key.slice(8))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-cocoa-900 dark:text-white">
                      {WEEKDAY_NAMES[parseKey(key).getUTCDay()]}
                      {key === today && <span className="ml-2 text-[11px] font-bold text-brand-orange">HOY</span>}
                    </span>
                    <span className="block text-xs text-cocoa-500 dark:text-white/60">
                      {info
                        ? `${info.kind === 'CULTO' ? 'Culto joven' : 'Actividad'} · QR de ${info.points} pts`
                        : 'Sin culto ni actividad'}
                    </span>
                  </span>
                  {info && (
                    <span className="shrink-0 text-right">
                      <b className="block font-display text-xl leading-none text-cocoa-900 dark:text-white">{info.attendees}</b>
                      <span className="text-[10px] uppercase tracking-wider text-cocoa-400 dark:text-white/45">asistentes</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {MONTHS.map((monthName, m) => {
            const year = Number(cursor.slice(0, 4));
            const monthEvents = inRange.filter(d => Number(d.date.slice(5, 7)) === m + 1).length;
            return (
              <div key={monthName}>
                <button
                  type="button"
                  onClick={() => {
                    setCursor(toKey(year, m, 1));
                    setView('mes');
                  }}
                  aria-label={`Ver ${monthName} ${year}`}
                  className="mb-1 flex w-full items-baseline justify-between text-left hover:underline"
                >
                  <span className="text-[13px] font-bold text-cocoa-900 dark:text-white">{monthName}</span>
                  {monthEvents > 0 && (
                    <span className="text-[11px] text-cocoa-400 dark:text-white/45">{monthEvents}</span>
                  )}
                </button>
                {renderMonthGrid(year, m, true)}
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
