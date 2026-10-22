import React from 'react';
import type { AnswerValue, FormQuestion } from '../../../types/forms';
import { ErrorText, inputCls } from './ContactInputs';

interface QuestionFieldProps {
  question: FormQuestion;
  value: AnswerValue | undefined;
  error?: string | undefined;
  onChange: (value: AnswerValue | undefined) => void;
}

const optionCls = (selected: boolean) =>
  `flex w-full items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3.5 text-left text-[15px] font-medium transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/25 ${
    selected
      ? 'border-brand-orange bg-brand-orange/[0.07] text-cocoa-900 dark:bg-brand-orange/15 dark:text-white'
      : 'border-sand-300 bg-white text-cocoa-700 hover:border-cocoa-400 dark:border-white/15 dark:bg-ink-800 dark:text-white/85 dark:hover:border-white/35'
  }`;

const Mark: React.FC<{ selected: boolean; square?: boolean }> = ({ selected, square }) => (
  <span
    aria-hidden="true"
    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center border-2 transition-colors ${
      square ? 'rounded-md' : 'rounded-full'
    } ${selected ? 'border-brand-orange bg-brand-orange' : 'border-sand-300 dark:border-white/30'}`}
  >
    {selected && (
      <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5}>
        <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </span>
);

/** Renderiza una pregunta según su tipo con controles grandes y táctiles. */
const QuestionField: React.FC<QuestionFieldProps> = ({ question, value, error, onChange }) => {
  const id = `q-${question.id}`;
  const options = question.options || [];

  const control = (() => {
    switch (question.type) {
      case 'short_text':
        return (
          <input
            id={id}
            type="text"
            value={(value as string) ?? ''}
            maxLength={question.validation?.maxLength || 300}
            onChange={e => onChange(e.target.value)}
            className={inputCls(error)}
          />
        );
      case 'paragraph':
        return (
          <textarea
            id={id}
            rows={4}
            value={(value as string) ?? ''}
            maxLength={question.validation?.maxLength || 3000}
            onChange={e => onChange(e.target.value)}
            className={`${inputCls(error)} h-auto py-3`}
          />
        );
      case 'yes_no':
        return (
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-labelledby={`${id}-label`}>
            {[
              { id: 'yes', label: 'Sí', emoji: '🙌' },
              { id: 'no', label: 'No', emoji: '🙁' },
            ].map(option => {
              const selected = value === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange(option.id)}
                  className={`${optionCls(selected)} h-16 justify-center text-lg font-semibold`}
                >
                  <span aria-hidden="true">{option.emoji}</span> {option.label}
                </button>
              );
            })}
          </div>
        );
      case 'single_choice':
        return (
          <div className="space-y-2.5" role="radiogroup" aria-labelledby={`${id}-label`}>
            {options.map(option => {
              const selected = value === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange(selected && !question.required ? undefined : option.id)}
                  className={optionCls(selected)}
                >
                  <Mark selected={selected} />
                  {option.label}
                </button>
              );
            })}
          </div>
        );
      case 'multi_choice': {
        const current = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2.5" role="group" aria-labelledby={`${id}-label`}>
            {options.map(option => {
              const selected = current.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  onClick={() =>
                    onChange(selected ? current.filter(item => item !== option.id) : [...current, option.id])
                  }
                  className={optionCls(selected)}
                >
                  <Mark selected={selected} square />
                  {option.label}
                </button>
              );
            })}
          </div>
        );
      }
      case 'dropdown':
        return (
          <select
            id={id}
            value={(value as string) ?? ''}
            onChange={e => onChange(e.target.value || undefined)}
            className={inputCls(error)}
          >
            <option value="">Selecciona…</option>
            {options.map(option => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'date':
        return (
          <input
            id={id}
            type="date"
            value={(value as string) ?? ''}
            onChange={e => onChange(e.target.value || undefined)}
            className={inputCls(error)}
          />
        );
      case 'number': {
        const min = question.validation?.min;
        const max = question.validation?.max;
        const num = value === undefined || value === '' ? undefined : Number(value);
        const step = (delta: number) => {
          const next = (num ?? min ?? 0) + delta;
          if (min !== undefined && next < min) return;
          if (max !== undefined && next > max) return;
          onChange(next);
        };
        const stepBtn =
          'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border-[1.5px] border-sand-300 text-xl font-semibold text-cocoa-700 transition-colors hover:border-brand-orange hover:text-brand-deep disabled:opacity-40 dark:border-white/15 dark:text-white';
        return (
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Menos" onClick={() => step(-1)} className={stepBtn} disabled={num !== undefined && min !== undefined && num <= min}>
              −
            </button>
            <input
              id={id}
              type="number"
              inputMode="numeric"
              value={num ?? ''}
              min={min}
              max={max}
              onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
              className={`${inputCls(error)} w-28 text-center`}
            />
            <button type="button" aria-label="Más" onClick={() => step(1)} className={stepBtn} disabled={num !== undefined && max !== undefined && num >= max}>
              +
            </button>
          </div>
        );
      }
      default:
        return null;
    }
  })();

  return (
    <div>
      <label id={`${id}-label`} htmlFor={id} className="mb-1 block text-[16px] font-semibold text-cocoa-900 dark:text-white">
        {question.label}
        {question.required && <span className="text-brand-red"> *</span>}
      </label>
      {question.help && <p className="mb-3 mt-0 text-sm text-cocoa-500 dark:text-white/60">{question.help}</p>}
      {!question.help && <div className="mb-2.5" />}
      {control}
      <ErrorText>{error}</ErrorText>
    </div>
  );
};

export default QuestionField;
