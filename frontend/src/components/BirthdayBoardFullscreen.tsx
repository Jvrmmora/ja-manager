import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useReducedMotion } from 'framer-motion';
import { apiRequest } from '../services/api';
import type { IYoung } from '../types';
import { getCurrentDateTimeColombia, getCurrentMonthColombia } from '../utils/dateUtils';
import {
  birthdayInYear,
  birthdaysInPeriod,
  daysUntilBirthday,
  initialSlideIndex,
  monthsOfSemester,
  semesterOfMonth,
  type BirthdayPeriod,
  type Semester,
} from '../utils/birthdayPeriods';
import {
  MONTH_NAMES,
  birthdayShareMessage,
  birthdaySemesterShareMessage,
  buildBirthdayShareUrl,
  buildBirthdaySemesterShareUrl,
} from '../utils/shareUrls';
import ImageModal from './ImageModal';
import ShareLinkButton from './ShareLinkButton';
import BirthdayCarousel from './birthdays/BirthdayCarousel';
import type { BirthdayCardModel } from './birthdays/BirthdayCard';
import {
  BirthdayPeriodPicker,
  PeriodModeToggle,
  type BoardMode,
  type TimelineMonth,
} from './birthdays/BirthdayPeriodPicker';
import { useAutoplay } from './birthdays/useAutoplay';

interface BirthdayBoardFullscreenProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGroup?: number; // Grupo inicial (nivel)
  currentMonthOnly?: boolean; // Bloquear a mes actual (oculta selector)
  fixedGroup?: number; // Fijar grupo y ocultar selector
  defaultMonth?: number; // Mes inicial 0-11 (enlace compartido)
  fixedMonth?: number; // Fijar mes 0-11 y ocultar selector
  defaultSemester?: Semester; // Semestre inicial (enlace ?semestre=)
  fixedSemester?: Semester; // Fijar semestre y ocultar selector
}

const SLIDE_MS = 6000;
const CONFETTI_COLORS = ['#F9A23B', '#F26A2E', '#DC3340', '#FDE68A', '#F4A3C0', '#FFFFFF'];
const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const SEMESTER_TEXT: Record<Semester, { name: string; range: string }> = {
  1: { name: '1.er semestre', range: 'enero a junio' },
  2: { name: '2.º semestre', range: 'julio a diciembre' },
};

const launchConfetti = () => {
  confetti({
    particleCount: 70,
    spread: 70,
    origin: { x: 0.5, y: 0.2 },
    colors: CONFETTI_COLORS,
    gravity: 0.6,
    scalar: 0.9,
    ticks: 250,
    startVelocity: 30,
    disableForReducedMotion: true,
  });
};

/** Ráfaga desde los dos lados cuando pasa al frente alguien que cumple hoy. */
const launchTodayBurst = () => {
  const shared = {
    particleCount: 90,
    spread: 65,
    startVelocity: 48,
    ticks: 260,
    colors: CONFETTI_COLORS,
    disableForReducedMotion: true,
  };
  confetti({ ...shared, angle: 60, origin: { x: 0, y: 0.7 } });
  confetti({ ...shared, angle: 120, origin: { x: 1, y: 0.7 } });
};

const CakeIcon: React.FC<{ className: string; strokeWidth?: number }> = ({ className, strokeWidth = 1.6 }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1M2 21h20M7 8v3M12 8v3M17 8v3M7 4h.01M12 4h.01M17 4h.01" />
  </svg>
);

const GroupPicker: React.FC<{ value: number; onChange: (group: number) => void; className: string }> = ({
  value,
  onChange,
  className,
}) => (
  <label className={`items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] py-1 pl-4 pr-1 text-sm text-white/70 ${className}`}>
    Grupo
    <select
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      title="Filtrar por grupo"
      className="h-10 rounded-full border-0 bg-ink-800 px-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-amber sm:h-11"
    >
      {[1, 2, 3, 4, 5].map(g => (
        <option key={g} value={g}>
          Grupo {g}
        </option>
      ))}
    </select>
  </label>
);

// Pantalla completa de cumpleaños en "cinta": varias tarjetas a la vez con la
// del frente centrada, por mes o por semestre (ene-jun / jul-dic) y grupo.
// Avanza sola cada 6 s, con confeti de fondo y ráfaga para quien cumple hoy.
const BirthdayBoardFullscreen: React.FC<BirthdayBoardFullscreenProps> = ({
  isOpen,
  onClose,
  defaultGroup = 1,
  currentMonthOnly = false,
  fixedGroup,
  defaultMonth,
  fixedMonth,
  defaultSemester,
  fixedSemester,
}) => {
  const lockedMonth =
    typeof fixedMonth === 'number'
      ? fixedMonth
      : currentMonthOnly
        ? getCurrentMonthColombia()
        : undefined;
  const monthLocked = typeof lockedMonth === 'number';
  const semesterLocked = typeof fixedSemester === 'number';
  const groupLocked = typeof fixedGroup === 'number';
  const canSwitchMode = !monthLocked && !semesterLocked;

  const [today] = useState(getCurrentDateTimeColombia);
  const [mode, setMode] = useState<BoardMode>(() =>
    semesterLocked ? 'semester' : monthLocked ? 'month' : defaultSemester ? 'semester' : 'month'
  );
  const [month, setMonth] = useState(() => lockedMonth ?? defaultMonth ?? today.getMonth());
  const [semester, setSemester] = useState<Semester>(
    () => fixedSemester ?? defaultSemester ?? semesterOfMonth(today.getMonth())
  );
  const [selectedGroup, setSelectedGroup] = useState(fixedGroup ?? defaultGroup);
  const [allYoung, setAllYoung] = useState<IYoung[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion() ?? false;
  const [paused, setPaused] = useState(reduceMotion);
  const [hovering, setHovering] = useState(false);
  const [photo, setPhoto] = useState<{ url: string; name: string } | null>(null);

  const groupNow = fixedGroup ?? selectedGroup;

  // Con "reducir movimiento" la cinta no avanza sola (se puede reanudar a mano)
  useEffect(() => {
    if (reduceMotion) setPaused(true);
  }, [reduceMotion]);

  // Todos los jóvenes del grupo; el mes/semestre se filtra aquí mismo
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const perPage = 100; // límite del backend
        const acc: IYoung[] = [];
        for (let page = 1; page <= 50; page += 1) {
          const response = await apiRequest(`young?page=${page}&limit=${perPage}&groups=${groupNow}`);
          const json = await response.json();
          if (!response.ok || !json.success) {
            throw new Error(json.message || 'Error obteniendo jóvenes');
          }
          acc.push(...((json.data?.data as IYoung[] | undefined) ?? []));
          const pagination = json.data?.pagination ?? {};
          if (!(pagination.hasNextPage || pagination.hasNext)) break;
        }
        if (!cancelled) setAllYoung(acc);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error cargando datos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, groupNow, reloadKey]);

  const period = useMemo<BirthdayPeriod>(
    () => (mode === 'month' ? { kind: 'month', month } : { kind: 'semester', semester }),
    [mode, month, semester]
  );
  const entries = useMemo(() => birthdaysInPeriod(allYoung, period), [allYoung, period]);

  const cards = useMemo<BirthdayCardModel[]>(
    () =>
      entries.map((entry, i): BirthdayCardModel => {
        const diff = daysUntilBirthday(entry, today);
        const monthName = MONTH_NAMES[entry.month] ?? '';
        // Misma regla del backend: reclamó si la última reclamación es de este año
        const claimed =
          !!entry.young.birthdayPointsClaimed &&
          new Date(entry.young.birthdayPointsClaimed).getFullYear() === today.getFullYear();
        return {
          key: entry.young.id ?? `${entry.young.fullName}-${i}`,
          young: entry.young,
          month: entry.month,
          day: entry.day,
          monthAbbr: monthName.slice(0, 3).toUpperCase(),
          weekday: WEEKDAYS[birthdayInYear(entry, today.getFullYear()).getDay()] ?? '',
          dateLabel: `${entry.day} de ${monthName.toLowerCase()}`,
          isToday: diff === 0,
          status: claimed
            ? { kind: 'claimed' }
            : diff <= 0
              ? { kind: 'pending' }
              : { kind: 'upcoming', label: diff === 1 ? 'Mañana' : diff <= 31 ? `En ${diff} días` : 'Próximamente' },
        };
      }),
    [entries, today]
  );

  // Al cambiar de período, grupo o datos: arranca en el cumpleaños de hoy o el próximo
  useEffect(() => {
    setIndex(initialSlideIndex(entries, period, { month: today.getMonth(), day: today.getDate() }));
  }, [entries, period, today]);

  const count = cards.length;
  const safeIndex = count ? Math.min(index, count - 1) : 0;
  const current = cards[safeIndex];

  const step = useCallback(
    (direction: 1 | -1) =>
      setIndex(i => (count ? (Math.min(i, count - 1) + direction + count) % count : 0)),
    [count]
  );
  const advance = useCallback(() => step(1), [step]);

  const running = isOpen && !paused && !hovering && !photo && !loading && count > 1;
  const progressRef = useAutoplay({
    running,
    duration: SLIDE_MS,
    resetKey: `${safeIndex}|${count}|${mode}|${month}|${semester}`,
    onAdvance: advance,
  });

  // Lo que usa el teclado, al día sin volver a registrar los listeners
  const keyboardRef = useRef({ photoOpen: false, onClose, step });
  useEffect(() => {
    keyboardRef.current = { photoOpen: photo !== null, onClose, step };
  });

  // Teclado: ← → navegan y Escape cierra. Con la foto ampliada abierta la tecla
  // es de ella (se cierra sola con Escape): se revisa en la fase de captura,
  // antes de que la foto se cierre y React re-renderice a mitad del evento.
  useEffect(() => {
    if (!isOpen) return;
    let photoWasOpen = false;
    const onKeyCapture = () => {
      photoWasOpen = keyboardRef.current.photoOpen;
    };
    const onKey = (e: KeyboardEvent) => {
      if (photoWasOpen) return;
      const { onClose: close, step: move } = keyboardRef.current;
      if (e.key === 'Escape') {
        close();
        return;
      }
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        move(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        move(-1);
      }
    };
    window.addEventListener('keydown', onKeyCapture, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKeyCapture, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  // Confeti suave de fondo mientras la vista está abierta
  useEffect(() => {
    if (!isOpen) return;
    launchConfetti();
    const id = setInterval(launchConfetti, 9000);
    return () => clearInterval(id);
  }, [isOpen]);

  const todayKey = current?.isToday ? current.key : null;
  useEffect(() => {
    if (isOpen && todayKey) launchTodayBurst();
  }, [isOpen, todayKey]);

  // Precarga las fotos que vienen para que no aparezcan a medio cargar
  useEffect(() => {
    if (count < 2) return;
    [1, 2, -1].forEach(offset => {
      const url = cards[(safeIndex + offset + count) % count]?.young.profileImage;
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }, [cards, count, safeIndex]);

  const timeline = useMemo<TimelineMonth[]>(() => {
    if (mode !== 'semester') return [];
    const focusMonth = cards[safeIndex]?.month;
    return monthsOfSemester(semester).map(m => {
      const indexes = cards.flatMap((card, i) => (card.month === m ? [i] : []));
      const active = focusMonth === m;
      const position = indexes.indexOf(safeIndex);
      return {
        month: m,
        count: indexes.length,
        firstIndex: indexes[0] ?? -1,
        active,
        progress: !indexes.length
          ? 0
          : active
            ? (position + 1) / indexes.length
            : typeof focusMonth === 'number' && m < focusMonth
              ? 1
              : 0,
      };
    });
  }, [mode, semester, cards, safeIndex]);

  if (!isOpen) return null;

  const changeMode = (next: BoardMode) => {
    if (next === mode) return;
    // Mes → semestre: el semestre del mes que se veía; semestre → mes: el mes de la tarjeta del frente
    if (next === 'semester') setSemester(semesterOfMonth(current?.month ?? month));
    else if (current) setMonth(current.month);
    setMode(next);
  };

  const monthName = MONTH_NAMES[month] ?? '';
  const periodLabel = mode === 'month' ? monthName.toLowerCase() : `el ${SEMESTER_TEXT[semester].name}`;
  const shareUrl =
    mode === 'month' ? buildBirthdayShareUrl(month, groupNow) : buildBirthdaySemesterShareUrl(semester, groupNow);
  const shareMessage =
    mode === 'month' ? birthdayShareMessage(shareUrl, month) : birthdaySemesterShareMessage(shareUrl, semester);
  const claimedCount = cards.filter(card => card.status.kind === 'claimed').length;
  const canChangeFilters = canSwitchMode || !groupLocked;
  const showPeriodRow = mode === 'semester' || !monthLocked || !groupLocked;
  const mobileGroupPicker = groupLocked ? null : (
    <GroupPicker value={selectedGroup} onChange={setSelectedGroup} className="flex sm:hidden" />
  );

  return (
    <div
      className="dark fixed inset-0 z-[60] flex flex-col overflow-hidden bg-ink-950 text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Feliz cumpleaños"
    >
      <div className="pointer-events-none absolute left-1/4 -top-[560px] h-[1000px] w-[1000px] rounded-full bg-[radial-gradient(circle,rgba(242,106,46,.3)_0%,rgba(138,28,69,.2)_40%,rgba(20,11,16,0)_68%)] motion-safe:animate-ember" />

      {/* Cabecera: en el celular los controles van arriba y el título debajo */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 pt-4 sm:px-10 sm:pt-6 lg:px-14">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <span className="hidden h-14 w-14 flex-shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-brand-orange via-[#B3243B] to-brand-wine text-white shadow-[0_20px_40px_-16px_rgba(242,106,46,0.7)] sm:flex lg:h-16 lg:w-16">
            <CakeIcon className="h-8 w-8" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h1 className="m-0 font-display text-[32px] font-bold uppercase leading-[0.95] sm:text-5xl">
              ¡Feliz{' '}
              <span className="bg-[linear-gradient(100deg,#FDE68A_0%,#F9A23B_30%,#F26A2E_60%,#DC3340_100%)] bg-clip-text text-transparent">
                cumpleaños!
              </span>
            </h1>
            <p className="m-0 mt-1 text-sm text-white/70 sm:text-lg">
              {mode === 'month' ? (
                <>
                  Los que celebran en <strong className="text-white">{monthName}</strong>
                </>
              ) : (
                <>
                  <strong className="text-white">{SEMESTER_TEXT[semester].name}</strong> · {SEMESTER_TEXT[semester].range}
                </>
              )}{' '}
              · Grupo {groupNow}
            </p>
          </div>
        </div>
        <div
          className={`order-first flex w-full items-center gap-2 sm:order-none sm:w-auto sm:gap-3 ${
            canSwitchMode ? 'justify-between' : 'justify-end'
          }`}
        >
          {canSwitchMode && <PeriodModeToggle mode={mode} onChange={changeMode} />}
          <div className="flex items-center gap-2 sm:gap-3">
            {!groupLocked && (
              <GroupPicker value={selectedGroup} onChange={setSelectedGroup} className="hidden h-12 sm:flex" />
            )}
            <ShareLinkButton
              url={shareUrl}
              message={shareMessage}
              title={mode === 'month' ? 'Cumpleaños del mes — Jóvenes Modelia' : 'Cumpleaños del semestre — Jóvenes Modelia'}
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              title="Cerrar"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber sm:h-12 sm:w-12"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {showPeriodRow && (
        <div className="relative z-10 px-4 pt-3 sm:px-10 sm:pt-[18px] lg:px-14">
          <BirthdayPeriodPicker
            mode={mode}
            month={month}
            semester={semester}
            showMonthChips={!monthLocked}
            showSemesterChips={!semesterLocked}
            timeline={timeline}
            onPickMonth={setMonth}
            onPickSemester={setSemester}
            onJump={setIndex}
            trailing={mobileGroupPicker}
          />
        </div>
      )}

      <main className="relative z-0 min-h-0 flex-1">
        {loading ? (
          <div role="status" className="flex h-full flex-col items-center justify-center gap-5 px-4">
            <div className="flex items-center gap-7">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className={`h-[340px] w-[230px] animate-pulse rounded-[28px] bg-white/[0.06] lg:h-[400px] lg:w-[280px] ${
                    i === 1 ? 'block' : 'hidden lg:block'
                  }`}
                />
              ))}
            </div>
            <p className="m-0 text-sm text-white/70">Cargando cumpleaños…</p>
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="m-0 font-medium text-red-300">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey(k => k + 1)}
              className="inline-flex h-11 items-center rounded-full border border-white/25 px-5 font-semibold transition-colors hover:border-white/50"
            >
              Reintentar
            </button>
          </div>
        ) : count === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="flex h-24 w-24 items-center justify-center rounded-[30px] border border-white/15 bg-white/[0.06] text-white/60 sm:h-[120px] sm:w-[120px]">
              <CakeIcon className="h-12 w-12 sm:h-14 sm:w-14" />
            </span>
            <p className="m-0 font-display text-[26px] font-semibold sm:text-[38px]">Nadie cumple años en {periodLabel}</p>
            <p className="m-0 text-[15px] text-white/70 sm:text-lg">
              Grupo {groupNow}
              {canChangeFilters ? ' · prueba con otro período o grupo.' : '.'}
            </p>
          </div>
        ) : (
          <BirthdayCarousel
            cards={cards}
            index={safeIndex}
            onSelect={setIndex}
            onStep={step}
            showMonthSeparators={mode === 'semester'}
            reduceMotion={reduceMotion}
            onOpenPhoto={card => {
              if (card.young.profileImage) setPhoto({ url: card.young.profileImage, name: card.young.fullName });
            }}
            onHoverChange={setHovering}
            ariaLabel={`Cumpleaños de ${periodLabel}, grupo ${groupNow}`}
          />
        )}
        <p className="sr-only" aria-live={running ? 'off' : 'polite'}>
          {current ? `${safeIndex + 1} de ${count}: ${current.young.fullName}, ${current.dateLabel}` : ''}
        </p>
      </main>

      <footer className="relative z-10 flex flex-shrink-0 items-center gap-3 border-t border-white/10 bg-black/25 px-4 py-3 text-sm sm:gap-4 sm:px-10 lg:px-14">
        {count > 1 && (
          <button
            type="button"
            onClick={() => setPaused(p => !p)}
            aria-label={paused ? 'Reanudar' : 'Pausar'}
            title={paused ? 'Reanudar' : 'Pausar'}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/[0.06] transition-colors hover:border-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
          >
            {paused ? (
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 4.5l13 7.5-13 7.5z" fill="currentColor" />
              </svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" aria-hidden="true">
                <path d="M8 5v14M16 5v14" />
              </svg>
            )}
          </button>
        )}
        <span className="min-w-[52px] font-display text-lg font-semibold tracking-wide sm:text-[22px]">
          {count ? `${safeIndex + 1} / ${count}` : '0 / 0'}
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            ref={progressRef}
            className="h-full origin-left rounded-full bg-gradient-to-r from-brand-amber via-brand-orange to-brand-red"
            style={{ transform: 'scaleX(0)' }}
          />
        </div>
        <p className="m-0 hidden text-white/75 md:block">
          <strong className="text-brand-amber">{count}</strong> cumpleaños ·{' '}
          <strong className="text-emerald-300">{claimedCount}</strong> reclamaron sus puntos
        </p>
        {count > 1 && <span className="text-xs text-white/70 sm:hidden">Desliza</span>}
        <button
          type="button"
          onClick={() => setReloadKey(k => k + 1)}
          className="hidden h-10 items-center gap-2 rounded-full border border-white/20 px-4 font-semibold transition-colors hover:border-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber sm:inline-flex"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />
          </svg>
          Refrescar
        </button>
      </footer>

      {photo && (
        <ImageModal
          isOpen
          onClose={() => setPhoto(null)}
          imageUrl={photo.url}
          altText={`Foto de perfil de ${photo.name}`}
        />
      )}
    </div>
  );
};

export default BirthdayBoardFullscreen;
