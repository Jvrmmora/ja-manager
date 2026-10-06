import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { apiRequest } from '../services/api';
import type { IYoung } from '../types';
import {
  formatBirthday,
  parseYYYYMMDD,
  getCurrentDateTimeColombia,
} from '../utils/dateUtils';
import ImageModal from './ImageModal';
import ShareLinkButton from './ShareLinkButton';
import { birthdayShareMessage, buildBirthdayShareUrl } from '../utils/shareUrls';

interface BirthdayBoardFullscreenProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGroup?: number; // Grupo inicial (nivel)
  currentMonthOnly?: boolean; // Bloquear a mes actual (oculta selector)
  fixedGroup?: number; // Fijar grupo y ocultar selector
  defaultMonth?: number; // Mes inicial 0-11 (enlace compartido)
  fixedMonth?: number; // Fijar mes 0-11 y ocultar selector
}

// Vista de "tarjeta" pantalla completa con selección de mes y grupo.
// Muestra solo: foto perfil, nombre y fecha (día y mes).
// Confetti periódico y título "Feliz Cumpleaños!!".
const BirthdayBoardFullscreen: React.FC<BirthdayBoardFullscreenProps> = ({
  isOpen,
  onClose,
  defaultGroup = 1,
  currentMonthOnly = false,
  fixedGroup,
  defaultMonth,
  fixedMonth,
}) => {
  const lockedMonth =
    typeof fixedMonth === 'number'
      ? fixedMonth
      : currentMonthOnly
        ? new Date().getMonth()
        : undefined;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [allYoung, setAllYoung] = useState<IYoung[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(
    lockedMonth ?? defaultMonth ?? new Date().getMonth()
  );
  const [selectedGroup, setSelectedGroup] = useState<number>(
    fixedGroup ?? defaultGroup
  );
  const [imageModal, setImageModal] = useState<{
    open: boolean;
    url: string;
    name: string;
  }>({ open: false, url: '', name: '' });
  const confettiIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  useEffect(() => {
    if (!isOpen) return;
    // Lock month if requested (mes actual o mes fijo del enlace)
    if (typeof lockedMonth === 'number') {
      setSelectedMonth(lockedMonth);
    }
    // Lock group if fixed
    if (typeof fixedGroup === 'number') {
      setSelectedGroup(fixedGroup);
    }
    fetchGroupData(typeof fixedGroup === 'number' ? fixedGroup : selectedGroup);
    startConfettiLoop();
    return () => stopConfettiLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Refetch when group changes (if open)
  useEffect(() => {
    if (!isOpen) return;
    if (typeof fixedGroup === 'number') {
      // When fixed, refetch if prop changes
      fetchGroupData(fixedGroup);
    } else {
      fetchGroupData(selectedGroup);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup]);

  const fetchGroupData = async (group: number) => {
    setLoading(true);
    setError('');
    try {
      const perPage = 100; // backend limit
      let page = 1;
      let hasNext = true;
      const acc: IYoung[] = [];

      while (hasNext) {
        const response = await apiRequest(
          `young?page=${page}&limit=${perPage}&groups=${group}`
        );
        const json = await response.json();
        if (!response.ok || !json.success) {
          throw new Error(json.message || 'Error obteniendo jóvenes');
        }
        const chunk: IYoung[] = json.data?.data || [];
        acc.push(...chunk);
        const pag = json.data?.pagination || {};
        hasNext = Boolean(pag.hasNextPage || pag.hasNext || false);
        page += 1;
        if (page > 50) break; // safety
      }

      setAllYoung(acc);
    } catch (e: any) {
      setError(e.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const startConfettiLoop = () => {
    launchConfetti();
    confettiIntervalRef.current = setInterval(() => launchConfetti(), 9000);
  };

  const stopConfettiLoop = () => {
    if (confettiIntervalRef.current) {
      clearInterval(confettiIntervalRef.current);
      confettiIntervalRef.current = null;
    }
  };

  const launchConfetti = () => {
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { x: 0.5, y: 0.2 },
      colors: ['#F9A23B', '#F26A2E', '#DC3340', '#FDE68A', '#F4A3C0', '#FFFFFF'],
      gravity: 0.6,
      scalar: 0.9,
      ticks: 250,
      startVelocity: 30,
      disableForReducedMotion: true,
    });
  };

  if (!isOpen) return null;

  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  const filteredBirthdays = allYoung
    .filter(y => {
      if (!y.birthday) return false;
      try {
        let date: Date;
        if (
          typeof y.birthday === 'string' &&
          /^\d{4}-\d{2}-\d{2}/.test(y.birthday)
        ) {
          date = parseYYYYMMDD(y.birthday.split('T')[0]);
        } else {
          date = new Date(y.birthday);
        }
        return date.getMonth() === selectedMonth;
      } catch {
        return false;
      }
    })
    .sort((a, b) => {
      const getDay = (d: Date | string): number => {
        let dt: Date;
        if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
          dt = parseYYYYMMDD(d.split('T')[0]);
        } else {
          dt = new Date(d);
        }
        return dt.getDate();
      };
      return getDay(a.birthday) - getDay(b.birthday);
    });

  const today = getCurrentDateTimeColombia();
  const isCurrentMonth = selectedMonth === today.getMonth();
  const monthAbbr = monthNames[selectedMonth]?.slice(0, 3).toUpperCase();
  const dayOf = (d: Date | string) =>
    (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)
      ? parseYYYYMMDD(d.split('T')[0] as string)
      : new Date(d)
    ).getDate();
  const groupNow = typeof fixedGroup === 'number' ? fixedGroup : selectedGroup;
  // Misma regla del backend: reclamó si la última reclamación es de este año
  const hasClaimed = (y: IYoung) =>
    !!y.birthdayPointsClaimed &&
    new Date(y.birthdayPointsClaimed).getFullYear() === today.getFullYear();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const alreadyHappened = (day: number) =>
    new Date(today.getFullYear(), selectedMonth, day) <= startOfToday;
  const claimedCount = filteredBirthdays.filter(hasClaimed).length;

  return (
    <div
      className="dark fixed inset-0 z-[60] flex flex-col overflow-hidden bg-ink-950 text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Feliz cumpleaños"
    >
      <div className="pointer-events-none absolute left-1/4 -top-[560px] h-[1000px] w-[1000px] rounded-full bg-[radial-gradient(circle,rgba(242,106,46,.3)_0%,rgba(138,28,69,.2)_40%,rgba(20,11,16,0)_68%)] motion-safe:animate-ember" />

      {/* Cabecera */}
      <div className="relative flex flex-wrap items-center justify-between gap-4 px-5 pt-6 sm:px-10 lg:px-14 lg:pt-8">
        <div className="flex items-center gap-4 sm:gap-5">
          <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-brand-orange via-[#B3243B] to-brand-wine shadow-[0_20px_40px_-16px_rgba(242,106,46,0.7)] sm:h-[72px] sm:w-[72px]">
            <svg className="h-8 w-8 sm:h-[38px] sm:w-[38px]" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1M2 21h20M7 8v3M12 8v3M17 8v3M7 4h.01M12 4h.01M17 4h.01" />
            </svg>
          </span>
          <div>
            <h1 className="m-0 font-display text-4xl font-bold uppercase leading-[0.95] sm:text-5xl lg:text-[60px]">
              ¡Feliz <span className="bg-[linear-gradient(100deg,#FDE68A_0%,#F9A23B_30%,#F26A2E_60%,#DC3340_100%)] bg-clip-text text-transparent">cumpleaños!</span>
            </h1>
            <p className="m-0 mt-1 text-base text-white/65 sm:text-lg">
              Los que celebran en <strong className="text-white">{monthNames[selectedMonth]}</strong> · Grupo {groupNow}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {typeof fixedGroup !== 'number' && (
            <label className="flex h-12 items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] pl-4 pr-1.5 text-sm text-white/70">
              Grupo
              <select
                value={selectedGroup}
                onChange={e => setSelectedGroup(Number(e.target.value))}
                className="h-[38px] rounded-full border-0 bg-ink-800 px-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-amber"
                title="Filtrar por grupo"
              >
                {[1, 2, 3, 4, 5].map(g => (
                  <option key={g} value={g}>
                    Grupo {g}
                  </option>
                ))}
              </select>
            </label>
          )}
          <ShareLinkButton
            url={buildBirthdayShareUrl(selectedMonth, groupNow)}
            message={birthdayShareMessage(
              buildBirthdayShareUrl(selectedMonth, groupNow),
              selectedMonth
            )}
            title="Cumpleaños del mes — Jóvenes Modelia"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            title="Cerrar"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-white/50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Meses */}
      {typeof lockedMonth !== 'number' && (
        <div className="relative grid grid-cols-6 gap-2 px-5 pt-5 sm:px-10 lg:grid-cols-12 lg:px-14">
          {monthNames.map((m, idx) => {
            const active = idx === selectedMonth;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMonth(idx)}
                aria-pressed={active}
                className={`h-10 rounded-xl border text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber ${
                  active
                    ? 'border-brand-amber bg-brand-amber text-ink-950'
                    : 'border-white/10 bg-white/[0.06] text-white/80 hover:bg-white/10'
                }`}
              >
                {m.slice(0, 3)}
              </button>
            );
          })}
        </div>
      )}

      {/* Contenido */}
      <div className="relative flex-1 overflow-y-auto px-5 py-6 sm:px-10 lg:px-14">
        {loading && (
          <div className="py-24 text-center">
            <span className="mx-auto mb-6 block h-16 w-16 animate-spin rounded-full border-[6px] border-white/10 border-t-brand-amber" />
            <p className="m-0 text-sm text-white/70">Cargando cumpleaños...</p>
          </div>
        )}
        {error && !loading && (
          <div className="py-12 text-center font-medium text-red-300">{error}</div>
        )}
        {!loading && !error && filteredBirthdays.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <p className="m-0 text-base font-medium text-white/70">
              No hay cumpleaños en {monthNames[selectedMonth]} para este grupo.
            </p>
          </div>
        )}
        {!loading && !error && filteredBirthdays.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
            {filteredBirthdays.map(y => {
              const day = dayOf(y.birthday);
              const isToday = isCurrentMonth && day === today.getDate();
              const claimed = hasClaimed(y);
              const pending = !claimed && alreadyHappened(day);
              return (
                <div
                  key={y.id}
                  className={`group relative flex flex-col items-center gap-2 rounded-[26px] border px-3 pb-5 pt-10 text-center transition-all duration-300 hover:-translate-y-1 ${
                    isToday
                      ? 'border-brand-amber/80 bg-[linear-gradient(160deg,rgba(249,162,59,.24),rgba(220,51,64,.1))] shadow-[0_20px_60px_-20px_rgba(249,162,59,0.6)]'
                      : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02))] hover:border-white/20 hover:shadow-[0_24px_48px_-28px_rgba(242,106,46,0.55)]'
                  }`}
                >
                  <span className="absolute left-3.5 top-3.5 flex h-[46px] w-[46px] flex-col items-center justify-center rounded-[14px] bg-gradient-to-br from-brand-orange to-[#B3243B] leading-none shadow-[0_8px_20px_-8px_rgba(220,51,64,0.8)]">
                    <span className="font-display text-xl font-semibold">{day}</span>
                    <span className="text-[8px] font-bold tracking-[0.1em] text-[#FDE68A]">{monthAbbr}</span>
                  </span>
                  {isToday && (
                    <span className="absolute right-3.5 top-4 flex h-[26px] items-center rounded-full bg-[#FDE68A] px-2.5 text-xs font-extrabold text-ink-950">
                      ¡HOY!
                    </span>
                  )}
                  <span className="relative">
                  <button
                    type="button"
                    className={`h-24 w-24 rounded-full bg-[linear-gradient(135deg,#FDE68A,#F9A23B,#DC3340,#8A1C45)] p-1 sm:h-[104px] sm:w-[104px] ${
                      y.profileImage ? 'group/photo cursor-pointer' : 'cursor-default'
                    }`}
                    onClick={() => {
                      if (y.profileImage) {
                        setImageModal({ open: true, url: y.profileImage, name: y.fullName });
                      }
                    }}
                    title={y.profileImage ? 'Ver foto en grande' : ''}
                    aria-label={y.profileImage ? `Ver foto de ${y.fullName}` : y.fullName}
                  >
                    <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[3px] border-ink-950 bg-ink-800 font-display text-3xl">
                      {y.profileImage ? (
                        <>
                          <img
                            src={y.profileImage}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-300 group-hover/photo:scale-110"
                          />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover/photo:bg-black/50 group-focus-visible/photo:bg-black/50">
                            <svg className="h-7 w-7 text-white opacity-0 transition-opacity duration-300 group-hover/photo:opacity-100 group-focus-visible/photo:opacity-100" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </span>
                        </>
                      ) : (
                        y.fullName
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map(w => w[0]?.toUpperCase())
                          .join('')
                      )}
                    </span>
                  </button>
                  {claimed && (
                    <span
                      className="absolute bottom-0.5 right-0.5 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-ink-950 bg-emerald-500 text-white shadow-[0_6px_16px_-4px_rgba(16,185,129,0.7)]"
                      title="Ya reclamó sus puntos de cumpleaños"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                  </span>
                  <h3 className="m-0 mt-1 line-clamp-2 px-2 text-base font-bold leading-snug sm:text-[19px]">
                    {y.fullName}
                  </h3>
                  <p className="m-0 text-sm text-white/60">{formatBirthday(y.birthday)}</p>
                  {claimed ? (
                    <span className="mt-0.5 inline-flex h-6 items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 text-[11px] font-bold text-emerald-300">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      Puntos reclamados
                    </span>
                  ) : pending ? (
                    <span className="mt-0.5 inline-flex h-6 items-center rounded-full border border-white/10 px-2.5 text-[11px] font-semibold text-white/50">
                      Sin reclamar
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pie */}
      <div className="relative flex flex-shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-black/25 px-5 py-4 text-sm sm:px-10 lg:px-14">
        <p className="m-0 text-white/70">
          <strong className="text-brand-amber">{filteredBirthdays.length}</strong> cumpleaños en{' '}
          {monthNames[selectedMonth]} (Grupo {groupNow})
          {filteredBirthdays.length > 0 && (
            <>
              {' · '}
              <strong className="text-emerald-300">{claimedCount}</strong> reclamaron sus puntos
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => {
            // Refresco manual de datos del grupo actual
            fetchGroupData(groupNow);
          }}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-4 font-semibold transition-colors hover:border-white/50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />
          </svg>
          Refrescar
        </button>
      </div>

      {/* Modal para ver foto en grande */}
      {imageModal.open && (
        <ImageModal
          isOpen={imageModal.open}
          onClose={() => setImageModal({ open: false, url: '', name: '' })}
          imageUrl={imageModal.url}
          altText={`Foto de perfil de ${imageModal.name}`}
        />
      )}
    </div>
  );
};

export default BirthdayBoardFullscreen;
