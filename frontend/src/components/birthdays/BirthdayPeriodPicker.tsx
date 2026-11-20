import React from 'react';
import type { Semester } from '../../utils/birthdayPeriods';
import { MONTH_NAMES } from '../../utils/shareUrls';

export type BoardMode = 'month' | 'semester';

/** Un mes en la línea del semestre: cuántos cumplen y cuánto se ha recorrido. */
export interface TimelineMonth {
  month: number;
  count: number;
  /** Índice de su primer cumpleaños en la cinta (-1 si no hay). */
  firstIndex: number;
  active: boolean;
  /** 0-1: barra inferior que avanza con la cinta. */
  progress: number;
}

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber';
const abbr = (month: number) => (MONTH_NAMES[month] ?? '').slice(0, 3);

export const PeriodModeToggle: React.FC<{ mode: BoardMode; onChange: (mode: BoardMode) => void }> = ({
  mode,
  onChange,
}) => (
  <div role="group" aria-label="Ver por" className="flex gap-1 rounded-full border border-white/15 bg-white/[0.06] p-1">
    {(['month', 'semester'] as const).map(option => {
      const active = mode === option;
      return (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={active}
          className={`h-10 rounded-full px-4 text-sm font-bold transition-colors sm:h-11 sm:px-[22px] sm:text-[15px] ${focusRing} ${
            active ? 'bg-brand-amber text-ink-950' : 'text-white/85 hover:bg-white/10'
          }`}
        >
          {option === 'month' ? 'Mes' : 'Semestre'}
        </button>
      );
    })}
  </div>
);

interface BirthdayPeriodPickerProps {
  mode: BoardMode;
  month: number;
  semester: Semester;
  showMonthChips: boolean;
  showSemesterChips: boolean;
  timeline: TimelineMonth[];
  onPickMonth: (month: number) => void;
  onPickSemester: (semester: Semester) => void;
  onJump: (index: number) => void;
  /** Selector de grupo en el celular (en escritorio va en la cabecera). */
  trailing?: React.ReactNode;
}

/** Fila de meses (modo mes) o semestres + línea de meses (modo semestre). */
export const BirthdayPeriodPicker: React.FC<BirthdayPeriodPickerProps> = ({
  mode,
  month,
  semester,
  showMonthChips,
  showSemesterChips,
  timeline,
  onPickMonth,
  onPickSemester,
  onJump,
  trailing,
}) => {
  if (mode === 'month') {
    return (
      <div className="flex items-center gap-2">
        {showMonthChips && (
          <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none] sm:grid sm:grid-cols-6 sm:gap-2 sm:overflow-visible lg:grid-cols-12">
            {MONTH_NAMES.map((name, i) => {
              const active = i === month;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => onPickMonth(i)}
                  aria-pressed={active}
                  aria-label={name}
                  className={`h-11 min-w-[52px] flex-shrink-0 rounded-xl border text-sm font-bold transition-colors sm:h-12 sm:min-w-0 sm:rounded-[14px] sm:text-[15px] ${focusRing} ${
                    active ? 'border-brand-amber bg-brand-amber text-ink-950' : 'border-white/10 bg-white/[0.06] text-white/85 hover:bg-white/10'
                  }`}
                >
                  {abbr(i)}
                </button>
              );
            })}
          </div>
        )}
        {trailing}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-2.5">
      {(showSemesterChips || trailing) && (
        <div className="flex items-center gap-2 lg:gap-2.5">
          {showSemesterChips &&
            ([1, 2] as const).map(option => {
              const active = option === semester;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onPickSemester(option)}
                  aria-pressed={active}
                  className={`flex h-11 flex-col items-start justify-center whitespace-nowrap rounded-xl border px-3 text-left transition-colors lg:h-[54px] lg:rounded-[14px] lg:px-5 ${focusRing} ${
                    active ? 'border-brand-amber bg-brand-amber text-ink-950' : 'border-white/15 bg-white/[0.06] text-white hover:bg-white/10'
                  }`}
                >
                  <span className="text-sm font-extrabold lg:text-base">{option === 1 ? 'Ene – Jun' : 'Jul – Dic'}</span>
                  <span className="hidden text-xs font-semibold opacity-80 lg:block">
                    {option === 1 ? '1.er semestre' : '2.º semestre'}
                  </span>
                </button>
              );
            })}
          {trailing && <div className="ml-auto">{trailing}</div>}
        </div>
      )}
      {showSemesterChips && <span aria-hidden="true" className="mx-2 hidden h-[34px] w-px bg-white/15 lg:block" />}
      <div className="grid flex-1 grid-cols-6 gap-1.5 lg:gap-2">
        {timeline.map(item => {
          const empty = item.count === 0;
          return (
            <button
              key={item.month}
              type="button"
              disabled={empty}
              onClick={() => {
                if (item.firstIndex >= 0) onJump(item.firstIndex);
              }}
              aria-label={`${MONTH_NAMES[item.month] ?? ''}: ${item.count} cumpleaños`}
              aria-current={item.active ? 'true' : undefined}
              className={`relative flex h-11 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[10px] border transition-colors lg:h-[54px] lg:flex-row lg:gap-2.5 lg:rounded-[14px] ${focusRing} ${
                item.active ? 'border-brand-amber bg-brand-amber/15' : 'border-white/10 bg-white/[0.05] hover:bg-white/10'
              } ${empty ? 'cursor-default text-white/40' : 'text-white'}`}
            >
              <span className="font-display text-sm font-semibold uppercase leading-none tracking-[0.06em] lg:text-xl lg:tracking-[0.08em]">
                {abbr(item.month)}
              </span>
              <span
                className={`flex items-center justify-center rounded-full text-[11px] font-extrabold leading-none lg:h-[26px] lg:min-w-[26px] lg:px-2 lg:text-[13px] ${
                  item.active ? 'text-[#FDE68A] lg:bg-brand-amber lg:text-ink-950' : 'text-white/75 lg:bg-white/10 lg:text-white/90'
                }`}
              >
                {item.count}
              </span>
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-brand-amber to-brand-orange transition-[width] duration-500"
                style={{ width: `${Math.round(item.progress * 100)}%` }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};
