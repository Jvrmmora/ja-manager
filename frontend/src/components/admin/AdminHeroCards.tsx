import React, { useEffect, useMemo, useState } from 'react';
import type { IYoung, ILeaderboardEntry } from '../../types';
import { getCurrentQR, getQRStats } from '../../services/api';
import { QRCountdown } from '../QRCountdown';
import {
  isExpired,
  getCurrentMonthColombia,
  getCurrentDateTimeColombia,
  parseYYYYMMDD,
} from '../../utils/dateUtils';
import { initialsOf } from '../young/useYoungActions';

// ───────────────────────── Gestión QR (la tarjeta más llamativa) ─────────────────────────

export const AdminQRCard: React.FC<{
  refreshKey: number;
  onOpenQR: () => void;
  onOpenAttendance: () => void;
}> = ({ refreshKey, onOpenQR, onOpenAttendance }) => {
  const [qr, setQr] = useState<{ expiresAt: string } | null>(null);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await getCurrentQR();
        if (!mounted) return;
        setQr(data?.qrCode || null);
        const stats = await getQRStats().catch(() => null);
        if (mounted) setCount(stats?.attendanceCount ?? null);
      } catch {
        if (mounted) setQr(null);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [refreshKey]);

  const active = qr && !isExpired(qr.expiresAt);

  return (
    <div className="relative min-h-[260px] lg:h-[300px]">
      {active && (
        <span className="pointer-events-none absolute inset-0 rounded-[30px] border-2 border-brand-amber/70 motion-safe:animate-pulse-ring" />
      )}
      <div className="bg-fire-bright relative flex h-full flex-col justify-between gap-5 overflow-hidden rounded-[30px] p-6 text-white shadow-[0_30px_70px_-24px_rgba(242,106,46,0.6)] sm:p-7">
        <span className="pointer-events-none absolute -bottom-1/4 -top-1/4 left-0 w-24 bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.2),rgba(255,255,255,0))] motion-safe:animate-sheen" />
        <span className="relative flex flex-wrap items-center justify-between gap-2">
          <span className="font-display text-[13px] uppercase tracking-[0.24em] text-white/85">
            Asistencia de hoy
          </span>
          <span className="inline-flex h-8 items-center gap-2 rounded-full border border-white/25 bg-ink-950/35 px-3 text-[13px] font-semibold">
            {active ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-400 motion-safe:animate-glow-green" />
                QR activo · expira en <QRCountdown expiresAt={qr.expiresAt} variant="inline" />
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-white/50" />
                {qr ? 'El QR expiró' : 'Sin QR hoy'}
              </>
            )}
          </span>
        </span>
        <span className="relative flex items-center gap-5">
          <span className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center rounded-3xl bg-white text-[#B3243B] shadow-[0_16px_32px_-12px_rgba(20,11,16,0.5)] sm:h-[88px] sm:w-[88px]">
            <svg className="h-10 w-10 sm:h-12 sm:w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="5" height="5" rx="1" />
              <rect x="16" y="3" width="5" height="5" rx="1" />
              <rect x="3" y="16" width="5" height="5" rx="1" />
              <path d="M21 16h-3a2 2 0 0 0-2 2v3M21 21v.01M12 7v3a2 2 0 0 1-2 2H7M3 12h.01M12 3h.01M12 16v.01M16 12h1M21 12v.01M12 21v-1" />
            </svg>
          </span>
          <span className="flex flex-col gap-1.5">
            <span className="font-display text-[34px] font-bold uppercase leading-[0.95] sm:text-[42px]">
              Gestión QR
            </span>
            <span className="text-sm text-white/90">
              {active ? (
                <>
                  <strong>{count ?? '—'}</strong> jóvenes registrados hoy
                </>
              ) : (
                'Genera el código del día para registrar asistencia'
              )}
            </span>
          </span>
        </span>
        <span className="relative flex gap-2.5">
          <button
            type="button"
            onClick={onOpenQR}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-white text-[15px] font-bold text-[#B3243B] transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
          >
            {active ? 'Ver código QR' : 'Generar QR'}
          </button>
          <button
            type="button"
            onClick={onOpenAttendance}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] border border-white/40 text-[15px] font-semibold text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
          >
            Asistencias
          </button>
        </span>
      </div>
    </div>
  );
};

// ───────────────────────── Ranking ─────────────────────────

export const AdminRankingCard: React.FC<{
  leaderboard: ILeaderboardEntry[];
  seasonName?: string | undefined;
  onViewRanking: () => void;
  onOpenSeasons: () => void;
}> = ({ leaderboard, seasonName, onViewRanking, onOpenSeasons }) => {
  const top = useMemo(
    () => [...leaderboard].sort((a, b) => a.currentRank - b.currentRank).slice(0, 3),
    [leaderboard]
  );
  const podium: Array<[ILeaderboardEntry | undefined, string, string, string]> = [
    [top[1], 'h-[42px] w-[42px] border-[#CBD5E1]', 'h-[38px] w-16 bg-[#CBD5E1]/20 text-[#CBD5E1]', '2'],
    [top[0], 'h-[52px] w-[52px] border-brand-amber', 'h-14 w-[70px] bg-brand-amber/25 text-brand-amber', '1'],
    [top[2], 'h-[42px] w-[42px] border-[#D97745]', 'h-7 w-16 bg-[#D97745]/20 text-[#E8A27A]', '3'],
  ];

  return (
    <article className="relative flex min-h-[260px] flex-col gap-3.5 overflow-hidden rounded-[30px] bg-ink-900 p-6 text-white shadow-[0_30px_60px_-30px_rgba(20,11,16,0.7)] sm:p-7 lg:h-[300px]">
      <div className="pointer-events-none absolute -right-28 -top-36 h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(249,162,59,.3)_0%,rgba(30,18,24,0)_65%)]" />
      <span className="relative flex items-center justify-between gap-2">
        <span className="flex items-center gap-2.5 text-sm font-semibold text-white/75">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-amber/15 text-brand-amber">
            <TrophyIcon className="h-[18px] w-[18px]" />
          </span>
          Ranking
        </span>
        <span className="truncate text-xs text-white/55">
          {seasonName ? `${seasonName} · ` : ''}
          {leaderboard.length} participantes
        </span>
      </span>
      <span className="relative flex flex-1 items-end justify-center gap-2.5">
        {top.length === 0 ? (
          <span className="self-center text-sm text-white/55">Aún no hay puntos esta temporada</span>
        ) : (
          podium.map(([entry, avatar, bar, n]) =>
            entry ? (
              <span key={n} className="flex min-w-0 flex-col items-center gap-1.5">
                <span className={`flex items-center justify-center overflow-hidden rounded-full border-2 bg-ink-800 text-xs font-bold ${avatar}`}>
                  {entry.profileImage ? (
                    <img src={entry.profileImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initialsOf(entry.youngName)
                  )}
                </span>
                <span className="max-w-[80px] truncate text-[11px] text-white/75">
                  {entry.youngName.split(' ')[0]}
                </span>
                <span className={`flex items-center justify-center rounded-t-[10px] font-display ${bar}`}>{n}</span>
              </span>
            ) : null
          )
        )}
      </span>
      <span className="relative flex gap-2.5">
        <button
          type="button"
          onClick={onViewRanking}
          className="bg-gold inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] font-display text-lg font-semibold uppercase tracking-[0.06em] text-ink-950 transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-10px_rgba(249,162,59,0.8)] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-amber/40"
        >
          Ver ranking
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onOpenSeasons}
          aria-label="Gestionar temporadas"
          title="Gestionar temporadas"
          className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-white/20 text-white transition-colors hover:border-white/50"
        >
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </button>
      </span>
    </article>
  );
};

// ───────────────────────── Cumpleaños del mes ─────────────────────────

const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

const birthdayDate = (value: string | Date) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)
    ? parseYYYYMMDD(value.split('T')[0] as string)
    : new Date(value);

export const AdminBirthdayCard: React.FC<{
  youngList: IYoung[];
  onOpen: () => void;
  onOpenStats: () => void;
}> = ({ youngList, onOpen, onOpenStats }) => {
  const month = getCurrentMonthColombia();
  const today = getCurrentDateTimeColombia().getDate();
  const monthName = new Date().toLocaleDateString('es-CO', { month: 'long' });

  const list = useMemo(() => {
    return youngList
      .filter(y => y.birthday && birthdayDate(y.birthday).getMonth() === month)
      .map(y => ({ young: y, day: birthdayDate(y.birthday).getDate() }))
      .sort((a, b) => a.day - b.day);
  }, [youngList, month]);

  const upcoming = list.filter(b => b.day >= today).slice(0, 3);

  return (
    <article className="flex min-h-[260px] flex-col gap-3.5 rounded-[30px] border border-sand-200 bg-white p-6 shadow-[0_20px_40px_-30px_rgba(78,15,58,0.4)] sm:p-7 lg:h-[300px] dark:border-white/10 dark:bg-ink-900">
      <span className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3.5 text-sm font-semibold text-cocoa-500 dark:text-white/65">
          <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-[#F6E1E8] text-brand-wine dark:bg-brand-wine/25 dark:text-[#F4A3C0]">
            <CakeIcon className="h-8 w-8" />
          </span>
          <span className="capitalize">Cumpleaños de {monthName}</span>
        </span>
        <span className="flex flex-shrink-0 flex-col items-end leading-none">
          <span className="font-display text-[56px] font-bold text-brand-deep dark:text-brand-amber">
            {list.length}
          </span>
          <span className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-cocoa-400 dark:text-white/50">
            este mes
          </span>
        </span>
      </span>
      <span className="flex flex-col gap-2">
        {upcoming.length === 0 ? (
          <span className="py-3 text-sm text-cocoa-400 dark:text-white/50">
            No quedan cumpleaños este mes
          </span>
        ) : (
          upcoming.map(({ young, day }) => {
            const isToday = day === today;
            return (
              <span key={young.id} className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 flex-shrink-0 flex-col items-center justify-center rounded-xl leading-none ${
                    isToday ? 'bg-ink-950 text-white' : 'bg-sand-50 text-cocoa-900 dark:bg-white/5 dark:text-white'
                  }`}
                >
                  <span className="font-display text-base font-semibold">{day}</span>
                  <span className={`text-[8px] font-bold tracking-[0.1em] ${isToday ? 'text-brand-amber' : 'text-brand-deep dark:text-brand-amber'}`}>
                    {MONTHS[month]}
                  </span>
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-cocoa-900 dark:text-white">
                  {young.fullName}
                </span>
                {isToday ? (
                  <span className="bg-fire inline-flex h-6 items-center rounded-full px-2.5 text-xs font-bold text-white">
                    Hoy
                  </span>
                ) : (
                  <span className="text-xs text-cocoa-400 dark:text-white/50">
                    En {day - today} {day - today === 1 ? 'día' : 'días'}
                  </span>
                )}
              </span>
            );
          })
        )}
      </span>
      <span className="mt-auto flex gap-2.5">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-[14px] bg-ink-950 text-sm font-semibold text-white transition-colors hover:bg-ink-800 dark:bg-white dark:text-ink-950"
        >
          Ver cumpleaños
        </button>
        <button
          type="button"
          onClick={onOpenStats}
          className="inline-flex h-11 items-center gap-1.5 rounded-[14px] border border-sand-300 px-4 text-sm font-semibold text-cocoa-600 transition-colors hover:border-cocoa-400 dark:border-white/15 dark:text-white/80"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 3v18h18M7 15l4-4 3 3 5-6" />
          </svg>
          <span className="hidden sm:inline">Estadísticas</span>
        </button>
      </span>
    </article>
  );
};

const TrophyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

export const CakeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1M2 21h20M7 8v3M12 8v3M17 8v3M7 4h.01M12 4h.01M17 4h.01" />
  </svg>
);
