import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ConfirmDangerModal from '../../ui/ConfirmDangerModal';
import {
  deleteFormResponse,
  downloadFormResponsesXlsx,
  getFormStats,
  listFormResponses,
  type ResponseFilters,
} from '../../../services/formsApi';
import type { AdminForm, FormResponseItem, FormStats, RespondentKind } from '../../../types/forms';
import { CONTACT_LABELS } from '../public/ContactInputs';
import { omitKey } from '../../../utils/forms/omitKey';
import { cardCls, outlineBtn } from './formStatus';

const KIND_LABEL: Record<RespondentKind, string> = { session: 'Joven', placa: 'Joven (placa)', guest: 'Invitado' };

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));

interface ResponsesTabProps {
  form: AdminForm;
  onError: (message: string) => void;
  onNotify: (message: string) => void;
  /** Tarjeta de Google Sheets (fase de integración). */
  sheetsSlot?: React.ReactNode;
}

const StatTile: React.FC<{ label: string; value: React.ReactNode; tone?: string }> = ({ label, value, tone }) => (
  <div className="rounded-2xl border border-sand-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-ink-900">
    <p className={`m-0 font-display text-3xl font-semibold ${tone ?? 'text-cocoa-900 dark:text-white'}`}>{value}</p>
    <p className="m-0 text-xs font-medium uppercase tracking-wider text-cocoa-500 dark:text-white/55">{label}</p>
  </div>
);

/** Respuestas: resumen tipo Google Forms + tabla filtrable + Excel. */
const ResponsesTab: React.FC<ResponsesTabProps> = ({ form, onError, onNotify, sheetsSlot }) => {
  const [stats, setStats] = useState<FormStats | null>(null);
  const [items, setItems] = useState<FormResponseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [filters, setFilters] = useState<ResponseFilters>({ page: 1, limit: 50 });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<FormResponseItem | null>(null);
  const [toDelete, setToDelete] = useState<FormResponseItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const questions = useMemo(() => form.sections.flatMap(s => s.questions), [form.sections]);
  const contactFields = form.contactFields.filter(c => c.mode !== 'hidden').map(c => c.field);

  const load = useCallback(async () => {
    try {
      const [statsData, list] = await Promise.all([getFormStats(form.id), listFormResponses(form.id, filters)]);
      setStats(statsData);
      setItems(list.items);
      setTotal(list.pagination.total);
      setPages(list.pagination.pages || 1);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'No se pudieron cargar las respuestas');
    }
  }, [form.id, filters, onError]);

  useEffect(() => {
    load();
  }, [load]);

  // Búsqueda con pausa para no consultar en cada tecla
  useEffect(() => {
    const id = setTimeout(() => setFilters(prev => ({ ...prev, page: 1, search })), 350);
    return () => clearTimeout(id);
  }, [search]);

  const answerText = (item: FormResponseItem, questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    const value = item.answers[questionId];
    if (!question || value === undefined) return '—';
    if (question.type === 'yes_no') return value === 'yes' ? 'Sí' : 'No';
    const labelOf = (id: string) => question.options?.find(o => o.id === id)?.label ?? id;
    if (Array.isArray(value)) return value.map(labelOf).join(', ');
    if (question.options) return labelOf(String(value));
    return String(value);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteFormResponse(form.id, toDelete.id);
      onNotify('Respuesta eliminada');
      setToDelete(null);
      setSelected(null);
      load();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'No se pudo eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const hasAttendance = !!form.attendanceQuestionId;

  return (
    <div className="space-y-5">
      {/* Resumen */}
      <div className={`grid gap-3 ${hasAttendance ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
        <StatTile label="Respuestas" value={stats?.total ?? '…'} />
        {hasAttendance && (
          <StatTile
            label={form.capacity ? `Asistirán (cupo ${form.capacity})` : 'Asistirán'}
            value={stats?.attendance.yes ?? '…'}
            tone="text-emerald-600 dark:text-emerald-300"
          />
        )}
        {hasAttendance && <StatTile label="No asistirán" value={stats?.attendance.no ?? '…'} tone="text-brand-red" />}
        <StatTile label="Invitados" value={stats ? stats.byKind.guest : '…'} />
      </div>

      {sheetsSlot}

      {stats && stats.questions.some(q => q.answered > 0) && (
        <section className={cardCls}>
          <h2 className="m-0 font-display text-xl font-semibold uppercase text-cocoa-900 dark:text-white">Resumen</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {stats.questions.filter(q => q.answered > 0).map(q => {
              const max = Math.max(1, ...q.options.map(o => o.count));
              return (
                <div key={q.questionId}>
                  <p className="m-0 font-semibold text-cocoa-900 dark:text-white">{q.label}</p>
                  <p className="m-0 mb-2 text-xs text-cocoa-500 dark:text-white/55">{q.answered} respuestas</p>
                  <ul className="m-0 list-none space-y-1.5 p-0">
                    {q.options.map(option => (
                      <li key={option.id} className="text-sm">
                        <div className="flex justify-between text-cocoa-700 dark:text-white/80">
                          <span className="truncate">{option.label}</span>
                          <span className="font-semibold">{option.count}</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand-100 dark:bg-white/10">
                          <div className="bg-fire h-full rounded-full transition-all" style={{ width: `${(option.count / max) * 100}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Lista */}
      <section className={cardCls}>
        <div className="flex flex-col gap-3">
          <h2 className="m-0 font-display text-xl font-semibold uppercase text-cocoa-900 dark:text-white">
            Personas <span className="text-cocoa-400">({total})</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={search}
              placeholder="Buscar nombre, teléfono, placa…"
              onChange={e => setSearch(e.target.value)}
              className="field-brand h-10 w-full text-sm sm:w-64"
            />
            {hasAttendance && (
              <select
                aria-label="Filtrar por asistencia"
                value={filters.attending ?? ''}
                onChange={e => {
                  const rest = omitKey(filters, 'attending');
                  setFilters(e.target.value ? { ...rest, page: 1, attending: e.target.value as 'yes' | 'no' } : { ...rest, page: 1 });
                }}
                className="field-brand h-10 w-auto text-sm"
              >
                <option value="">Todos</option>
                <option value="yes">Asistirán</option>
                <option value="no">No asistirán</option>
              </select>
            )}
            <select
              aria-label="Filtrar por tipo"
              value={filters.kind ?? ''}
              onChange={e => {
                const rest = omitKey(filters, 'kind');
                setFilters(e.target.value ? { ...rest, page: 1, kind: e.target.value as RespondentKind } : { ...rest, page: 1 });
              }}
              className="field-brand h-10 w-auto text-sm"
            >
              <option value="">Jóvenes e invitados</option>
              <option value="session">Jóvenes (sesión)</option>
              <option value="placa">Jóvenes (placa)</option>
              <option value="guest">Invitados</option>
            </select>
            <button
              type="button"
              className={outlineBtn}
              disabled={downloading || total === 0}
              onClick={async () => {
                setDownloading(true);
                try {
                  await downloadFormResponsesXlsx(form.id, `${form.slug}-respuestas.xlsx`);
                } catch (error) {
                  onError(error instanceof Error ? error.message : 'No se pudo descargar');
                } finally {
                  setDownloading(false);
                }
              }}
            >
              {downloading ? 'Descargando…' : '⬇ Excel'}
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="mb-0 mt-6 rounded-2xl bg-sand-50 px-4 py-8 text-center text-sm text-cocoa-500 dark:bg-white/[0.03] dark:text-white/55">
            {filters.search || filters.attending || filters.kind
              ? 'Nadie coincide con el filtro.'
              : 'Aún no hay respuestas. Comparte el enlace para empezar a recibirlas.'}
          </p>
        ) : (
          <ul className="m-0 mt-4 list-none divide-y divide-sand-100 p-0 dark:divide-white/5">
            {items.map(item => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-sand-50 dark:hover:bg-white/[0.04]"
                >
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                      item.attending === true ? 'bg-emerald-500' : item.attending === false ? 'bg-brand-red' : 'bg-sand-300'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate font-semibold text-cocoa-900 dark:text-white">
                      {String(item.respondent.contact.fullName ?? 'Sin nombre')}
                    </p>
                    <p className="m-0 truncate text-xs text-cocoa-500 dark:text-white/55">
                      {KIND_LABEL[item.respondent.kind]}
                      {item.respondent.placa ? ` · ${item.respondent.placa}` : ''}
                      {item.respondent.contact.phone ? ` · ${item.respondent.contact.phone}` : ''}
                    </p>
                  </div>
                  <span className="hidden text-xs text-cocoa-400 sm:block">{formatDateTime(item.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3 text-sm">
            <button type="button" className={outlineBtn} disabled={(filters.page ?? 1) <= 1} onClick={() => setFilters(p => ({ ...p, page: (p.page ?? 1) - 1 }))}>
              Anterior
            </button>
            <span className="text-cocoa-500 dark:text-white/60">
              {filters.page ?? 1} de {pages}
            </span>
            <button type="button" className={outlineBtn} disabled={(filters.page ?? 1) >= pages} onClick={() => setFilters(p => ({ ...p, page: (p.page ?? 1) + 1 }))}>
              Siguiente
            </button>
          </div>
        )}
      </section>

      {/* Detalle */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" role="dialog" aria-modal="true" onClick={() => setSelected(null)}>
          <aside className="h-full w-full max-w-md overflow-y-auto bg-white p-6 dark:bg-ink-900" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow m-0 text-brand-deep dark:text-brand-amber">{KIND_LABEL[selected.respondent.kind]}</p>
                <h3 className="m-0 mt-1 font-display text-2xl font-semibold uppercase text-cocoa-900 dark:text-white">
                  {String(selected.respondent.contact.fullName ?? 'Sin nombre')}
                </h3>
                <p className="m-0 text-sm text-cocoa-500 dark:text-white/55">
                  {formatDateTime(selected.createdAt)}
                  {selected.updatedAt !== selected.createdAt ? ` · editada ${formatDateTime(selected.updatedAt)}` : ''}
                </p>
              </div>
              <button type="button" aria-label="Cerrar" onClick={() => setSelected(null)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-sand-100 dark:hover:bg-white/10">
                ✕
              </button>
            </div>

            <dl className="mt-6 space-y-3">
              {selected.respondent.placa && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-cocoa-400">Placa</dt>
                  <dd className="m-0 font-mono text-cocoa-900 dark:text-white">{selected.respondent.placa}</dd>
                </div>
              )}
              {contactFields
                .filter(field => field !== 'fullName' && selected.respondent.contact[field] !== undefined)
                .map(field => (
                  <div key={field}>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-cocoa-400">{CONTACT_LABELS[field]}</dt>
                    <dd className="m-0 text-cocoa-900 dark:text-white">{String(selected.respondent.contact[field])}</dd>
                  </div>
                ))}
              <hr className="border-sand-100 dark:border-white/10" />
              {questions.map(q => (
                <div key={q.id}>
                  <dt className="text-sm font-semibold text-cocoa-600 dark:text-white/70">{q.label}</dt>
                  <dd className="m-0 whitespace-pre-wrap text-cocoa-900 dark:text-white">{answerText(selected, q.id)}</dd>
                </div>
              ))}
            </dl>

            <button
              type="button"
              onClick={() => setToDelete(selected)}
              className="mt-8 text-sm font-semibold text-brand-red hover:underline"
            >
              Eliminar esta respuesta
            </button>
          </aside>
        </div>
      )}

      <ConfirmDangerModal
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar respuesta"
        question="¿Eliminar esta respuesta?"
        subject={String(toDelete?.respondent.contact.fullName ?? '')}
        warnings={['Se libera su cupo.', 'Si ganó puntos por responder, se le quitan.']}
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </div>
  );
};

export default ResponsesTab;
