import React, { useEffect, useMemo, useState } from 'react';
import {
  createManualResponse,
  FormsApiError,
  previewYoungForForm,
  type YoungPreview,
} from '../../../services/formsApi';
import { apiRequest } from '../../../services/api';
import type { AdminForm, AnswerMap, AnswerValue, ContactField, ContactValues } from '../../../types/forms';
import { resolveVisibility, validateSection } from '../../../utils/forms/conditions';
import ContactInputs from '../public/ContactInputs';
import QuestionField from '../public/QuestionField';
import RespondentAvatar from './RespondentAvatar';
import { labelCls, outlineBtn } from './formStatus';

interface Props {
  form: AdminForm;
  onClose: () => void;
  /** Se llama tras guardar con el mensaje a mostrar. */
  onSaved: (message: string) => void;
}

interface YoungResult {
  id: string;
  fullName: string;
  placa?: string;
  profileImage?: string;
}

type Mode = 'young' | 'guest';

const isBlank = (value: unknown) => value === undefined || value === null || String(value).trim() === '';

/**
 * El admin responde el formulario por otra persona: un joven existente (se
 * autollenan sus datos) o un invitado. Respeta cupos, cierre y obligatorios.
 */
const ManualResponseModal: React.FC<Props> = ({ form, onClose, onSaved }) => {
  const [mode, setMode] = useState<Mode>('young');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<YoungResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [young, setYoung] = useState<YoungPreview | null>(null);
  const [contact, setContact] = useState<ContactValues>({});
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [contactErrors, setContactErrors] = useState<Partial<Record<ContactField, string>>>({});
  const [answerErrors, setAnswerErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const required = useMemo(
    () => new Set(form.contactFields.filter(c => c.mode === 'required').map(c => c.field)),
    [form.contactFields]
  );
  const guestFields = form.contactFields.filter(c => c.mode !== 'hidden').map(c => c.field);
  const contactToAsk: ContactField[] = mode === 'guest' ? guestFields : young?.missing ?? [];

  const visibility = useMemo(
    () => resolveVisibility(form.sections, answers, mode === 'guest' ? 'guest' : 'member'),
    [form.sections, answers, mode]
  );
  const sections = visibility.sections.filter(s => s.questions.length > 0);
  const ready = mode === 'guest' ? form.settings.allowGuests : !!young;

  // Búsqueda de jóvenes con pausa
  useEffect(() => {
    if (mode !== 'young' || young || !search.trim()) {
      setResults([]);
      return;
    }
    const id = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ page: '1', limit: '8', search: search.trim() });
        const body = await (await apiRequest(`young?${params.toString()}`)).json();
        const list: YoungResult[] = (body?.data?.data || []).filter(
          (y: { role_name?: string }) => y.role_name !== 'Super Admin'
        );
        setResults(list);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [search, mode, young]);

  const pickYoung = async (id: string) => {
    setError(null);
    try {
      const preview = await previewYoungForForm(form.id, id);
      setYoung(preview);
      setAnswers(preview.response?.answers ?? {});
      setContact({});
      setSearch('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cargar al joven');
    }
  };

  const changeMode = (next: Mode) => {
    setMode(next);
    setYoung(null);
    setAnswers({});
    setContact({});
    setError(null);
    setContactErrors({});
    setAnswerErrors({});
  };

  const setAnswer = (questionId: string, value: AnswerValue | undefined) => {
    setAnswers(prev => {
      const next = { ...prev };
      if (value === undefined) delete next[questionId];
      else next[questionId] = value;
      return next;
    });
    setAnswerErrors(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const save = async () => {
    const cErrors: Partial<Record<ContactField, string>> = {};
    for (const field of contactToAsk) {
      if (required.has(field) && isBlank(contact[field])) cErrors[field] = 'Este dato es obligatorio';
    }
    const aErrors: Record<string, string> = {};
    for (const section of sections) Object.assign(aErrors, validateSection(section, answers));
    setContactErrors(cErrors);
    setAnswerErrors(aErrors);
    if (Object.keys(cErrors).length || Object.keys(aErrors).length) {
      setError('Revisa los campos marcados');
      return;
    }

    const payloadContact: ContactValues = {};
    for (const field of contactToAsk) {
      if (!isBlank(contact[field])) payloadContact[field] = contact[field]!.trim();
    }
    setSaving(true);
    setError(null);
    try {
      const base = { contact: payloadContact, answers: visibility.effectiveAnswers };
      const result = await createManualResponse(
        form.id,
        mode === 'young' && young ? { youngId: young.youngId, ...base } : { guest: true, ...base }
      );
      const who = young?.fullName ?? String(payloadContact.fullName ?? 'el invitado');
      onSaved(
        `${result.updated ? 'Respuesta actualizada' : 'Respuesta registrada'} de ${who}` +
          (result.pointsAwarded ? ` (+${result.pointsAwarded} pts)` : '')
      );
      onClose();
    } catch (e) {
      if (e instanceof FormsApiError && e.details) {
        setContactErrors((e.details.contact || {}) as Partial<Record<ContactField, string>>);
        setAnswerErrors(e.details.answers || {});
      }
      setError(e instanceof Error ? e.message : 'No pudimos guardar la respuesta');
    } finally {
      setSaving(false);
    }
  };

  const tabCls = (active: boolean) =>
    `flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
      active
        ? 'bg-cocoa-900 text-white dark:bg-white dark:text-ink-950'
        : 'text-cocoa-600 hover:bg-sand-100 dark:text-white/70 dark:hover:bg-white/10'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 dark:bg-ink-900 sm:rounded-3xl sm:p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 font-display text-2xl font-semibold uppercase text-cocoa-900 dark:text-white">Agregar respuesta</h2>
            <p className="m-0 mt-1 text-sm text-cocoa-500 dark:text-white/60">{form.title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className={outlineBtn}>
            ✕
          </button>
        </div>

        <div className="mt-4 flex gap-1 rounded-full bg-sand-50 p-1 dark:bg-white/5">
          <button type="button" className={tabCls(mode === 'young')} onClick={() => changeMode('young')}>
            Joven existente
          </button>
          <button type="button" className={tabCls(mode === 'guest')} onClick={() => changeMode('guest')}>
            Invitado
          </button>
        </div>

        {mode === 'guest' && !form.settings.allowGuests && (
          <p className="mb-0 mt-4 rounded-2xl bg-brand-red/10 px-4 py-3 text-sm text-brand-red">
            Este formulario es solo para jóvenes registrados.
          </p>
        )}

        {mode === 'young' && !young && (
          <div className="mt-4">
            <label htmlFor="manual-young-search" className={labelCls}>
              Buscar por nombre o placa
            </label>
            <input
              id="manual-young-search"
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ej: Laura o @MODLAUR001"
              className="field-brand h-12 w-full text-[15px]"
            />
            {searching && <p className="mb-0 mt-2 text-sm text-cocoa-500 dark:text-white/60">Buscando…</p>}
            {error && <p className="mb-0 mt-2 text-sm font-medium text-red-500">{error}</p>}
            {results.length > 0 && (
              <ul className="m-0 mt-2 list-none divide-y divide-sand-100 rounded-2xl border border-sand-200 p-0 dark:divide-white/5 dark:border-white/10">
                {results.map(r => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => pickYoung(r.id)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-sand-50 dark:hover:bg-white/[0.04]"
                    >
                      <RespondentAvatar name={r.fullName} photoUrl={r.profileImage ?? null} />
                      <span className="min-w-0 flex-1 truncate font-semibold text-cocoa-900 dark:text-white">{r.fullName}</span>
                      <span className="font-mono text-xs text-cocoa-500 dark:text-white/55">{r.placa || 'sin placa'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {mode === 'young' && young && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-sand-50 p-3 dark:bg-white/5">
            <RespondentAvatar name={young.fullName} photoUrl={young.profileImage} />
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate font-semibold text-cocoa-900 dark:text-white">{young.fullName}</p>
              <p className="m-0 text-xs text-cocoa-500 dark:text-white/60">
                {young.placa ?? 'Sin placa'}
                {young.response ? ' · ya respondió: editarás su respuesta' : ''}
              </p>
            </div>
            <button type="button" className={outlineBtn} onClick={() => changeMode('young')}>
              Cambiar
            </button>
          </div>
        )}

        {ready && (
          <div className="mt-5 space-y-6">
            {contactToAsk.length > 0 && (
              <section>
                <h3 className="mb-3 mt-0 text-sm font-semibold uppercase tracking-wider text-cocoa-500 dark:text-white/60">
                  {mode === 'guest' ? 'Datos del invitado' : 'Datos que faltan en su perfil'}
                </h3>
                <ContactInputs
                  fields={contactToAsk}
                  required={required}
                  values={contact}
                  errors={contactErrors}
                  onChange={(field, value) => {
                    setContact(prev => ({ ...prev, [field]: value }));
                    setContactErrors(prev => {
                      const next = { ...prev };
                      delete next[field];
                      return next;
                    });
                  }}
                />
              </section>
            )}

            {sections.map(section => (
              <section key={section.id} className="space-y-6">
                {section.title && (
                  <h3 className="m-0 font-display text-xl font-semibold uppercase text-cocoa-900 dark:text-white">{section.title}</h3>
                )}
                {section.questions.map(question => (
                  <QuestionField
                    key={question.id}
                    question={question}
                    value={answers[question.id]}
                    error={answerErrors[question.id]}
                    onChange={value => setAnswer(question.id, value)}
                  />
                ))}
              </section>
            ))}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button type="button" className={outlineBtn} onClick={onClose}>
                Cancelar
              </button>
              <button type="button" onClick={save} disabled={saving} className="btn-fire h-10 px-6 text-sm">
                {saving ? 'Guardando…' : young?.response ? 'Actualizar respuesta' : 'Guardar respuesta'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualResponseModal;
