import React from 'react';
import type { FormCondition, FormQuestion, FormSection, QuestionType } from '../../../types/forms';
import { conditionSources, type BuilderAction } from '../../../utils/forms/builderReducer';
import { omitKey } from '../../../utils/forms/omitKey';

export const QUESTION_TYPE_META: Record<QuestionType, { label: string; icon: string }> = {
  yes_no: { label: 'Sí / No', icon: '👍' },
  single_choice: { label: 'Opción única', icon: '◉' },
  multi_choice: { label: 'Casillas', icon: '☑' },
  dropdown: { label: 'Desplegable', icon: '▾' },
  short_text: { label: 'Texto corto', icon: 'Aa' },
  paragraph: { label: 'Párrafo', icon: '¶' },
  number: { label: 'Número', icon: '#' },
  date: { label: 'Fecha', icon: '📅' },
};

const OPTION_TYPES: QuestionType[] = ['single_choice', 'multi_choice', 'dropdown'];

const iconBtn =
  'flex h-9 w-9 items-center justify-center rounded-full text-cocoa-500 transition-colors hover:bg-sand-100 hover:text-cocoa-900 disabled:opacity-30 disabled:hover:bg-transparent dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white';

const smallInput =
  'h-10 w-full rounded-xl border-[1.5px] border-sand-300 bg-white px-3 text-sm text-cocoa-900 focus:border-brand-orange focus:outline-none focus:ring-4 focus:ring-brand-orange/15 dark:border-white/15 dark:bg-ink-800 dark:text-white';

const Svg = ({ d }: { d: string }) => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

/** Describe una condición en lenguaje natural: "si «¿Asistirás?» es Sí". */
export const describeCondition = (condition: FormCondition, sections: FormSection[]): string => {
  const source = sections.flatMap(s => s.questions).find(q => q.id === condition.questionId);
  if (!source) return '';
  const valueLabel =
    source.type === 'yes_no'
      ? condition.value === 'yes'
        ? 'Sí'
        : 'No'
      : source.options?.find(o => o.id === condition.value)?.label ?? '?';
  const op = condition.op === 'not_equals' ? 'no es' : condition.op === 'includes' ? 'incluye' : 'es';
  return `si «${source.label || 'Sin título'}» ${op} ${valueLabel}`;
};

interface ConditionEditorProps {
  sections: FormSection[];
  targetId: string;
  value: FormCondition | null | undefined;
  onChange: (condition: FormCondition | null) => void;
}

/** "Mostrar solo si…": elige pregunta anterior, operador y valor. */
export const ConditionEditor: React.FC<ConditionEditorProps> = ({ sections, targetId, value, onChange }) => {
  const sources = conditionSources(sections, targetId);
  if (sources.length === 0) {
    return (
      <p className="m-0 text-xs text-cocoa-400 dark:text-white/45">
        Para mostrar esto solo en ciertos casos, agrega antes una pregunta de opción o Sí/No.
      </p>
    );
  }

  if (!value) {
    return (
      <button
        type="button"
        onClick={() => {
          const source = sources[sources.length - 1];
          const first = source.type === 'yes_no' ? 'yes' : source.options?.[0]?.id ?? '';
          onChange({ questionId: source.id, op: 'equals', value: first });
        }}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-deep hover:underline dark:text-brand-amber"
      >
        <Svg d="M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9" />
        Mostrar solo si…
      </button>
    );
  }

  const source = sources.find(q => q.id === value.questionId) ?? sources[0];
  const values =
    source.type === 'yes_no'
      ? [
          { id: 'yes', label: 'Sí' },
          { id: 'no', label: 'No' },
        ]
      : source.options || [];

  return (
    <div className="rounded-2xl bg-brand-amber/10 p-3 dark:bg-brand-amber/[0.08]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-deep dark:text-brand-amber">
          Mostrar solo si
        </span>
        <button type="button" onClick={() => onChange(null)} className="text-xs font-semibold text-cocoa-500 hover:text-brand-red dark:text-white/60">
          Quitar condición
        </button>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1.4fr_0.8fr_1fr]">
        <select
          aria-label="Pregunta"
          value={source.id}
          onChange={e => {
            const next = sources.find(q => q.id === e.target.value)!;
            onChange({
              questionId: next.id,
              op: 'equals',
              value: next.type === 'yes_no' ? 'yes' : next.options?.[0]?.id ?? '',
            });
          }}
          className={smallInput}
        >
          {sources.map(q => (
            <option key={q.id} value={q.id}>
              {q.label || 'Sin título'}
            </option>
          ))}
        </select>
        <select
          aria-label="Operador"
          value={value.op}
          onChange={e => onChange({ ...value, questionId: source.id, op: e.target.value as FormCondition['op'] })}
          className={smallInput}
        >
          {source.type === 'multi_choice' ? (
            <option value="includes">incluye</option>
          ) : (
            <>
              <option value="equals">es</option>
              <option value="not_equals">no es</option>
            </>
          )}
        </select>
        <select
          aria-label="Valor"
          value={value.value}
          onChange={e => onChange({ ...value, questionId: source.id, value: e.target.value })}
          className={smallInput}
        >
          {values.map(option => (
            <option key={option.id} value={option.id}>
              {option.label || 'Sin texto'}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

interface QuestionCardProps {
  question: FormQuestion;
  sections: FormSection[];
  active: boolean;
  isAttendance: boolean;
  isFirst: boolean;
  isLast: boolean;
  onActivate: () => void;
  dispatch: React.Dispatch<BuilderAction>;
}

/**
 * Tarjeta de pregunta al estilo Google Forms: compacta cuando no está
 * seleccionada, editor completo al hacer clic.
 */
const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  sections,
  active,
  isAttendance,
  isFirst,
  isLast,
  onActivate,
  dispatch,
}) => {
  const update = (patch: Partial<Omit<FormQuestion, 'id' | 'type'>>) =>
    dispatch({ type: 'updateQuestion', questionId: question.id, patch });
  const meta = QUESTION_TYPE_META[question.type];

  if (!active) {
    return (
      <button
        type="button"
        onClick={onActivate}
        className="block w-full rounded-2xl border border-sand-200 bg-white p-4 text-left transition-colors hover:border-cocoa-300 dark:border-white/10 dark:bg-ink-800/60 dark:hover:border-white/25"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-sand-100 text-sm dark:bg-white/10" aria-hidden="true">
            {meta.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`m-0 font-semibold ${question.label ? 'text-cocoa-900 dark:text-white' : 'italic text-cocoa-400'}`}>
              {question.label || 'Pregunta sin título'}
              {question.required && <span className="text-brand-red"> *</span>}
            </p>
            <p className="m-0 mt-0.5 text-xs text-cocoa-500 dark:text-white/55">
              {meta.label}
              {question.options?.length ? ` · ${question.options.map(o => o.label).join(', ')}` : ''}
            </p>
            {question.showIf && (
              <p className="m-0 mt-1 text-xs font-medium text-brand-deep dark:text-brand-amber">
                ↳ Se muestra {describeCondition(question.showIf, sections)}
              </p>
            )}
          </div>
          {isAttendance && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
              Asistencia
            </span>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border-[1.5px] border-brand-orange/60 bg-white p-4 shadow-[0_20px_40px_-30px_rgba(242,106,46,0.6)] dark:bg-ink-800 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          autoFocus={!question.label}
          value={question.label}
          maxLength={300}
          placeholder="Escribe la pregunta"
          onChange={e => update({ label: e.target.value })}
          className="field-brand h-12 flex-1 font-semibold"
        />
        <select
          aria-label="Tipo de pregunta"
          value={question.type}
          onChange={e => dispatch({ type: 'changeQuestionType', questionId: question.id, questionType: e.target.value as QuestionType })}
          className="field-brand h-12 sm:w-48"
        >
          {Object.entries(QUESTION_TYPE_META).map(([type, info]) => (
            <option key={type} value={type}>
              {info.icon} {info.label}
            </option>
          ))}
        </select>
      </div>

      <input
        value={question.help ?? ''}
        maxLength={500}
        placeholder="Texto de ayuda (opcional)"
        onChange={e => update({ help: e.target.value })}
        className={`${smallInput} mt-3`}
      />

      {OPTION_TYPES.includes(question.type) && (
        <div className="mt-4 space-y-2">
          {(question.options || []).map((option, index) => (
            <div key={option.id} className="flex items-center gap-2">
              <span className="w-5 text-center text-sm text-cocoa-400" aria-hidden="true">
                {question.type === 'multi_choice' ? '☐' : question.type === 'dropdown' ? `${index + 1}.` : '○'}
              </span>
              <input
                value={option.label}
                maxLength={200}
                aria-label={`Opción ${index + 1}`}
                onChange={e => dispatch({ type: 'updateOption', questionId: question.id, optionId: option.id, label: e.target.value })}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    dispatch({ type: 'addOption', questionId: question.id });
                  }
                }}
                className={smallInput}
              />
              <button
                type="button"
                aria-label="Quitar opción"
                disabled={(question.options || []).length <= 2}
                onClick={() => dispatch({ type: 'removeOption', questionId: question.id, optionId: option.id })}
                className={iconBtn}
              >
                <Svg d="M18 6 6 18M6 6l12 12" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => dispatch({ type: 'addOption', questionId: question.id })}
            className="ml-7 text-sm font-semibold text-brand-deep hover:underline dark:text-brand-amber"
          >
            + Agregar opción
          </button>
        </div>
      )}

      {question.type === 'number' && (
        <div className="mt-4 grid max-w-xs grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Mínimo"
            aria-label="Mínimo"
            value={question.validation?.min ?? ''}
            onChange={e => {
              const rest = omitKey(question.validation || {}, 'min');
              update({ validation: e.target.value === '' ? rest : { ...rest, min: Number(e.target.value) } });
            }}
            className={smallInput}
          />
          <input
            type="number"
            placeholder="Máximo"
            aria-label="Máximo"
            value={question.validation?.max ?? ''}
            onChange={e => {
              const rest = omitKey(question.validation || {}, 'max');
              update({ validation: e.target.value === '' ? rest : { ...rest, max: Number(e.target.value) } });
            }}
            className={smallInput}
          />
        </div>
      )}

      <div className="mt-4">
        <ConditionEditor
          sections={sections}
          targetId={question.id}
          value={question.showIf}
          onChange={condition => update({ showIf: condition })}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-sand-100 pt-3 dark:border-white/10">
        <button type="button" aria-label="Subir" disabled={isFirst} onClick={() => dispatch({ type: 'moveQuestion', questionId: question.id, direction: -1 })} className={iconBtn}>
          <Svg d="M12 19V5M5 12l7-7 7 7" />
        </button>
        <button type="button" aria-label="Bajar" disabled={isLast} onClick={() => dispatch({ type: 'moveQuestion', questionId: question.id, direction: 1 })} className={iconBtn}>
          <Svg d="M12 5v14M19 12l-7 7-7-7" />
        </button>
        <button type="button" aria-label="Duplicar" onClick={() => dispatch({ type: 'duplicateQuestion', questionId: question.id })} className={iconBtn}>
          <Svg d="M8 8h12v12H8zM4 16V4h12" />
        </button>
        <button type="button" aria-label="Eliminar pregunta" onClick={() => dispatch({ type: 'removeQuestion', questionId: question.id })} className={`${iconBtn} hover:!text-brand-red`}>
          <Svg d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
        </button>

        {question.type === 'yes_no' && (
          <label className="ml-1 flex cursor-pointer items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold text-cocoa-600 hover:bg-sand-100 dark:text-white/70 dark:hover:bg-white/10" title="Sus respuestas alimentan el conteo de asistentes y el cupo">
            <input
              type="checkbox"
              checked={isAttendance}
              onChange={e => dispatch({ type: 'setAttendanceQuestion', questionId: e.target.checked ? question.id : null })}
              className="h-4 w-4 rounded accent-emerald-600"
            />
            Cuenta asistencia
          </label>
        )}

        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm font-semibold text-cocoa-700 dark:text-white/80">
          Obligatoria
          <span className="relative inline-flex">
            <input
              type="checkbox"
              role="switch"
              checked={question.required}
              onChange={e => update({ required: e.target.checked })}
              className="peer sr-only"
            />
            <span className="h-6 w-11 rounded-full bg-sand-300 transition-colors peer-checked:bg-brand-orange peer-focus-visible:ring-4 peer-focus-visible:ring-brand-orange/25 dark:bg-white/20" />
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
          </span>
        </label>
      </div>
    </div>
  );
};

export default QuestionCard;
