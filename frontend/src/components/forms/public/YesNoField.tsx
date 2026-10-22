import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckIcon, XIcon } from './FormIcons';

interface YesNoFieldProps {
  labelledBy: string;
  value: string | undefined;
  onChange: (value: 'yes' | 'no') => void;
}

const OPTIONS = [
  {
    id: 'yes' as const,
    label: 'Sí',
    Icon: CheckIcon,
    selectedCls:
      'border-emerald-500 bg-emerald-500 text-white shadow-[0_14px_30px_-12px_rgba(16,185,129,0.85)]',
    sparks: ['#10B981', '#34D399', '#A3E635', '#6EE7B7'],
  },
  {
    id: 'no' as const,
    label: 'No',
    Icon: XIcon,
    selectedCls: 'border-red-500 bg-red-500 text-white shadow-[0_14px_30px_-12px_rgba(239,68,68,0.85)]',
    sparks: ['#EF4444', '#F87171', '#F97316', '#FCA5A5'],
  },
];

const SPARK_COUNT = 16;

/**
 * Chispas que nacen en el borde del botón y salen hacia afuera.
 * `rx`/`ry` son la mitad del ancho/alto del botón.
 */
const SparkBurst: React.FC<{ colors: string[]; rx: number; ry: number }> = ({ colors, rx, ry }) => (
  <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-0 w-0">
    {Array.from({ length: SPARK_COUNT }, (_, i) => {
      const angle = (360 / SPARK_COUNT) * i + (i % 2 ? 6 : -6);
      const rad = (angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const travel = 22 + (i % 3) * 12;
      const length = i % 2 ? 10 : 15;
      const color = colors[i % colors.length];
      return (
        <motion.span
          key={i}
          className="absolute left-0 top-0 rounded-full"
          style={{
            width: length,
            height: 4,
            marginLeft: -length / 2,
            marginTop: -2,
            backgroundColor: color,
            rotate: angle,
            boxShadow: `0 0 8px ${color}`,
          }}
          initial={{ x: cos * rx * 0.85, y: sin * ry * 0.85, opacity: 0, scaleX: 0.3 }}
          animate={{
            x: cos * (rx + travel),
            y: sin * (ry + travel * 0.7),
            opacity: [0, 1, 1, 0],
            scaleX: [0.3, 1, 1, 0.5],
          }}
          transition={{ duration: 0.75, times: [0, 0.15, 0.6, 1], ease: 'easeOut' }}
        />
      );
    })}
  </span>
);

/**
 * Pregunta Sí/No: el seleccionado se pinta completo (verde Sí, rojo No) y
 * suelta chispas de su color.
 */
const YesNoField: React.FC<YesNoFieldProps> = ({ labelledBy, value, onChange }) => {
  const reduceMotion = useReducedMotion();
  // Cambia en cada clic para repetir las chispas aunque se elija lo mismo
  const [burst, setBurst] = useState(0);
  // Mitad del ancho/alto del botón tocado, para que las chispas nazcan en su borde
  const [radius, setRadius] = useState({ rx: 80, ry: 32 });

  return (
    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-labelledby={labelledBy}>
      {OPTIONS.map(option => {
        const selected = value === option.id;
        return (
          <motion.button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={event => {
              const rect = event.currentTarget.getBoundingClientRect();
              setRadius({ rx: rect.width / 2, ry: rect.height / 2 });
              onChange(option.id);
              setBurst(n => n + 1);
            }}
            whileTap={reduceMotion ? {} : { scale: 0.95 }}
            animate={selected && !reduceMotion ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`relative flex h-16 w-full items-center ${selected ? 'z-10' : 'z-0'} justify-center gap-2.5 rounded-2xl border-[1.5px] text-lg font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/25 ${
              selected
                ? option.selectedCls
                : 'border-sand-300 bg-white text-cocoa-700 hover:border-cocoa-400 dark:border-white/15 dark:bg-ink-800 dark:text-white/85 dark:hover:border-white/35'
            }`}
          >
            <AnimatePresence>
              {selected && !reduceMotion && <SparkBurst key={burst} colors={option.sparks} rx={radius.rx} ry={radius.ry} />}
            </AnimatePresence>

            <motion.span
              key={selected ? `on-${burst}` : 'off'}
              initial={selected && !reduceMotion ? { scale: 0.3, rotate: -25 } : false}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
              className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-200 ${
                selected ? 'bg-white/25 text-white' : 'text-cocoa-400 dark:text-white/45'
              }`}
            >
              <option.Icon className="h-4 w-4" />
            </motion.span>
            {option.label}
          </motion.button>
        );
      })}
    </div>
  );
};

export default YesNoField;
