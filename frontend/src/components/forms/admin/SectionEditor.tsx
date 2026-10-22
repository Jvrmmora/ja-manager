import React, { useEffect, useRef, useState } from 'react';
import type { FormSection, QuestionType } from '../../../types/forms';
import type { BuilderAction } from '../../../utils/forms/builderReducer';
import QuestionCard, { ConditionEditor, QUESTION_TYPE_META, describeCondition } from './QuestionCard';
import { cardCls } from './formStatus';

interface SectionEditorProps {
  section: FormSection;
  index: number;
  total: number;
  sections: FormSection[];
  attendanceQuestionId: string | null;
  activeId: string | null;
  onActivate: (id: string | null) => void;
  dispatch: React.Dispatch<BuilderAction>;
}

/** Menú "Agregar pregunta" con los tipos más usados primero. */
const AddQuestionMenu: React.FC<{ onAdd: (type: QuestionType) => void }> = ({ onAdd }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-sand-300 text-sm font-semibold text-cocoa-600 transition-colors hover:border-brand-orange hover:text-brand-deep dark:border-white/15 dark:text-white/70 dark:hover:text-brand-amber"
      >
        <span className="text-lg leading-none">＋</span> Agregar pregunta
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-20 mt-2 grid grid-cols-2 gap-1 rounded-2xl border border-sand-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-ink-800 sm:grid-cols-4">
          {(Object.keys(QUESTION_TYPE_META) as QuestionType[]).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => {
                onAdd(type);
                setOpen(false);
              }}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-cocoa-700 hover:bg-sand-100 dark:text-white/85 dark:hover:bg-white/10"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sand-100 text-xs dark:bg-white/10" aria-hidden="true">
                {QUESTION_TYPE_META[type].icon}
              </span>
              {QUESTION_TYPE_META[type].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/** Una sección (página) del formulario con sus preguntas. */
const SectionEditor: React.FC<SectionEditorProps> = ({
  section,
  index,
  total,
  sections,
  attendanceQuestionId,
  activeId,
  onActivate,
  dispatch,
}) => {
  const allQuestions = sections.flatMap(s => s.questions);
  const multi = total > 1;

  return (
    <section className={cardCls}>
      {multi && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <span className="eyebrow text-brand-deep dark:text-brand-amber">
            Sección {index + 1} de {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => dispatch({ type: 'moveSection', sectionId: section.id, direction: -1 })}
              className="rounded-full px-2 py-1 text-xs font-semibold text-cocoa-500 hover:bg-sand-100 disabled:opacity-30 dark:text-white/60 dark:hover:bg-white/10"
            >
              ↑ Subir
            </button>
            <button
              type="button"
              disabled={index === total - 1}
              onClick={() => dispatch({ type: 'moveSection', sectionId: section.id, direction: 1 })}
              className="rounded-full px-2 py-1 text-xs font-semibold text-cocoa-500 hover:bg-sand-100 disabled:opacity-30 dark:text-white/60 dark:hover:bg-white/10"
            >
              ↓ Bajar
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'removeSection', sectionId: section.id })}
              className="rounded-full px-2 py-1 text-xs font-semibold text-cocoa-500 hover:bg-brand-red/10 hover:text-brand-red dark:text-white/60"
            >
              Eliminar sección
            </button>
          </div>
        </div>
      )}

      {(multi || section.title) && (
        <div className="mb-4 space-y-2">
          <input
            value={section.title ?? ''}
            maxLength={200}
            placeholder={multi ? `Título de la sección ${index + 1}` : 'Título de la sección (opcional)'}
            onChange={e => dispatch({ type: 'updateSection', sectionId: section.id, patch: { title: e.target.value } })}
            className="field-brand h-11 font-display text-lg uppercase"
          />
          <input
            value={section.description ?? ''}
            maxLength={1000}
            placeholder="Descripción (opcional)"
            onChange={e => dispatch({ type: 'updateSection', sectionId: section.id, patch: { description: e.target.value } })}
            className="field-brand h-10 text-sm"
          />
          {index > 0 && (
            <ConditionEditor
              sections={sections}
              targetId={section.id}
              value={section.showIf}
              onChange={condition => dispatch({ type: 'updateSection', sectionId: section.id, patch: { showIf: condition } })}
            />
          )}
          {index > 0 && section.showIf && (
            <p className="m-0 text-xs text-cocoa-500 dark:text-white/55">
              Esta sección completa se muestra {describeCondition(section.showIf, sections)}.
            </p>
          )}
        </div>
      )}

      <div className="space-y-3">
        {section.questions.map((question, qIndex) => (
          <QuestionCard
            key={question.id}
            question={question}
            sections={sections}
            active={activeId === question.id}
            isAttendance={attendanceQuestionId === question.id}
            isFirst={index === 0 && qIndex === 0}
            isLast={question.id === allQuestions[allQuestions.length - 1]?.id}
            onActivate={() => onActivate(question.id)}
            dispatch={dispatch}
          />
        ))}
        {section.questions.length === 0 && (
          <p className="m-0 rounded-2xl bg-sand-50 px-4 py-6 text-center text-sm text-cocoa-500 dark:bg-white/[0.03] dark:text-white/55">
            Esta sección aún no tiene preguntas.
          </p>
        )}
        <AddQuestionMenu
          onAdd={type => {
            const afterId = section.questions.some(q => q.id === activeId) ? activeId ?? undefined : undefined;
            dispatch({ type: 'addQuestion', sectionId: section.id, questionType: type, ...(afterId ? { afterId } : {}) });
          }}
        />
      </div>
    </section>
  );
};

export default SectionEditor;
