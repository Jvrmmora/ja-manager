import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  formatBirthday,
  getCurrentDateTimeColombia,
  parseYYYYMMDD,
} from '../utils/dateUtils';

// Fecha de cumpleaños como día calendario local (sin corrimiento por UTC)
const toCalendarDate = (value: Date | string): Date =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)
    ? parseYYYYMMDD(value.split('T')[0] as string)
    : new Date(value);

const SPARKS = [
  { left: '8%', delay: 0, color: '#F9A23B', size: 6 },
  { left: '22%', delay: 1.1, color: '#FDE68A', size: 5 },
  { left: '38%', delay: 0.5, color: '#F26A2E', size: 7 },
  { left: '55%', delay: 1.6, color: '#F9A23B', size: 5 },
  { left: '70%', delay: 0.9, color: '#DC3340', size: 6 },
  { left: '86%', delay: 0.3, color: '#FDE68A', size: 7 },
];

interface BirthdayBannerProps {
  birthday?: Date | string | null;
  birthdayPointsClaimed?: Date | string | null;
  onEditProfile?: () => void;
  onOpenMonthBirthdays?: () => void; // Abrir modal simplificado para cumpleaños del mes
}

const BirthdayBanner: React.FC<BirthdayBannerProps> = ({
  birthday,
  birthdayPointsClaimed,
  onEditProfile,
  onOpenMonthBirthdays,
}) => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [isBirthdayMonth, setIsBirthdayMonth] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);

  // Nombre del mes actual en español (capitalizado)
  const monthName = (() => {
    const raw = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(
      new Date()
    );
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  })();
  const confettiIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!birthday) {
      setIsBirthdayMonth(false);
      setCanClaim(false);
      return;
    }

    // Convertir birthday a Date si es string
    const birthdayDate = toCalendarDate(birthday);
    const currentDate = getCurrentDateTimeColombia();

    // Verificar si es el mes de cumpleaños
    const isMonth = birthdayDate.getMonth() === currentDate.getMonth();
    setIsBirthdayMonth(isMonth);

    // Verificar si puede reclamar puntos
    const birthDay = birthdayDate.getDate();
    const currentDay = currentDate.getDate();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Verificar si ya reclamó este año
    if (birthdayPointsClaimed) {
      const claimedDate = new Date(birthdayPointsClaimed);
      const claimedYear = claimedDate.getFullYear();

      if (claimedYear === currentYear) {
        setAlreadyClaimed(true);
        setCanClaim(false);
      } else {
        setAlreadyClaimed(false);
        // Verificar ventana de reclamación
        checkClaimWindow();
      }
    } else {
      setAlreadyClaimed(false);
      checkClaimWindow();
    }

    function checkClaimWindow() {
      // Solo puede reclamar en su día de cumpleaños o después
      if (isMonth && currentDay >= birthDay) {
        // Si cumple día 30 o 31, puede reclamar hasta el 10 del mes siguiente
        if (birthDay >= 30) {
          setCanClaim(true);
        } else {
          // Si cumple antes del 30, puede reclamar hasta 10 días después
          setCanClaim(currentDay <= birthDay + 10);
        }
      } else if (
        currentMonth === (birthdayDate.getMonth() + 1) % 12 &&
        birthDay >= 30
      ) {
        // Mes siguiente, solo si cumple día 30 o 31
        setCanClaim(currentDay <= 10);
      } else {
        setCanClaim(false);
      }
    }

    // Si es el mes de cumpleaños, iniciar confeti
    if (isMonth) {
      startConfettiLoop();
    }

    return () => {
      stopConfettiLoop();
    };
  }, [birthday, birthdayPointsClaimed]);

  const startConfettiLoop = () => {
    // Lanzar confeti inmediatamente
    launchConfetti();

    // Luego cada 8 segundos
    confettiIntervalRef.current = setInterval(() => {
      launchConfetti();
    }, 8000);
  };

  const stopConfettiLoop = () => {
    if (confettiIntervalRef.current) {
      clearInterval(confettiIntervalRef.current);
      confettiIntervalRef.current = null;
    }
  };

  const launchConfetti = () => {
    if (!bannerRef.current) return;

    const rect = bannerRef.current.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    // Confeti sutil con partículas pequeñas
    confetti({
      particleCount: 40,
      spread: 70,
      origin: { x, y },
      colors: ['#F9A23B', '#F26A2E', '#DC3340', '#8A1C45', '#FDE68A'],
      gravity: 0.6,
      scalar: 0.7,
      drift: 0,
      ticks: 200,
      startVelocity: 25,
      shapes: ['circle', 'square'],
      disableForReducedMotion: true,
    });
  };

  // Estado de la fecha: hoy, este mes o cuenta regresiva
  const today = getCurrentDateTimeColombia();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const bd = birthday ? toCalendarDate(birthday) : null;
  const isToday =
    !!bd && bd.getMonth() === today.getMonth() && bd.getDate() === today.getDate();
  let daysUntil = 0;
  let nextYear = today.getFullYear();
  if (bd) {
    let next = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
    if (next < startOfToday) next = new Date(today.getFullYear() + 1, bd.getMonth(), bd.getDate());
    nextYear = next.getFullYear();
    daysUntil = Math.round((next.getTime() - startOfToday.getTime()) / 86400000);
  }
  const monthDelta = bd ? bd.getDate() - today.getDate() : 0;
  const plural = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;
  const statusPill = !bd
    ? null
    : isBirthdayMonth
      ? monthDelta > 0
        ? `En ${plural(monthDelta)}`
        : monthDelta < 0
          ? 'Ya pasó este mes'
          : null
      : daysUntil === 1
        ? 'Tu cumple es mañana'
        : `Faltan ${plural(daysUntil)} para tu cumple`;
  const yearProgress = Math.max(0, Math.min(100, ((365 - daysUntil) / 365) * 100));

  const cardCls =
    'relative flex h-full flex-col gap-3.5 overflow-hidden rounded-[28px] border border-sand-200 bg-white p-6 sm:p-7 text-left shadow-[0_20px_40px_-30px_rgba(78,15,58,0.4)] transition-all duration-300 hover:-translate-y-1 dark:border-white/10 dark:bg-ink-900 md:col-span-2 lg:col-span-1';

  const header = (
    <span className="flex items-center justify-between gap-2">
      <span className={`flex items-center gap-2.5 text-sm font-semibold ${isToday ? 'text-white/75' : 'text-cocoa-500 dark:text-white/65'}`}>
        <motion.span
          animate={isToday && !reduceMotion ? { rotate: [0, -10, 10, -8, 8, 0], scale: [1, 1.08, 1] } : { rotate: 0, scale: 1 }}
          transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2.6, ease: 'easeInOut' }}
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${isToday ? 'bg-fire text-white' : 'bg-[#F6E1E8] text-brand-wine dark:bg-brand-wine/25 dark:text-[#F4A3C0]'}`}
        >
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1M2 21h20M7 8v3M12 8v3M17 8v3M7 4h.01M12 4h.01M17 4h.01" />
          </svg>
        </motion.span>
        {birthday ? 'Tu Cumpleaños' : 'Fecha de cumpleaños'}
      </span>
      {isToday ? (
        <span className="bg-fire inline-flex h-[26px] items-center rounded-full px-2.5 text-xs font-bold text-white">
          ¡Hoy es tu día!
        </span>
      ) : isBirthdayMonth && (
        <span className="inline-flex h-[26px] items-center rounded-full bg-sand-100 px-2.5 text-xs font-bold text-[#9A3412] dark:bg-brand-orange/15 dark:text-brand-amber">
          ¡Tu mes!
        </span>
      )}
    </span>
  );

  const monthButton = onOpenMonthBirthdays && (
    <button
      onClick={onOpenMonthBirthdays}
      title="Ver cumpleaños del mes"
      className={`mt-auto inline-flex h-10 items-center gap-2 self-start rounded-full border px-4 text-[13px] font-semibold transition-colors ${isToday ? 'border-white/20 text-white/85 hover:bg-white/10' : 'border-sand-300 text-cocoa-600 hover:bg-ink-950 hover:text-white dark:border-white/15 dark:text-white/75'}`}
    >
      Cumpleaños de {monthName}
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </button>
  );

  if (!birthday) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16 }}
        className={cardCls}
      >
        {header}
        <span className="font-display text-3xl font-semibold uppercase text-cocoa-400 dark:text-white/50">
          No registrada
        </span>
        {onEditProfile && (
          <button onClick={onEditProfile} className="btn-fire h-12 text-[15px]">
            Agregar Fecha
          </button>
        )}
        {monthButton}
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={bannerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.16 }}
      className={
        isToday
          ? cardCls
              .replace('border-sand-200 bg-white', 'border-brand-amber/30 bg-ink-950 text-white')
              .replace('dark:bg-ink-900', '')
          : cardCls
      }
    >
      {isToday ? (
        <>
          <div className="pointer-events-none absolute -right-24 -top-28 h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(242,106,46,.38)_0%,rgba(20,11,16,0)_65%)]" />
          {!reduceMotion &&
            SPARKS.map((sp, i) => (
              <motion.span
                key={i}
                aria-hidden="true"
                className="pointer-events-none absolute bottom-2 rounded-full"
                style={{ left: sp.left, width: sp.size, height: sp.size, backgroundColor: sp.color }}
                initial={{ y: 0, opacity: 0 }}
                animate={{ y: -150, opacity: [0, 0.9, 0] }}
                transition={{ duration: 3.2, delay: sp.delay, repeat: Infinity, ease: 'easeOut' }}
              />
            ))}
        </>
      ) : (
        <svg
          className="pointer-events-none absolute -bottom-6 -right-4 h-36 w-36 text-brand-wine/[0.06] dark:text-white/[0.05]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1M2 21h20M7 8v3M12 8v3M17 8v3M7 4h.01M12 4h.01M17 4h.01" />
        </svg>
      )}

      <div className="relative flex flex-1 flex-col gap-3.5">
        {header}
        {isToday ? (
          <span className="flex flex-col gap-1">
            <span className="text-fire-name font-display text-[34px] font-bold uppercase leading-none sm:text-[38px]">
              ¡Feliz cumpleaños!
            </span>
            <span className="font-display text-lg font-medium uppercase tracking-[0.04em] text-white/70">
              {formatBirthday(birthday)} de {nextYear}
            </span>
          </span>
        ) : (
          <span className="font-display text-3xl sm:text-[34px] font-semibold uppercase leading-tight text-cocoa-900 dark:text-white">
            {formatBirthday(birthday)} de {nextYear}
          </span>
        )}

        {statusPill && (
          <span className="flex flex-col gap-2">
            <span className="inline-flex h-7 items-center self-start rounded-full bg-sand-100 px-3 text-xs font-bold text-[#9A3412] dark:bg-brand-orange/15 dark:text-brand-amber">
              {statusPill}
            </span>
            {!isBirthdayMonth && (
              <span className="block h-1.5 overflow-hidden rounded-full bg-sand-100 dark:bg-white/10" aria-hidden="true">
                <span
                  className="block h-full rounded-full bg-[linear-gradient(90deg,#F9A23B,#DC3340,#8A1C45)]"
                  style={{ width: `${yearProgress}%` }}
                />
              </span>
            )}
          </span>
        )}

        {alreadyClaimed && (
          <span className="inline-flex h-9 items-center gap-2 self-start rounded-full bg-emerald-50 px-3.5 text-[13px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 13l4 4L19 7" />
            </svg>
            Puntos Reclamados
          </span>
        )}

        {canClaim && !alreadyClaimed && (
          <motion.button
            onClick={() => navigate('/birthday-claim?auto=true')}
            className="btn-fire h-12 text-[15px]"
            whileTap={{ scale: 0.97 }}
          >
            ¡Reclamar Puntos!
          </motion.button>
        )}

        {monthButton}
      </div>
    </motion.div>
  );
};

export default BirthdayBanner;
