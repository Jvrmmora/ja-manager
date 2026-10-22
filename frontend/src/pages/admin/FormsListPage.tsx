import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLoader from '../../components/PageLoader';
import ToastContainer from '../../components/ToastContainer';
import ConfirmDangerModal from '../../components/ui/ConfirmDangerModal';
import BrandModalHeader from '../../components/ui/BrandModalHeader';
import AdminFormsHeader, { useAdminOnly } from '../../components/forms/admin/AdminFormsHeader';
import { STATUS_META, outlineBtn } from '../../components/forms/admin/formStatus';
import { useToast } from '../../hooks/useToast';
import { createForm, deleteForm, duplicateForm, listForms } from '../../services/formsApi';
import type { FormListItem } from '../../types/forms';
import { formatEventDate, formatEventTime } from '../../utils/forms/eventFormat';
import { buildFormShareUrl } from '../../utils/shareUrls';
import { copyText } from '../../utils/clipboard';
import '../../brand-skin.css';

const TEMPLATES = [
  {
    id: 'event' as const,
    title: 'Salida o evento',
    description: 'Pregunta "¿Asistirás?", acompañantes y notas. Lo más usado.',
    icon: '🎳',
  },
  {
    id: 'blank' as const,
    title: 'En blanco',
    description: 'Empieza sin preguntas, como en Google Forms.',
    icon: '📝',
  },
];

/** /admin/forms — lista de formularios con acceso rápido a crear y compartir. */
export default function FormsListPage() {
  useAdminOnly();
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [forms, setForms] = useState<FormListItem[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState<'event' | 'blank'>('event');
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<FormListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setForms(await listForms());
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudieron cargar los formularios', 'error');
      setForms([]);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (title.trim().length < 3) return;
    setCreating(true);
    try {
      const form = await createForm(title.trim(), template);
      navigate(`/admin/forms/${form.id}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo crear', 'error');
      setCreating(false);
    }
  };

  const handleDuplicate = async (form: FormListItem) => {
    try {
      const copy = await duplicateForm(form.id);
      showToast('Formulario duplicado como borrador');
      navigate(`/admin/forms/${copy.id}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo duplicar', 'error');
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteForm(toDelete.id);
      setForms(prev => prev?.filter(f => f.id !== toDelete.id) ?? null);
      showToast('Formulario eliminado');
      setToDelete(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo eliminar', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (!forms) return <PageLoader />;

  return (
    <div className="brand-skin min-h-screen bg-cream dark:bg-ink-950">
      <AdminFormsHeader backTo="/admin" backLabel="Volver al panel" />

      <section className="relative overflow-hidden bg-ink-950 pb-20 pt-8 sm:pt-10">
        <div className="pointer-events-none absolute left-1/3 -top-[420px] h-[820px] w-[820px] rounded-full bg-[radial-gradient(circle,rgba(242,106,46,.3)_0%,rgba(220,51,64,.12)_38%,rgba(20,11,16,0)_68%)] motion-safe:animate-ember" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:px-8">
          <div>
            <span className="eyebrow text-brand-amber">Eventos y encuestas</span>
            <h1 className="m-0 mt-2 font-display text-4xl font-bold uppercase text-white sm:text-5xl">Formularios</h1>
            <p className="m-0 mt-2 max-w-lg text-[15px] text-white/65">
              Crea un formulario, compártelo por WhatsApp y mira en vivo quién va. Los jóvenes con cuenta lo llenan con su placa.
            </p>
          </div>
          <button type="button" onClick={() => setShowCreate(true)} className="btn-fire h-12 px-6 text-[15px]">
            <span aria-hidden="true">＋</span> Nuevo formulario
          </button>
        </div>
      </section>

      <main className="relative mx-auto -mt-12 max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {forms.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-sand-300 bg-white p-10 text-center dark:border-white/15 dark:bg-ink-900">
            <p className="m-0 text-4xl" aria-hidden="true">🗒️</p>
            <h2 className="mb-1 mt-3 font-display text-2xl font-semibold uppercase text-cocoa-900 dark:text-white">
              Aún no hay formularios
            </h2>
            <p className="m-0 text-cocoa-500 dark:text-white/60">Crea el primero para tu próxima salida.</p>
            <button type="button" onClick={() => setShowCreate(true)} className="btn-fire mt-5 h-12 px-6">
              Crear formulario
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {forms.map(form => {
              const status = STATUS_META[form.status];
              return (
                <article
                  key={form.id}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-sand-200 bg-white transition-shadow hover:shadow-[0_30px_60px_-40px_rgba(78,15,58,0.5)] dark:border-white/10 dark:bg-ink-900"
                >
                  <button type="button" onClick={() => navigate(`/admin/forms/${form.id}`)} className="text-left">
                    <div className="relative h-28 overflow-hidden bg-ink-950">
                      {form.coverImage ? (
                        <img src={form.coverImage} alt="" className="h-full w-full object-cover opacity-90 transition-transform group-hover:scale-105" />
                      ) : (
                        <div className="h-full w-full bg-[radial-gradient(circle_at_30%_120%,rgba(242,106,46,.55),rgba(138,28,69,.35)_45%,transparent_70%)]" />
                      )}
                      <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${status.cls}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="p-5 pb-3">
                      <h2 className="m-0 line-clamp-2 font-display text-xl font-semibold uppercase leading-tight text-cocoa-900 dark:text-white">
                        {form.title}
                      </h2>
                      <p className="m-0 mt-1 text-sm text-cocoa-500 dark:text-white/60">
                        {form.event.startsAt
                          ? `${formatEventDate(form.event.startsAt)} · ${formatEventTime(form.event.startsAt)}`
                          : 'Sin fecha de evento'}
                      </p>
                      <div className="mt-4 flex gap-5">
                        <div>
                          <p className="m-0 font-display text-2xl font-semibold text-cocoa-900 dark:text-white">{form.responses}</p>
                          <p className="m-0 text-xs text-cocoa-500 dark:text-white/55">respuestas</p>
                        </div>
                        {form.hasAttendanceQuestion && (
                          <div>
                            <p className="m-0 font-display text-2xl font-semibold text-emerald-600 dark:text-emerald-300">
                              {form.attending}
                              {form.capacity ? <span className="text-base text-cocoa-400"> / {form.capacity}</span> : null}
                            </p>
                            <p className="m-0 text-xs text-cocoa-500 dark:text-white/55">asistirán</p>
                          </div>
                        )}
                        {form.sheetsEnabled && (
                          <span className="ml-auto self-end rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                            Sheets
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  <div className="mt-auto flex items-center gap-2 border-t border-sand-100 px-4 py-3 dark:border-white/5">
                    <button
                      type="button"
                      className={outlineBtn}
                      disabled={form.status === 'DRAFT'}
                      title={form.status === 'DRAFT' ? 'Publícalo para compartir' : 'Copiar enlace'}
                      onClick={async () => {
                        await copyText(buildFormShareUrl(form.slug));
                        showToast('Enlace copiado');
                      }}
                    >
                      Copiar enlace
                    </button>
                    <button type="button" className={outlineBtn} onClick={() => handleDuplicate(form)}>
                      Duplicar
                    </button>
                    <button
                      type="button"
                      aria-label="Eliminar formulario"
                      onClick={() => setToDelete(form)}
                      className="ml-auto flex h-10 w-10 items-center justify-center rounded-full text-cocoa-400 transition-colors hover:bg-brand-red/10 hover:text-brand-red"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                      </svg>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg overflow-hidden rounded-t-3xl bg-white dark:bg-ink-900 sm:rounded-3xl">
            <BrandModalHeader
              title="Nuevo formulario"
              subtitle="Después podrás cambiar todo"
              icon={<span aria-hidden="true">📝</span>}
              onClose={() => setShowCreate(false)}
            />
            <div className="space-y-5 p-6">
              <div>
                <label htmlFor="new-form-title" className="mb-1.5 block text-sm font-semibold text-cocoa-700 dark:text-white/85">
                  ¿Cómo se llama?
                </label>
                <input
                  id="new-form-title"
                  autoFocus
                  value={title}
                  maxLength={120}
                  placeholder="Ej: Salida a bolos"
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  className="field-brand h-12"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id)}
                    aria-pressed={template === t.id}
                    className={`rounded-2xl border-[1.5px] p-4 text-left transition-colors ${
                      template === t.id
                        ? 'border-brand-orange bg-brand-orange/[0.06]'
                        : 'border-sand-300 hover:border-cocoa-400 dark:border-white/15'
                    }`}
                  >
                    <span className="text-2xl" aria-hidden="true">{t.icon}</span>
                    <p className="m-0 mt-2 font-semibold text-cocoa-900 dark:text-white">{t.title}</p>
                    <p className="m-0 mt-0.5 text-sm text-cocoa-500 dark:text-white/60">{t.description}</p>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || title.trim().length < 3}
                className="btn-fire h-12 w-full"
              >
                {creating ? 'Creando…' : 'Crear y editar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDangerModal
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar formulario"
        question="¿Seguro que quieres eliminar este formulario?"
        subject={toDelete?.title ?? ''}
        warnings={['El enlace dejará de funcionar.', 'Las respuestas ya no se verán en el panel.']}
        confirmLabel="Eliminar"
        loading={deleting}
      />
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}
