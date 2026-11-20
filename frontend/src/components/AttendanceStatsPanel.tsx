import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  getSeasonAttendanceStats,
  type SeasonAttendanceStats,
  type SeasonStatRecord,
} from '../services/attendanceApi';
import { seasonService } from '../services/seasonService';
import type { ISeason } from '../types';
import BrandModalHeader from './ui/BrandModalHeader';
import LoadingSpinner from './LoadingSpinner';
import { initialsOf } from './young/useYoungActions';

interface AttendanceStatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const WEEKDAYS = ['dom.', 'lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.'];

const parse = (key: string) => {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d, 12));
};
const dayShort = (key: string) => {
  const d = parse(key);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]!.slice(0, 3).toLowerCase()}`;
};
const dayLong = (key: string) => {
  const d = parse(key);
  return `${WEEKDAYS[d.getUTCDay()]} ${dayShort(key)}`;
};
const monthName = (key: string) => MONTHS[Number(key.slice(5, 7)) - 1] ?? key;

const cardCls =
  'min-w-0 rounded-3xl border border-sand-200 bg-white p-5 dark:border-white/10 dark:bg-ink-900 sm:p-6';
const muted = 'text-cocoa-500 dark:text-white/65';
const display = 'font-display uppercase';

// Número que cuenta hasta su valor (sin animación si el sistema pide reducir movimiento)
const CountUp: React.FC<{ value: number; reduced: boolean | null }> = ({
  value,
  reduced,
}) => {
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const duration = 1100;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);
  return <>{shown}</>;
};

// Entrada suave de cada bloque al aparecer en pantalla
const Reveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  reduced: boolean | null;
  className?: string;
}> = ({ children, delay = 0, reduced, className = '' }) =>
  reduced ? (
    <div className={className}>{children}</div>
  ) : (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );

const CardTitle: React.FC<{ title: string; sub?: string }> = ({ title, sub }) => (
  <div className="mb-4">
    <h3 className={`m-0 ${display} text-xl font-semibold leading-tight text-cocoa-900 dark:text-white`}>
      {title}
    </h3>
    {sub && <p className={`m-0 mt-1 text-[13px] ${muted}`}>{sub}</p>}
  </div>
);

const Kpi: React.FC<{
  label: string;
  value: number;
  sub: React.ReactNode;
  tone?: string;
  dark?: boolean;
  reduced: boolean | null;
  big: boolean;
}> = ({ label, value, sub, tone = 'text-cocoa-900 dark:text-white', dark, reduced, big }) => (
  <div
    className={`flex min-w-0 flex-col gap-1.5 rounded-3xl border p-5 ${
      dark
        ? 'border-transparent bg-ink-950 text-white dark:border-white/10 dark:bg-[#0C0609]'
        : 'border-sand-200 bg-white dark:border-white/10 dark:bg-ink-900'
    }`}
  >
    <span className={`text-[13px] ${dark ? 'text-white/65' : muted}`}>{label}</span>
    <span className={`${display} font-bold leading-none ${big ? 'text-7xl' : 'text-5xl'} ${tone}`}>
      <CountUp value={value} reduced={reduced} />
    </span>
    <span className={`text-[13px] ${dark ? 'text-white/65' : muted}`}>{sub}</span>
  </div>
);

const RecordCard: React.FC<{
  label: string;
  rec: SeasonStatRecord | null;
  tone: string;
  reduced: boolean | null;
}> = ({ label, rec, tone, reduced }) => (
  <div className="flex min-w-0 items-center gap-4 rounded-3xl border border-sand-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-ink-900">
    <span className={`${display} min-w-[64px] text-[40px] font-bold leading-none ${tone}`}>
      {rec ? <CountUp value={rec.attendees} reduced={reduced} /> : '—'}
    </span>
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="text-sm font-semibold text-cocoa-900 dark:text-white">{label}</span>
      <span className={`text-[13px] ${muted}`}>{rec ? dayLong(rec.date) : 'Sin datos aún'}</span>
    </span>
  </div>
);

const AttendanceStatsPanel: React.FC<AttendanceStatsPanelProps> = ({ isOpen, onClose }) => {
  const reduced = useReducedMotion();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [seasons, setSeasons] = useState<ISeason[]>([]);
  const [seasonId, setSeasonId] = useState<string | undefined>(undefined);
  const [data, setData] = useState<SeasonAttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [full, setFull] = useState(false);

  const load = useCallback(async (id?: string) => {
    try {
      setLoading(true);
      setError(null);
      setData(await getSeasonAttendanceStats(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    load(seasonId);
  }, [isOpen, seasonId, load]);

  useEffect(() => {
    if (!isOpen) return;
    seasonService
      .getAll()
      .then(list =>
        setSeasons(
          [...list].sort(
            (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          )
        )
      )
      .catch(() => setSeasons([]));
  }, [isOpen]);

  // Esc: sale de pantalla completa o cierra; también sincroniza si el navegador sale solo
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (full) setFull(false);
      else onClose();
    };
    const onFs = () => {
      if (!document.fullscreenElement) setFull(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, [isOpen, full, onClose]);

  // Al cerrar el panel, salir también de la pantalla completa del navegador
  useEffect(() => {
    if (!isOpen) {
      setFull(false);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
    }
  }, [isOpen]);

  const toggleFull = async () => {
    if (full) {
      setFull(false);
      if (document.fullscreenElement) await document.exitFullscreen?.().catch(() => undefined);
      return;
    }
    setFull(true);
    try {
      await overlayRef.current?.requestFullscreen?.();
    } catch {
      // Sin API de pantalla completa (p. ej. iOS): queda el modo ampliado
    }
  };

  if (!isOpen) return null;

  const fullBtn = (
    <button
      type="button"
      onClick={toggleFull}
      aria-pressed={full}
      aria-label={full ? 'Salir de pantalla completa' : 'Pantalla completa'}
      className="flex h-10 items-center gap-2 rounded-full border border-white/20 px-3.5 text-[13px] font-semibold text-white transition-colors hover:border-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber sm:h-11"
    >
      <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {full ? (
          <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
        ) : (
          <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
        )}
      </svg>
      <span className="hidden sm:inline">{full ? 'Salir' : 'Pantalla completa'}</span>
    </button>
  );

  const body = (() => {
    if (loading && !data) {
      return (
        <div className="py-24 text-center">
          <LoadingSpinner />
          <p className={`mt-4 text-sm ${muted}`}>Calculando estadísticas…</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="mx-auto max-w-md rounded-3xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-500/30 dark:bg-red-500/10">
          <p className="m-0 text-sm text-red-700 dark:text-red-300">{error}</p>
          <button type="button" onClick={() => load(seasonId)} className="btn-fire mt-4 h-11 px-6 text-sm">
            Reintentar
          </button>
        </div>
      );
    }
    if (!data) return null;

    const s = data.summary;
    const empty = s.eventos === 0;
    const seasonLabel = `${dayShort(data.season.startDate)} – ${dayShort(data.season.endDate)}`;

    const selector = (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className="relative inline-flex h-12 items-center">
          <span className="sr-only">Temporada</span>
          <select
            value={seasonId ?? data.season.id}
            onChange={e => setSeasonId(e.target.value)}
            className="h-12 appearance-none rounded-2xl border-[1.5px] border-sand-300 bg-white pl-4 pr-10 text-[15px] font-semibold text-cocoa-900 focus:border-brand-orange focus:outline-none focus:ring-4 focus:ring-brand-orange/20 dark:border-white/20 dark:bg-ink-900 dark:text-white"
          >
            {(seasons.length ? seasons : [{ id: data.season.id, name: data.season.name, status: data.season.status } as ISeason]).map(se => (
              <option key={se.id} value={se.id}>
                {se.name}
                {se.status === 'ACTIVE' ? ' · activa' : ''}
              </option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-3.5 h-4 w-4 text-cocoa-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </label>
        <span className={`text-[13px] ${muted}`}>{seasonLabel} · calculado solo con esta temporada</span>
      </div>
    );

    if (empty) {
      return (
        <div className="flex flex-col gap-4">
          {selector}
          <div className={`${cardCls} py-14 text-center`}>
            <p className="m-0 text-lg text-cocoa-900 dark:text-white">Esta temporada aún no tiene asistencias</p>
            <p className={`m-0 mt-2 text-sm ${muted}`}>
              Cuando los jóvenes escaneen el QR de un culto o actividad, aquí verás sus estadísticas.
            </p>
          </div>
        </div>
      );
    }

    // ───── Gráfica culto por culto ─────
    const series = data.cultosSeries;
    const maxV = Math.max(...series.map(c => c.attendees), 1);
    const plotH = full ? 260 : 190;
    const avgPx = (s.promedioCulto / maxV) * plotH;
    const cultoMax = data.records.cultoMax?.attendees;
    const cultoMin = data.records.cultoMin?.attendees;

    // ───── Por mes ─────
    const maxMonth = Math.max(...data.months.map(m => m.attendees), 1);

    // ───── Dona ─────
    const totalSplit = data.split.cultos.attendees + data.split.actividades.attendees || 1;
    const cultosShare = data.split.cultos.attendees / totalSplit;
    const trend = s.tendencia;

    const enter = (delay: number) => (reduced ? {} : { transition: { duration: 0.8, delay, ease: 'easeOut' as const } });

    return (
      <div key={data.season.id} className="flex flex-col gap-4">
        {selector}

        <Reveal reduced={reduced}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              label="Promedio por culto"
              value={s.promedioCulto}
              tone="text-brand-ember dark:text-brand-amber"
              sub={
                trend === null
                  ? 'Aún pocos cultos para la tendencia'
                  : trend === 0
                    ? 'Igual que la 1.ª mitad'
                    : `${trend > 0 ? '▲' : '▼'} ${Math.abs(trend)} ${trend > 0 ? 'más' : 'menos'} que la 1.ª mitad`
              }
              reduced={reduced}
              big={full}
            />
            <Kpi
              label="Eventos de la temporada"
              value={s.eventos}
              sub={`${s.cultos} cultos · ${s.actividades} actividades`}
              reduced={reduced}
              big={full}
            />
            <Kpi
              label="Culto con más asistencia"
              value={data.records.cultoMax?.attendees ?? 0}
              tone="text-brand-amber"
              dark
              sub={data.records.cultoMax ? dayLong(data.records.cultoMax.date) : '—'}
              reduced={reduced}
              big={full}
            />
            <Kpi
              label="Culto con menos asistencia"
              value={data.records.cultoMin?.attendees ?? 0}
              tone="text-[#F4A3C0]"
              dark
              sub={data.records.cultoMin ? dayLong(data.records.cultoMin.date) : '—'}
              reduced={reduced}
              big={full}
            />
          </div>
        </Reveal>

        <Reveal reduced={reduced} delay={0.05}>
          <div className="grid gap-3 md:grid-cols-2">
            <RecordCard label="Actividad con más gente" rec={data.records.actividadMax} tone="text-violet-500 dark:text-violet-300" reduced={reduced} />
            <RecordCard label="Actividad con menos gente" rec={data.records.actividadMin} tone="text-violet-500 dark:text-violet-300" reduced={reduced} />
          </div>
        </Reveal>

        <Reveal reduced={reduced}>
          <section className={cardCls} aria-label="Asistencia culto por culto">
            <CardTitle title="Asistencia culto por culto" sub="Cada barra es un culto joven (sábado)" />
            <div className="overflow-x-auto pb-1">
              <div className="relative" style={{ minWidth: `${series.length * 40}px` }}>
                <div
                  role="img"
                  aria-label={`Asistencia de ${series.length} cultos: mínimo ${cultoMin}, máximo ${cultoMax}, promedio ${s.promedioCulto}`}
                  className="flex items-end gap-2"
                  style={{ height: `${plotH + 22}px` }}
                >
                  {series.map((c, i) => {
                    const isMax = c.attendees === cultoMax;
                    const isMin = c.attendees === cultoMin && cultoMin !== cultoMax;
                    const color = isMax ? 'bg-brand-amber' : isMin ? 'bg-[#C23A5B]' : 'bg-brand-orange';
                    return (
                      <div key={c.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                        <span
                          className={`text-[11px] font-bold ${
                            isMax ? 'text-brand-ember dark:text-brand-amber' : isMin ? 'text-[#B3243B] dark:text-[#F4A3C0]' : muted
                          }`}
                        >
                          {c.attendees}
                        </span>
                        <motion.div
                          className={`w-full max-w-[44px] rounded-t-lg rounded-b-[3px] ${color}`}
                          initial={reduced ? false : { height: 0 }}
                          whileInView={{ height: (c.attendees / maxV) * plotH }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.7, delay: reduced ? 0 : 0.05 * i, ease: 'easeOut' }}
                          {...(reduced ? { style: { height: (c.attendees / maxV) * plotH } } : {})}
                        />
                      </div>
                    );
                  })}
                </div>
                <div
                  className="pointer-events-none absolute left-0 right-0 border-t-2 border-dashed border-cocoa-400/70 dark:border-white/45"
                  style={{ bottom: `${avgPx}px` }}
                />
                <div className="mt-2 flex gap-2">
                  {series.map(c => (
                    <span key={c.date} className={`min-w-0 flex-1 text-center text-[11px] leading-tight ${muted}`}>
                      {dayShort(c.date)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className={`mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs ${muted}`}>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-brand-amber" />Mayor asistencia</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-[#C23A5B]" />Menor asistencia</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-[18px] border-t-2 border-dashed border-cocoa-400 dark:border-white/60" />Promedio ({s.promedioCulto})</span>
            </div>
          </section>
        </Reveal>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Reveal reduced={reduced}>
            <section className={`${cardCls} h-full`} aria-label="Asistencia por mes">
              <CardTitle title="Asistencia por mes" sub="Total de asistentes y eventos de cada mes" />
              <div className="flex flex-col gap-5">
                {data.months.map((m, i) => {
                  const topAsis = data.topMonths.asistencia === m.month;
                  const topAct = data.topMonths.actividades === m.month;
                  return (
                    <div key={m.month} className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-cocoa-900 dark:text-white">{monthName(m.month)}</span>
                          {topAsis && (
                            <span className="rounded-full bg-brand-amber/20 px-2.5 py-0.5 text-[11px] font-bold text-brand-ember dark:text-brand-amber">Más asistencia</span>
                          )}
                          {topAct && (
                            <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[11px] font-bold text-violet-700 dark:bg-violet-500/25 dark:text-violet-300">Más actividades</span>
                          )}
                        </span>
                        <span className={`text-[13px] ${muted}`}>
                          <b className="text-cocoa-900 dark:text-white">{m.attendees}</b> asistentes · {m.eventos} eventos
                        </span>
                      </div>
                      <div className="h-3.5 overflow-hidden rounded-full bg-sand-100 dark:bg-white/10">
                        <motion.div
                          className={`h-full rounded-full ${topAsis ? 'bg-brand-amber' : 'bg-brand-orange'}`}
                          initial={reduced ? false : { width: 0 }}
                          whileInView={{ width: `${(m.attendees / maxMonth) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: reduced ? 0 : 0.1 * i, ease: 'easeOut' }}
                          {...(reduced ? { style: { width: `${(m.attendees / maxMonth) * 100}%` } } : {})}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </Reveal>

          <Reveal reduced={reduced} delay={0.05}>
            <section className={`${cardCls} h-full`} aria-label="Cultos contra actividades">
              <CardTitle title="Cultos vs actividades" sub="Eventos y asistentes de cada tipo" />
              <div className="flex flex-wrap items-center justify-center gap-6">
                <div className="relative h-[164px] w-[164px] flex-none">
                  <svg
                    width="164"
                    height="164"
                    viewBox="0 0 140 140"
                    role="img"
                    aria-label={`${Math.round(cultosShare * 100)}% de los asistentes en cultos y ${100 - Math.round(cultosShare * 100)}% en actividades`}
                    className="-rotate-90"
                  >
                    <circle cx="70" cy="70" r="54" fill="none" strokeWidth="18" className="stroke-violet-500" />
                    <motion.circle
                      cx="70"
                      cy="70"
                      r="54"
                      fill="none"
                      strokeWidth="18"
                      className="stroke-brand-orange"
                      initial={reduced ? false : { pathLength: 0 }}
                      whileInView={{ pathLength: cultosShare }}
                      viewport={{ once: true }}
                      {...enter(0.2)}
                      {...(reduced ? { style: { pathLength: cultosShare } } : {})}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`${display} text-4xl font-bold leading-none text-cocoa-900 dark:text-white`}>
                      <CountUp value={s.totalAsistentes} reduced={reduced} />
                    </span>
                    <span className={`text-xs ${muted}`}>asistentes</span>
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-4 text-sm">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1 h-3.5 w-3.5 flex-none rounded bg-brand-orange" />
                    <span className="text-cocoa-900 dark:text-white">
                      <b>Cultos jóvenes</b>
                      <br />
                      <span className={`text-[13px] ${muted}`}>{data.split.cultos.eventos} eventos · {data.split.cultos.attendees} asistentes</span>
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1 h-3.5 w-3.5 flex-none rounded bg-violet-500" />
                    <span className="text-cocoa-900 dark:text-white">
                      <b>Actividades</b>
                      <br />
                      <span className={`text-[13px] ${muted}`}>{data.split.actividades.eventos} eventos · {data.split.actividades.attendees} asistentes</span>
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </Reveal>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)]">
          <Reveal reduced={reduced}>
            <section className={`${cardCls} h-full`} aria-label="Jóvenes constantes">
              <CardTitle title="Jóvenes constantes" sub={`Asistieron al ${Math.round(data.constancia.umbral * 100)}% o más de los cultos`} />
              <div className="flex flex-wrap items-center gap-5">
                <div className="relative h-[132px] w-[132px] flex-none">
                  <svg width="132" height="132" viewBox="0 0 110 110" role="img" aria-label={`${data.constancia.constantes} de ${data.constancia.activos} jóvenes activos`} className="-rotate-90">
                    <circle cx="55" cy="55" r="44" fill="none" strokeWidth="12" className="stroke-sand-100 dark:stroke-white/10" />
                    <motion.circle
                      cx="55"
                      cy="55"
                      r="44"
                      fill="none"
                      strokeWidth="12"
                      strokeLinecap="round"
                      className="stroke-brand-amber"
                      initial={reduced ? false : { pathLength: 0 }}
                      whileInView={{ pathLength: data.constancia.porcentaje / 100 }}
                      viewport={{ once: true }}
                      {...enter(0.2)}
                      {...(reduced ? { style: { pathLength: data.constancia.porcentaje / 100 } } : {})}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`${display} text-3xl font-bold text-cocoa-900 dark:text-white`}>
                      <CountUp value={data.constancia.porcentaje} reduced={reduced} />%
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className={`${display} text-[40px] font-bold leading-none text-brand-ember dark:text-brand-amber`}>
                    <CountUp value={data.constancia.constantes} reduced={reduced} />
                  </span>
                  <span className={`text-[13px] ${muted}`}>de {data.constancia.activos} jóvenes activos</span>
                </div>
              </div>
              {data.constancia.top.length > 0 && (
                <>
                  <p className={`m-0 mb-1 mt-5 text-[11px] font-bold uppercase tracking-[0.12em] ${muted}`}>Los más constantes</p>
                  <ul className="m-0 list-none p-0">
                    {data.constancia.top.map((y, i) => (
                      <motion.li
                        key={y.id}
                        initial={reduced ? false : { opacity: 0, x: -12 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: reduced ? 0 : 0.08 * i }}
                        className="flex min-h-[44px] items-center gap-3 border-t border-sand-200 py-2 dark:border-white/10"
                      >
                        <span className={`${display} w-5 flex-none text-center text-base font-semibold ${i === 0 ? 'text-brand-ember dark:text-brand-amber' : muted}`}>{i + 1}</span>
                        <span className="flex h-9 w-9 flex-none items-center justify-center overflow-hidden rounded-full bg-ink-800 text-[11px] font-bold text-white">
                          {y.profileImage ? (
                            <img src={y.profileImage} alt="" className="h-full w-full object-cover" />
                          ) : (
                            initialsOf(y.fullName)
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-cocoa-900 dark:text-white">{y.fullName}</span>
                        <span className="flex-none whitespace-nowrap rounded-full bg-brand-amber/20 px-2.5 py-1 text-xs font-bold text-brand-ember dark:text-brand-amber">
                          {y.asistencias} de {y.cultos}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </Reveal>

          <Reveal reduced={reduced} delay={0.05}>
            <section className={`${cardCls} h-full`} aria-label="Jóvenes en riesgo">
              <CardTitle title="En riesgo" sub={`${data.enRiesgo.racha} o más cultos seguidos sin asistir`} />
              {data.enRiesgo.items.length === 0 ? (
                <p className={`m-0 py-6 text-center text-sm ${muted}`}>Nadie en riesgo por ahora. 🎉</p>
              ) : (
                <ul className="m-0 list-none p-0">
                  {data.enRiesgo.items.map((y, i) => (
                    <motion.li
                      key={y.id}
                      initial={reduced ? false : { opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: reduced ? 0 : 0.08 * i }}
                      className="flex min-h-[44px] items-center gap-3 border-t border-sand-200 py-2.5 first:border-t-0 dark:border-white/10"
                    >
                      <span className="flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-full bg-ink-800 text-xs font-bold text-white">
                        {y.profileImage ? (
                          <img src={y.profileImage} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initialsOf(y.fullName)
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-cocoa-900 dark:text-white">{y.fullName}</span>
                      <span className="flex-none whitespace-nowrap rounded-full bg-[#C23A5B]/15 px-2.5 py-1 text-xs font-bold text-[#B3243B] dark:bg-[#C23A5B]/25 dark:text-[#F4A3C0]">
                        {y.streak} cultos seguidos
                      </span>
                    </motion.li>
                  ))}
                </ul>
              )}
              {data.enRiesgo.total > data.enRiesgo.items.length && (
                <p className={`m-0 mt-3 text-center text-[13px] ${muted}`}>
                  y {data.enRiesgo.total - data.enRiesgo.items.length} más
                </p>
              )}
            </section>
          </Reveal>

          <Reveal reduced={reduced} delay={0.1}>
            <section className={`${cardCls} h-full`} aria-label="Alcance de la temporada">
              <CardTitle title="Alcance de la temporada" sub="Jóvenes activos que han venido a algo" />
              <div className="flex items-end justify-between gap-3">
                <span className={`${display} text-[44px] font-bold leading-none text-cocoa-900 dark:text-white`}>
                  <CountUp value={data.alcance.asistieron} reduced={reduced} />
                  <span className={`text-lg ${muted}`}> / {data.alcance.activos}</span>
                </span>
                <span className={`${display} text-2xl font-bold text-brand-ember dark:text-brand-amber`}>{data.alcance.porcentaje}%</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-sand-100 dark:bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-brand-orange"
                  initial={reduced ? false : { width: 0 }}
                  whileInView={{ width: `${data.alcance.porcentaje}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  {...(reduced ? { style: { width: `${data.alcance.porcentaje}%` } } : {})}
                />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-sand-50 p-3.5 dark:bg-white/[0.05]">
                  <span className={`${display} block text-3xl font-bold leading-none text-brand-ember dark:text-brand-amber`}>
                    <CountUp value={data.nuevos.total} reduced={reduced} />
                  </span>
                  <span className={`mt-1 block text-xs leading-snug ${muted}`}>nuevos: su primera asistencia fue esta temporada</span>
                </div>
                <div className="rounded-2xl bg-sand-50 p-3.5 dark:bg-white/[0.05]">
                  <span className={`${display} block text-3xl font-bold leading-none text-[#B3243B] dark:text-[#F4A3C0]`}>
                    <CountUp value={data.alcance.sinAsistir} reduced={reduced} />
                  </span>
                  <span className={`mt-1 block text-xs leading-snug ${muted}`}>aún no han asistido a nada</span>
                </div>
              </div>
              {data.nuevos.porMes.length > 0 && (
                <div className="mt-5">
                  <p className={`m-0 mb-2 text-[11px] font-bold uppercase tracking-[0.12em] ${muted}`}>Nuevos por mes</p>
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {data.nuevos.porMes.map(m => (
                      <li key={m.month} className="flex items-center gap-3 text-[13px]">
                        <span className={`w-20 flex-none ${muted}`}>{monthName(m.month)}</span>
                        <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-sand-100 dark:bg-white/10">
                          <span
                            className="block h-full rounded-full bg-brand-amber"
                            style={{ width: `${(m.count / Math.max(...data.nuevos.porMes.map(x => x.count), 1)) * 100}%` }}
                          />
                        </span>
                        <b className="w-6 flex-none text-right text-cocoa-900 dark:text-white">{m.count}</b>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </Reveal>
        </div>

        <p className={`m-0 text-xs ${muted}`}>
          Un culto es un QR en sábado y una actividad es un QR en cualquier otro día; los QR sin asistentes no cuentan.
          Constantes y en riesgo consideran a los jóvenes activos del Grupo 1.
        </p>
      </div>
    );
  })();

  return createPortal(
    <div
      ref={overlayRef}
      className={
        full
          ? 'dark fixed inset-0 z-[9999] flex flex-col bg-ink-950 text-white'
          : 'fixed inset-0 z-[70] flex justify-center bg-[#0C0609]/75 backdrop-blur-sm sm:p-4'
      }
      role="dialog"
      aria-modal="true"
      aria-label="Estadísticas de asistencia"
      onClick={full ? undefined : onClose}
    >
      <div
        className={
          full
            ? 'flex min-h-0 flex-1 flex-col'
            : 'flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden bg-cream dark:bg-ink-950 sm:h-full sm:rounded-[28px]'
        }
        onClick={e => e.stopPropagation()}
      >
        <BrandModalHeader
          title="Estadísticas"
          subtitle="Asistencia por temporada"
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
            </svg>
          }
          actions={fullBtn}
          onClose={onClose}
        />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className={`mx-auto w-full p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6 ${full ? 'max-w-[1700px] sm:p-10' : 'max-w-6xl'}`}>
            {body}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AttendanceStatsPanel;
