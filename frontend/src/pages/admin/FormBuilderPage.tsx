import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import PageLoader from '../../components/PageLoader';
import StatusScreen, { statusPrimaryBtn } from '../../components/StatusScreen';
import ToastContainer from '../../components/ToastContainer';
import AdminFormsHeader, { useAdminOnly } from '../../components/forms/admin/AdminFormsHeader';
import { ContactFieldsEditor, EventEditor } from '../../components/forms/admin/EventEditor';
import SectionEditor from '../../components/forms/admin/SectionEditor';
import ResponsesTab from '../../components/forms/admin/ResponsesTab';
import SheetsCard from '../../components/forms/admin/SheetsCard';
import { SettingsTab, SharePanel } from '../../components/forms/admin/SettingsTab';
import { STATUS_META, outlineBtn } from '../../components/forms/admin/formStatus';
import { useToast } from '../../hooks/useToast';
import { FormsApiError, getForm, setFormStatus, updateForm, type FormPatch } from '../../services/formsApi';
import type { AdminForm, FormSheets, FormStatus } from '../../types/forms';
import { builderReducer, type BuilderAction, type BuilderState } from '../../utils/forms/builderReducer';
import '../../brand-skin.css';

type Tab = 'questions' | 'responses' | 'settings';
type SaveState = 'saved' | 'dirty' | 'saving' | 'error';
type PatchKey = keyof FormPatch;

const AUTOSAVE_MS = 800;

const structureOf = (form: AdminForm): BuilderState => ({
  contactFields: form.contactFields,
  sections: form.sections,
  attendanceQuestionId: form.attendanceQuestionId,
});

const questionIds = (form: AdminForm) => new Set(form.sections.flatMap(s => s.questions.map(q => q.id)));

/** El backend exige URL válida: mientras se escribe, no enviamos una a medias. */
const sanitizePatch = (patch: FormPatch): FormPatch => {
  if (patch.event?.mapsUrl && !/^https?:\/\/\S+\.\S+/.test(patch.event.mapsUrl)) {
    return { ...patch, event: { ...patch.event, mapsUrl: '' } };
  }
  return patch;
};

/** /admin/forms/:id — constructor tipo Google Forms con autoguardado. */
export default function FormBuilderPage() {
  useAdminOnly();
  const { id = '' } = useParams();
  const { toasts, showToast, removeToast } = useToast();
  const [form, setForm] = useState<AdminForm | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>('questions');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [problems, setProblems] = useState<string[]>([]);
  const [changingStatus, setChangingStatus] = useState(false);

  const formRef = useRef<AdminForm | null>(null);
  const pendingKeys = useRef<Set<PatchKey>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showError = useCallback((message: string) => showToast(message, 'error', 4500), [showToast]);
  const notify = useCallback((message: string) => showToast(message), [showToast]);

  useEffect(() => {
    getForm(id)
      .then(loaded => {
        formRef.current = loaded;
        setForm(loaded);
      })
      .catch(() => setNotFound(true));
  }, [id]);

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const current = formRef.current;
    if (!current || pendingKeys.current.size === 0) return true;

    const keys = [...pendingKeys.current];
    pendingKeys.current.clear();
    const patch = sanitizePatch(Object.fromEntries(keys.map(key => [key, current[key]])) as FormPatch);

    setSaveState('saving');
    try {
      const saved = await updateForm(current.id, patch);
      // No pisamos lo que se siguió escribiendo: solo campos que calcula el servidor
      setForm(prev => {
        const next = prev ? { ...prev, status: saved.status, sheets: saved.sheets, seatsTaken: saved.seatsTaken, updatedAt: saved.updatedAt } : prev;
        formRef.current = next;
        return next;
      });
      setProblems([]);
      setSaveState(pendingKeys.current.size ? 'dirty' : 'saved');
      return true;
    } catch (error) {
      keys.forEach(key => pendingKeys.current.add(key));
      setSaveState('error');
      if (error instanceof FormsApiError && error.details?.problems) setProblems(error.details.problems);
      else showError(error instanceof Error ? error.message : 'No se pudo guardar');
      return false;
    }
  }, [showError]);

  const change = useCallback(
    (patch: FormPatch) => {
      setForm(prev => {
        if (!prev) return prev;
        const next = { ...prev, ...patch } as AdminForm;
        formRef.current = next;
        return next;
      });
      (Object.keys(patch) as PatchKey[]).forEach(key => pendingKeys.current.add(key));
      setSaveState('dirty');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        flush();
      }, AUTOSAVE_MS);
    },
    [flush]
  );

  const dispatch = useCallback(
    (action: BuilderAction) => {
      const current = formRef.current;
      if (!current) return;
      const before = questionIds(current);
      const next = builderReducer(structureOf(current), action);
      change({
        contactFields: next.contactFields,
        sections: next.sections,
        attendanceQuestionId: next.attendanceQuestionId,
      });
      // Abrir en edición la pregunta recién creada
      const added = next.sections.flatMap(s => s.questions).find(q => !before.has(q.id));
      if (added) setActiveId(added.id);
    },
    [change]
  );

  // Estado de Sheets lo calcula el servidor: se actualiza sin autoguardado
  const handleSheetsChange = useCallback((sheets: FormSheets) => {
    setForm(prev => {
      const next = prev ? { ...prev, sheets } : prev;
      formRef.current = next;
      return next;
    });
  }, []);

  // Avisar si se cierra la pestaña con cambios sin guardar
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pendingKeys.current.size) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const changeStatus = async (status: FormStatus) => {
    if (!form) return;
    setChangingStatus(true);
    try {
      if (!(await flush())) return;
      const updated = await setFormStatus(form.id, status);
      setForm(prev => {
        const next = prev ? { ...prev, status: updated.status, publishedAt: updated.publishedAt, closesAt: updated.closesAt } : prev;
        formRef.current = next;
        return next;
      });
      setProblems([]);
      notify(status === 'OPEN' ? '¡Publicado! Ya puedes compartir el enlace' : status === 'CLOSED' ? 'Respuestas cerradas' : 'Volvió a borrador');
      if (status === 'OPEN') setTab('settings');
    } catch (error) {
      if (error instanceof FormsApiError && error.details?.problems) {
        setProblems(error.details.problems);
        setTab('questions');
      } else {
        showError(error instanceof Error ? error.message : 'No se pudo cambiar el estado');
      }
    } finally {
      setChangingStatus(false);
    }
  };

  if (notFound) {
    return (
      <StatusScreen
        eyebrow="Formularios"
        title="Formulario no encontrado"
        description="Puede que lo hayan eliminado."
        actions={
          <a href="/admin/forms" className={statusPrimaryBtn}>
            Ver formularios
          </a>
        }
      />
    );
  }
  if (!form) return <PageLoader />;

  const status = STATUS_META[form.status];
  const saveLabel: Record<SaveState, string> = {
    saved: 'Guardado ✓',
    dirty: 'Cambios sin guardar',
    saving: 'Guardando…',
    error: 'No se guardó',
  };

  const primaryAction =
    form.status === 'DRAFT'
      ? { label: 'Publicar', next: 'OPEN' as const }
      : form.status === 'OPEN'
        ? { label: 'Cerrar respuestas', next: 'CLOSED' as const }
        : { label: 'Reabrir', next: 'OPEN' as const };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'questions', label: 'Preguntas' },
    { id: 'responses', label: 'Respuestas' },
    { id: 'settings', label: 'Configuración' },
  ];

  return (
    <div className="brand-skin min-h-screen bg-cream dark:bg-ink-950">
      <AdminFormsHeader
        backTo="/admin/forms"
        backLabel="Volver a formularios"
        right={
          <>
            <span
              className={`hidden text-xs font-medium sm:inline ${saveState === 'error' ? 'text-brand-red' : 'text-cocoa-400 dark:text-white/50'}`}
              aria-live="polite"
            >
              {saveLabel[saveState]}
            </span>
            <a
              href={`/f/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => flush()}
              className={`${outlineBtn} hidden sm:inline-flex`}
            >
              Vista previa
            </a>
            <button
              type="button"
              disabled={changingStatus}
              onClick={() => changeStatus(primaryAction.next)}
              className={form.status === 'OPEN' ? outlineBtn : 'btn-fire h-10 px-5 text-sm'}
            >
              {changingStatus ? '…' : primaryAction.label}
            </button>
          </>
        }
      />

      <div className="mx-auto max-w-3xl px-4 pb-24 pt-5 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${status.cls}`}>{status.label}</span>
            <h1 className="m-0 truncate font-display text-lg font-semibold uppercase text-cocoa-900 dark:text-white">
              {form.title || 'Sin título'}
            </h1>
          </div>
          <a href={`/f/${form.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-deep sm:hidden dark:text-brand-amber">
            Ver ↗
          </a>
        </div>

        <nav className="sticky top-16 z-30 -mx-4 mb-5 flex gap-1 bg-cream/95 px-4 py-2 backdrop-blur dark:bg-ink-950/95 sm:mx-0 sm:px-0" role="tablist">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => {
                flush();
                setTab(t.id);
              }}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
                tab === t.id
                  ? 'bg-ink-950 text-white dark:bg-white dark:text-ink-950'
                  : 'text-cocoa-600 hover:bg-white dark:text-white/65 dark:hover:bg-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {problems.length > 0 && (
          <div className="mb-5 rounded-2xl border border-brand-red/30 bg-brand-red/5 px-5 py-4 text-sm text-cocoa-800 dark:text-white/85" role="alert">
            <p className="m-0 font-semibold text-brand-red">Antes de publicar, revisa:</p>
            <ul className="m-0 mt-2 list-disc space-y-1 pl-5">
              {problems.map(problem => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'questions' && (
          <div className="space-y-5">
            <EventEditor
              title={form.title}
              description={form.description}
              coverImage={form.coverImage}
              event={form.event}
              onChange={patch => change(patch)}
              onError={showError}
            />
            <ContactFieldsEditor
              contactFields={form.contactFields}
              onChange={(field, mode) => dispatch({ type: 'setContactMode', field, mode })}
            />
            {form.sections.map((section, index) => (
              <SectionEditor
                key={section.id}
                section={section}
                index={index}
                total={form.sections.length}
                sections={form.sections}
                attendanceQuestionId={form.attendanceQuestionId}
                activeId={activeId}
                onActivate={setActiveId}
                dispatch={dispatch}
              />
            ))}
            <button
              type="button"
              onClick={() => dispatch({ type: 'addSection' })}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-sand-300 text-sm font-semibold text-cocoa-500 transition-colors hover:border-brand-orange hover:text-brand-deep dark:border-white/15 dark:text-white/60"
            >
              ＋ Agregar sección (nueva página)
            </button>
          </div>
        )}

        {tab === 'responses' && (
          <div className="space-y-5">
            {form.status !== 'DRAFT' && <SharePanel form={form} onNotify={notify} />}
            <ResponsesTab
              form={form}
              onError={showError}
              onNotify={notify}
              sheetsSlot={<SheetsCard form={form} onSheetsChange={handleSheetsChange} onError={showError} onNotify={notify} />}
            />
          </div>
        )}

        {tab === 'settings' && (
          <div className="space-y-5">
            {form.status !== 'DRAFT' ? (
              <SharePanel form={form} onNotify={notify} />
            ) : (
              <p className="m-0 rounded-2xl bg-white px-5 py-4 text-sm text-cocoa-600 dark:bg-ink-900 dark:text-white/70">
                Publica el formulario para obtener el enlace, el QR y el mensaje de WhatsApp.
              </p>
            )}
            <SettingsTab form={form} onChange={patch => change(patch)} />
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}
