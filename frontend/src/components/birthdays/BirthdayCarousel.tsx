import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import { MONTH_NAMES } from '../../utils/shareUrls';
import BirthdayCard, { type BirthdayCardModel, type CardSize } from './BirthdayCard';

const DESKTOP: CardSize = { width: 300, height: 440, photo: 280, day: 82, month: 24, name: 21, initials: 120, compact: false };
const MOBILE: CardSize = { width: 250, height: 400, photo: 250, day: 66, month: 20, name: 18, initials: 100, compact: true };

type TrackItem =
  | { kind: 'separator'; month: number; count: number }
  | { kind: 'card'; index: number; card: BirthdayCardModel };

interface BirthdayCarouselProps {
  cards: BirthdayCardModel[];
  index: number;
  onSelect: (index: number) => void;
  onStep: (direction: 1 | -1) => void;
  /** En modo semestre, una tarjeta angosta con el nombre del mes antes de cada mes. */
  showMonthSeparators: boolean;
  reduceMotion: boolean;
  onOpenPhoto: (card: BirthdayCardModel) => void;
  /** Con el mouse encima la cinta no avanza sola. */
  onHoverChange: (hovering: boolean) => void;
  ariaLabel: string;
}

/** Mide el contenedor para escalar la cinta al alto disponible (portátil, TV o celular). */
const useBoxSize = () => {
  const ref = useRef<HTMLElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setBox({ width: element.clientWidth, height: element.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, box] as const;
};

const MonthSeparator: React.FC<{ month: number; count: number; size: CardSize }> = ({ month, count, size }) => (
  <div
    aria-hidden="true"
    className="flex flex-shrink-0 flex-col items-center justify-between rounded-[28px] border border-dashed border-brand-amber/45"
    style={{ width: size.compact ? 64 : 96, height: size.height, paddingBlock: size.compact ? 16 : 22 }}
  >
    <span
      className="rotate-180 font-display font-semibold uppercase tracking-[0.12em] text-brand-amber [writing-mode:vertical-rl]"
      style={{ fontSize: size.compact ? 30 : 44 }}
    >
      {MONTH_NAMES[month]}
    </span>
    <span
      className="flex items-center justify-center rounded-full bg-brand-amber/15 font-display font-semibold text-[#FDE68A]"
      style={{ width: size.compact ? 34 : 44, height: size.compact ? 34 : 44, fontSize: size.compact ? 16 : 22 }}
    >
      {count}
    </span>
  </div>
);

const ArrowButton: React.FC<{ direction: 1 | -1; onClick: () => void }> = ({ direction, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={direction === 1 ? 'Siguiente' : 'Anterior'}
    className={`absolute top-1/2 z-20 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-ink-950/70 text-white backdrop-blur transition-colors hover:border-white/50 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber ${
      direction === 1 ? 'right-4 sm:right-10' : 'left-4 sm:left-10'
    }`}
  >
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === 1 ? 'M9 18l6-6-6-6' : 'M15 18l-6-6 6-6'} />
    </svg>
  </button>
);

/**
 * Cinta de cumpleaños: varias tarjetas a la vez y la del frente centrada.
 * Avanza con flechas, teclado (en el contenedor), autoplay o deslizando.
 */
const BirthdayCarousel: React.FC<BirthdayCarouselProps> = ({
  cards,
  index,
  onSelect,
  onStep,
  showMonthSeparators,
  reduceMotion,
  onOpenPhoto,
  onHoverChange,
  ariaLabel,
}) => {
  const [stageRef, box] = useBoxSize();
  // Tras deslizar, el navegador igual dispara el clic de la tarjeta: se ignora
  const pannedRef = useRef(false);

  const size = box.width > 0 && box.width < 640 ? MOBILE : DESKTOP;
  const gap = size.compact ? 16 : 28;
  const separatorWidth = size.compact ? 64 : 96;
  // Escala para que la tarjeta del frente quepa en el alto disponible (en TV crece hasta 1.25)
  const scale = box.height
    ? Math.min(
        Math.max((box.height - (size.compact ? 24 : 56)) / (size.height * (size.compact ? 1 : 1.06)), 0.6),
        size.compact ? 1 : 1.25
      )
    : 1;

  const { items, focusX } = useMemo(() => {
    const counts = new Map<number, number>();
    cards.forEach(card => counts.set(card.month, (counts.get(card.month) ?? 0) + 1));
    const list: TrackItem[] = [];
    let x = 0;
    let focus = 0;
    let lastMonth = -1;
    cards.forEach((card, i) => {
      if (showMonthSeparators && card.month !== lastMonth) {
        list.push({ kind: 'separator', month: card.month, count: counts.get(card.month) ?? 0 });
        x += separatorWidth + gap;
        lastMonth = card.month;
      }
      if (i === index) focus = x;
      list.push({ kind: 'card', index: i, card });
      x += size.width + gap;
    });
    return { items: list, focusX: focus };
  }, [cards, index, showMonthSeparators, separatorWidth, gap, size.width]);

  const handlePanEnd = (_event: PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    if (Math.abs(offset.x) > Math.abs(offset.y)) {
      if (offset.x < -50 || velocity.x < -500) onStep(1);
      else if (offset.x > 50 || velocity.x > 500) onStep(-1);
    }
    setTimeout(() => {
      pannedRef.current = false;
    }, 0);
  };

  return (
    <motion.section
      ref={stageRef}
      aria-roledescription="carrusel"
      aria-label={ariaLabel}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onPanStart={() => {
        pannedRef.current = true;
      }}
      onPanEnd={handlePanEnd}
      style={{ touchAction: 'pan-y' }}
      className="relative h-full w-full select-none overflow-hidden"
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{ width: size.width, height: size.height, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        <motion.div
          className="absolute left-0 top-0 flex items-center"
          style={{ columnGap: gap }}
          initial={false}
          animate={{ x: -focusX }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
        >
          {items.map(item =>
            item.kind === 'separator' ? (
              <MonthSeparator key={`mes-${item.month}`} month={item.month} count={item.count} size={size} />
            ) : (
              <BirthdayCard
                key={item.card.key}
                card={item.card}
                size={size}
                focused={item.index === index}
                reduceMotion={reduceMotion}
                onSelect={() => {
                  if (!pannedRef.current) onSelect(item.index);
                }}
                onOpenPhoto={() => {
                  if (!pannedRef.current) onOpenPhoto(item.card);
                }}
              />
            )
          )}
        </motion.div>
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[14%] bg-gradient-to-r from-ink-950 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-10 w-[14%] bg-gradient-to-l from-ink-950 to-transparent" />

      {!size.compact && cards.length > 1 && (
        <>
          <ArrowButton direction={-1} onClick={() => onStep(-1)} />
          <ArrowButton direction={1} onClick={() => onStep(1)} />
        </>
      )}
    </motion.section>
  );
};

export default BirthdayCarousel;
