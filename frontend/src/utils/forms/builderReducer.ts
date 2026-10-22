import type {
  ContactField,
  ContactFieldConfig,
  ContactFieldMode,
  FormCondition,
  FormOption,
  FormQuestion,
  FormSection,
  QuestionType,
} from '../../types/forms';
import { omitKey } from './omitKey';

/**
 * Estado estructural del constructor de formularios y sus operaciones. Es
 * puro (sin React) para poder probar las reglas de limpieza: borrar una
 * pregunta u opción elimina las condiciones que dependían de ella, igual que
 * haría Google Forms, en vez de dejar el formulario en un estado que el
 * backend rechazaría al publicar.
 */

export interface BuilderState {
  contactFields: ContactFieldConfig[];
  sections: FormSection[];
  attendanceQuestionId: string | null;
}

export const CHOICE_TYPES: QuestionType[] = ['single_choice', 'multi_choice', 'dropdown', 'yes_no'];
const OPTION_TYPES: QuestionType[] = ['single_choice', 'multi_choice', 'dropdown'];

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const defaultOptions = (): FormOption[] => [
  { id: newId(), label: 'Opción 1' },
  { id: newId(), label: 'Opción 2' },
];

export const createQuestion = (type: QuestionType): FormQuestion => ({
  id: newId(),
  type,
  label: '',
  required: false,
  showIf: null,
  ...(OPTION_TYPES.includes(type) ? { options: defaultOptions() } : {}),
});

export type BuilderAction =
  | { type: 'reset'; state: BuilderState }
  | { type: 'addSection' }
  | { type: 'updateSection'; sectionId: string; patch: Partial<Pick<FormSection, 'title' | 'description' | 'showIf'>> }
  | { type: 'removeSection'; sectionId: string }
  | { type: 'moveSection'; sectionId: string; direction: -1 | 1 }
  | { type: 'addQuestion'; sectionId: string; questionType: QuestionType; afterId?: string }
  | { type: 'updateQuestion'; questionId: string; patch: Partial<Omit<FormQuestion, 'id' | 'type'>> }
  | { type: 'changeQuestionType'; questionId: string; questionType: QuestionType }
  | { type: 'removeQuestion'; questionId: string }
  | { type: 'duplicateQuestion'; questionId: string }
  | { type: 'moveQuestion'; questionId: string; direction: -1 | 1 }
  | { type: 'reorderQuestions'; sectionId: string; questionIds: string[] }
  | { type: 'addOption'; questionId: string }
  | { type: 'updateOption'; questionId: string; optionId: string; label: string }
  | { type: 'removeOption'; questionId: string; optionId: string }
  | { type: 'setContactMode'; field: ContactField; mode: ContactFieldMode }
  | { type: 'setAttendanceQuestion'; questionId: string | null };

const mapQuestions = (sections: FormSection[], fn: (q: FormQuestion) => FormQuestion): FormSection[] =>
  sections.map(section => ({ ...section, questions: section.questions.map(fn) }));

/**
 * Quita condiciones que ya no tienen sentido: origen borrado, opción borrada,
 * origen sin opciones o que quedó DESPUÉS (solo se condiciona a lo anterior).
 */
const pruneConditions = (state: BuilderState): BuilderState => {
  const earlier = new Map<string, FormQuestion>();
  const valid = (condition?: FormCondition | null): FormCondition | null => {
    if (!condition) return null;
    const source = earlier.get(condition.questionId);
    if (!source || !CHOICE_TYPES.includes(source.type)) return null;
    const values = source.type === 'yes_no' ? ['yes', 'no'] : (source.options || []).map(o => o.id);
    return values.includes(condition.value) ? condition : null;
  };

  const sections = state.sections.map(section => {
    const sectionShowIf = valid(section.showIf);
    const questions = section.questions.map(q => {
      const next = { ...q, showIf: valid(q.showIf) };
      earlier.set(q.id, q);
      return next;
    });
    return { ...section, showIf: sectionShowIf, questions };
  });

  const attendance = state.attendanceQuestionId ? earlier.get(state.attendanceQuestionId) : undefined;
  return {
    ...state,
    attendanceQuestionId: attendance?.type === 'yes_no' ? state.attendanceQuestionId : null,
    sections,
  };
};

const move = <T>(list: T[], index: number, direction: -1 | 1): T[] => {
  const target = index + direction;
  if (index < 0 || target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

export const builderReducer = (state: BuilderState, action: BuilderAction): BuilderState => {
  switch (action.type) {
    case 'reset':
      return action.state;

    case 'addSection':
      return {
        ...state,
        sections: [...state.sections, { id: newId(), title: '', description: '', showIf: null, questions: [] }],
      };

    case 'updateSection':
      return {
        ...state,
        sections: state.sections.map(s => (s.id === action.sectionId ? { ...s, ...action.patch } : s)),
      };

    case 'removeSection': {
      if (state.sections.length <= 1) return state;
      return pruneConditions({ ...state, sections: state.sections.filter(s => s.id !== action.sectionId) });
    }

    case 'moveSection': {
      const index = state.sections.findIndex(s => s.id === action.sectionId);
      return { ...state, sections: move(state.sections, index, action.direction) };
    }

    case 'addQuestion': {
      const question = createQuestion(action.questionType);
      return {
        ...state,
        sections: state.sections.map(section => {
          if (section.id !== action.sectionId) return section;
          const index = action.afterId ? section.questions.findIndex(q => q.id === action.afterId) : -1;
          const questions = [...section.questions];
          questions.splice(index >= 0 ? index + 1 : questions.length, 0, question);
          return { ...section, questions };
        }),
      };
    }

    case 'updateQuestion':
      return {
        ...state,
        sections: mapQuestions(state.sections, q => (q.id === action.questionId ? { ...q, ...action.patch } : q)),
      };

    case 'changeQuestionType': {
      const next = mapQuestions(state.sections, q => {
        if (q.id !== action.questionId || q.type === action.questionType) return q;
        const keepsOptions = OPTION_TYPES.includes(q.type) && OPTION_TYPES.includes(action.questionType);
        const rest = omitKey(omitKey(q, 'options'), 'validation');
        return {
          ...rest,
          type: action.questionType,
          ...(OPTION_TYPES.includes(action.questionType)
            ? { options: keepsOptions && q.options?.length ? q.options : defaultOptions() }
            : {}),
        };
      });
      return pruneConditions({ ...state, sections: next });
    }

    case 'removeQuestion':
      return pruneConditions({
        ...state,
        sections: state.sections.map(s => ({ ...s, questions: s.questions.filter(q => q.id !== action.questionId) })),
      });

    case 'duplicateQuestion':
      return {
        ...state,
        sections: state.sections.map(section => {
          const index = section.questions.findIndex(q => q.id === action.questionId);
          if (index < 0) return section;
          const source = section.questions[index];
          const copy: FormQuestion = {
            ...source,
            id: newId(),
            label: source.label ? `${source.label} (copia)` : '',
            ...(source.options ? { options: source.options.map(o => ({ ...o, id: newId() })) } : {}),
          };
          const questions = [...section.questions];
          questions.splice(index + 1, 0, copy);
          return { ...section, questions };
        }),
      };

    case 'moveQuestion': {
      // Dentro de la sección; en el borde salta a la sección vecina
      const sIndex = state.sections.findIndex(s => s.questions.some(q => q.id === action.questionId));
      if (sIndex < 0) return state;
      const section = state.sections[sIndex];
      const qIndex = section.questions.findIndex(q => q.id === action.questionId);
      const atEdge = action.direction === -1 ? qIndex === 0 : qIndex === section.questions.length - 1;
      if (!atEdge) {
        const sections = [...state.sections];
        sections[sIndex] = { ...section, questions: move(section.questions, qIndex, action.direction) };
        return pruneConditions({ ...state, sections });
      }
      const neighbor = sIndex + action.direction;
      if (neighbor < 0 || neighbor >= state.sections.length) return state;
      const question = section.questions[qIndex];
      const sections = state.sections.map((s, i) => {
        if (i === sIndex) return { ...s, questions: s.questions.filter(q => q.id !== question.id) };
        if (i === neighbor) {
          return {
            ...s,
            questions: action.direction === -1 ? [...s.questions, question] : [question, ...s.questions],
          };
        }
        return s;
      });
      return pruneConditions({ ...state, sections });
    }

    case 'reorderQuestions':
      return pruneConditions({
        ...state,
        sections: state.sections.map(section => {
          if (section.id !== action.sectionId) return section;
          const byId = new Map(section.questions.map(q => [q.id, q]));
          return { ...section, questions: action.questionIds.map(id => byId.get(id)!).filter(Boolean) };
        }),
      });

    case 'addOption':
      return {
        ...state,
        sections: mapQuestions(state.sections, q =>
          q.id === action.questionId
            ? { ...q, options: [...(q.options || []), { id: newId(), label: `Opción ${(q.options?.length || 0) + 1}` }] }
            : q
        ),
      };

    case 'updateOption':
      return {
        ...state,
        sections: mapQuestions(state.sections, q =>
          q.id === action.questionId
            ? { ...q, options: (q.options || []).map(o => (o.id === action.optionId ? { ...o, label: action.label } : o)) }
            : q
        ),
      };

    case 'removeOption':
      return pruneConditions({
        ...state,
        sections: mapQuestions(state.sections, q =>
          q.id === action.questionId ? { ...q, options: (q.options || []).filter(o => o.id !== action.optionId) } : q
        ),
      });

    case 'setContactMode': {
      // El nombre siempre es obligatorio: es lo mínimo para saber quién va
      if (action.field === 'fullName') return state;
      const exists = state.contactFields.some(c => c.field === action.field);
      return {
        ...state,
        contactFields: exists
          ? state.contactFields.map(c => (c.field === action.field ? { ...c, mode: action.mode } : c))
          : [...state.contactFields, { field: action.field, mode: action.mode }],
      };
    }

    case 'setAttendanceQuestion':
      return pruneConditions({ ...state, attendanceQuestionId: action.questionId });

    default:
      return state;
  }
};

/** Preguntas anteriores a `questionId` que pueden usarse como condición. */
export const conditionSources = (sections: FormSection[], beforeId: string): FormQuestion[] => {
  const result: FormQuestion[] = [];
  for (const section of sections) {
    if (section.id === beforeId) return result;
    for (const question of section.questions) {
      if (question.id === beforeId) return result;
      if (CHOICE_TYPES.includes(question.type)) result.push(question);
    }
  }
  return result;
};
