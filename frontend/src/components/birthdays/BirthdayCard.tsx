import React from 'react';
import { motion } from 'framer-motion';
import type { IYoung } from '../../types';
import { getInitials } from '../../utils/nameUtils';

export type BirthdayCardStatus =
  | { kind: 'claimed' }
  | { kind: 'pending' }
  | { kind: 'upcoming'; label: string };

export interface BirthdayCardModel {
  key: string;
  young: IYoung;
  /** 0-11 */
  month: number;
  day: number;
  /** 'NOV' */
  monthAbbr: string;
  /** 'Viernes' (día de la semana en que cae este año) */
  weekday: string;
  /** '20 de noviembre' */
  dateLabel: string;
  isToday: boolean;
  status: BirthdayCardStatus;
}

/** Medidas de la tarjeta: la cinta usa unas en pantallas grandes y otras en el celular. */
export interface CardSize {
  width: number;
  height: number;
  photo: number;
  day: number;
  month: number;
  name: number;
  initials: number;
  compact: boolean;
}

/** Quien no tiene foto: degradado de fuego con puntitos de confeti e iniciales enormes. */
const FIRE_BG =
  'radial-gradient(rgba(255,255,255,.16) 1.5px, transparent 2px) 0 0 / 22px 22px, linear-gradient(135deg,#F9A23B 0%,#F26A2E 35%,#DC3340 68%,#8A1C45 100%)';

const StatusChip: React.FC<{ status: BirthdayCardStatus; compact: boolean }> = ({
  status,
  compact,
}) => {
  const base = `inline-flex items-center gap-1.5 self-start rounded-full font-bold ${
    compact ? 'h-6 px-2.5 text-[11px]' : 'h-[26px] px-2.5 text-xs'
  }`;
  if (status.kind === 'claimed') {
    return (
      <span className={`${base} bg-emerald-500/15 text-emerald-300`}>
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 13l4 4L19 7" />
        </svg>
        Puntos reclamados
      </span>
    );
  }
  if (status.kind === 'pending') {
    return <span className={`${base} border border-white/25 font-semibold text-white/80`}>Sin reclamar</span>;
  }
  return <span className={`${base} bg-brand-amber/15 text-[#FDE68A]`}>{status.label}</span>;
};

interface BirthdayCardProps {
  card: BirthdayCardModel;
  size: CardSize;
  focused: boolean;
  reduceMotion: boolean;
  /** Tocar una tarjeta que no está al frente la trae al frente. */
  onSelect: () => void;
  /** Tocar la del frente abre la foto en grande (si tiene). */
  onOpenPhoto: () => void;
}

const BirthdayCard: React.FC<BirthdayCardProps> = ({
  card,
  size,
  focused,
  reduceMotion,
  onSelect,
  onOpenPhoto,
}) => {
  const { young, isToday } = card;
  const hasPhoto = !!young.profileImage;
  const zoomable = focused && hasPhoto;
  const scale = focused ? (size.compact ? 1 : 1.06) : size.compact ? 0.92 : 0.94;
  const opacity = focused ? 1 : size.compact ? 0.55 : 0.62;

  const label = !focused
    ? `Ir a ${young.fullName}, ${card.dateLabel}`
    : hasPhoto
      ? `Ver foto de ${young.fullName}`
      : `${young.fullName}, ${card.dateLabel}`;

  const handleClick = () => {
    if (!focused) onSelect();
    else if (hasPhoto) onOpenPhoto();
  };

  const border = !focused
    ? 'border-white/10'
    : isToday
      ? 'border-[#FDE68A] motion-safe:animate-glow-gold'
      : 'border-brand-amber shadow-[0_30px_70px_-34px_rgba(242,106,46,0.85)]';

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      aria-label={label}
      aria-current={focused ? 'true' : undefined}
      initial={false}
      animate={{ scale, opacity }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
      style={{ width: size.width, height: size.height }}
      className={`relative flex flex-shrink-0 flex-col overflow-hidden rounded-[28px] border-2 bg-gradient-to-b from-ink-800 to-ink-900 p-0 text-left text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-amber/60 ${border} ${
        zoomable ? 'cursor-zoom-in' : focused ? 'cursor-default' : 'cursor-pointer'
      }`}
    >
      <span className="relative flex w-full flex-shrink-0 items-center justify-center overflow-hidden" style={{ height: size.photo }}>
        {hasPhoto ? (
          <img
            src={young.profileImage}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center font-display font-semibold leading-none text-white [text-shadow:0_10px_40px_rgba(78,15,58,.55)]"
            style={{ background: FIRE_BG, fontSize: size.initials }}
          >
            {getInitials(young.fullName)}
          </span>
        )}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-ink-900/90" />
        {isToday && (
          <span
            className={`absolute left-4 top-4 flex items-center rounded-full bg-[#FDE68A] font-display font-bold tracking-wide text-ink-950 shadow-[0_12px_24px_-10px_rgba(249,162,59,0.9)] ${
              size.compact ? 'h-[34px] px-3 text-lg' : 'h-10 px-4 text-[22px]'
            }`}
          >
            ¡HOY!
          </span>
        )}
      </span>
      <span
        className={`relative flex flex-1 flex-col justify-end gap-1.5 ${
          size.compact ? '-mt-10 px-4 pb-4' : '-mt-11 px-5 pb-[18px]'
        }`}
      >
        <span className="flex items-end gap-2.5">
          <span
            className={`font-display font-bold leading-[0.82] ${isToday ? 'text-[#FDE68A]' : 'text-white'}`}
            style={{ fontSize: size.day }}
          >
            {card.day}
          </span>
          <span className="flex flex-col pb-1 leading-tight">
            <span className="font-display font-semibold tracking-[0.14em] text-[#FDE68A]" style={{ fontSize: size.month }}>
              {card.monthAbbr}
            </span>
            <span className={size.compact ? 'text-[13px] text-white/75' : 'text-sm text-white/75'}>
              {card.weekday}
            </span>
          </span>
        </span>
        <span className="line-clamp-2 font-bold leading-tight" style={{ fontSize: size.name }}>
          {young.fullName}
        </span>
        <StatusChip status={card.status} compact={size.compact} />
      </span>
    </motion.button>
  );
};

export default BirthdayCard;
