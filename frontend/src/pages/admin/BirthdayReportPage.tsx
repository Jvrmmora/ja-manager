import { useCallback, useEffect, useMemo, useState } from 'react';
import PageLoader from '../../components/PageLoader';
import ToastContainer from '../../components/ToastContainer';
import RespondentAvatar from '../../components/forms/admin/RespondentAvatar';
import AdminFormsHeader, { useAdminOnly } from '../../components/forms/admin/AdminFormsHeader';
import { outlineBtn } from '../../components/forms/admin/formStatus';
import { useToast } from '../../hooks/useToast';
import { listForms } from '../../services/formsApi';
import type { BirthdayGuest, BirthdayReport, Semester } from '../../services/birthdayReportApi';
import {
  addBirthdayGuest,
  deleteBirthdayGuest,
  downloadBirthdayReportCsv,
  fetchBirthdayReport,
  listBirthdayGuests,
} from '../../services/birthdayReportApi';
import type { FormListItem } from '../../types/forms';
import '../../brand-skin.css';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const pad = (n: number) => String(n).padStart(2, '0');

const inputCls =
  'h-11 rounded-xl border border-sand-300 bg-white px-3 text-sm text-cocoa-900 dark:border-white/15 dark:bg-ink-900 dark:text-white';

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/** Resalta la búsqueda dentro del nombre sin importar tildes ni mayúsculas. */
const Highlight = ({ text, term }: { text: string; term: string }) => {
  if (!term) return <>{text}</>;
  // NFD puede cambiar el largo; se compara letra por letra para conservar los índices.
  const plain = Array.from(text).map(ch => normalize(ch));
  const flat = plain.join('');
  const index = flat.indexOf(term);
  if (index < 0) return <>{text}</>;
  let start = 0;
  let acc = 0;
  while (start < plain.length && acc + plain[start].length <= index) acc += plain[start++].length;
  let end = start;
  while (end < plain.length && acc < index + term.length) acc += plain[end++].length;
  const chars = Array.from(text);
  return (
    <>
      {chars.slice(0, start).join('')}
      <mark className="rounded bg-brand-amber/60 px-0.5 text-inherit">{chars.slice(start, end).join('')}</mark>
      {chars.slice(end).join('')}
    </>
  );
};

/** /admin/birthday-report — cumpleaños del semestre: grupo 1 + invitados del formulario + manuales. */
export default function BirthdayReportPage() {
  useAdminOnly();
  const { toasts, showToast, removeToast } = useToast();
  // Calendario del grupo: S1 = enero-junio, S2 = julio-diciembre.
  const [semester, setSemester] = useState<Semester>(new Date().getMonth() < 6 ? 1 : 2);
  const [forms, setForms] = useState<FormListItem[] | null>(null);
  const [formId, setFormId] = useState('');
  const [report, setReport] = useState<BirthdayReport | null>(null);
  const [guests, setGuests] = useState<BirthdayGuest[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [search, setSearch] = useState('');
  const term = normalize(search.trim());
  const matches = useMemo(
    () =>
      term && report
        ? report.groups.reduce((sum, g) => sum + g.rows.filter(r => normalize(r.name).includes(term)).length, 0)
        : 0,
    [report, term]
  );

  const [name, setName] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [day, setDay] = useState('');
  const [onlyThisForm, setOnlyThisForm] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listForms()
      .then(list => {
        setForms(list);
        // Por defecto, el formulario abierto más reciente (la lista llega más nuevo primero).
        const preferred = list.find(f => f.status === 'OPEN') ?? list[0];
        if (preferred) setFormId(preferred.id);
      })
      .catch(error => {
        showToast(error instanceof Error ? error.message : 'No se pudieron cargar los formularios', 'error');
        setForms([]);
      });
  }, [showToast]);

  const load = useCallback(async () => {
    try {
      const [data, manual] = await Promise.all([
        fetchBirthdayReport(semester, formId),
        listBirthdayGuests(formId),
      ]);
      setReport(data);
      setGuests(manual);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo generar el reporte', 'error');
    }
  }, [semester, formId, showToast]);

  useEffect(() => {
    if (forms) load();
  }, [forms, load]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadBirthdayReportCsv(semester, formId);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo descargar', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    const dayNumber = Number(day);
    if (name.trim().length < 2 || !Number.isInteger(dayNumber)) return;
    setSaving(true);
    try {
      await addBirthdayGuest({
        fullName: name.trim(),
        month,
        day: dayNumber,
        formId: onlyThisForm && formId ? formId : null,
      });
      setName('');
      setDay('');
      showToast('Invitado agregado');
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo agregar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (guest: BirthdayGuest) => {
    try {
      await deleteBirthdayGuest(guest.id);
      showToast('Invitado eliminado');
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo eliminar', 'error');
    }
  };

  if (!forms) return <PageLoader />;

  return (
    <div className="brand-skin min-h-screen bg-cream dark:bg-ink-950">
      <AdminFormsHeader backTo="/admin" backLabel="Volver al panel" />

      <section className="relative overflow-hidden bg-ink-950 pb-20 pt-8 sm:pt-10">
        <div className="relative mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:px-8">
          <div>
            <span className="eyebrow text-brand-amber">Celebración de cumpleaños</span>
            <h1 className="m-0 mt-2 font-display text-4xl font-bold uppercase text-white sm:text-5xl">
              Reporte por semestre
            </h1>
            <p className="m-0 mt-2 max-w-lg text-[15px] text-white/65">
              Jóvenes del grupo 1 más los invitados del formulario que elijas, agrupados por mes y en orden alfabético.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || !report}
            className="btn-fire h-12 px-6 text-[15px] disabled:opacity-60"
          >
            {downloading ? 'Descargando…' : 'Descargar CSV'}
          </button>
        </div>
      </section>

      <main className="relative mx-auto -mt-12 grid max-w-7xl gap-6 px-4 [&>*]:min-w-0 pb-16 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-3xl border border-sand-200 bg-white p-4 dark:border-white/10 dark:bg-ink-900 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Semestre">
              {([1, 2] as Semester[]).map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSemester(value)}
                  aria-pressed={semester === value}
                  className={`${outlineBtn} ${semester === value ? '!border-brand-red !text-brand-red' : ''}`}
                >
                  {value === 1 ? 'Semestre 1 · Ene–Jun' : 'Semestre 2 · Jul–Dic'}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-1 text-sm sm:ml-auto sm:flex-row sm:items-center sm:gap-2 text-cocoa-600 dark:text-white/70">
              Invitados de
              <select value={formId} onChange={e => setFormId(e.target.value)} className={inputCls}>
                <option value="">(ningún formulario)</option>
                {forms.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-3xl border border-sand-200 bg-white p-4 dark:border-white/10 dark:bg-ink-900">
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar un nombre para resaltarlo…"
              aria-label="Buscar nombre"
              className={`${inputCls} w-full`}
            />
            {term && report && (
              <p
                role="status"
                className={`m-0 mt-2 text-sm font-semibold ${matches ? 'text-emerald-600 dark:text-emerald-400' : 'text-brand-red'}`}
              >
                {matches ? `Sí está · ${matches} coincidencia${matches === 1 ? '' : 's'}` : 'No está en este reporte'}
              </p>
            )}
          </div>

          {!report ? (
            <p className="text-cocoa-500 dark:text-white/60">Generando reporte…</p>
          ) : (
            <>
              <p className="m-0 text-sm font-semibold text-cocoa-700 dark:text-white/80">
                Total registrados: {report.total}
              </p>
              {report.groups.map(group => (
                <section
                  key={group.month}
                  className="rounded-3xl border border-sand-200 bg-white p-3 dark:border-white/10 dark:bg-ink-900 sm:p-5"
                >
                  <h2 className="m-0 font-display text-xl font-semibold uppercase text-cocoa-900 dark:text-white">
                    {group.label} <span className="text-cocoa-400">({group.rows.length})</span>
                  </h2>
                  {group.rows.length === 0 ? (
                    <p className="m-0 mt-2 text-sm text-cocoa-400 dark:text-white/40">Sin cumpleaños este mes.</p>
                  ) : (
                    <ul className="m-0 mt-3 list-none space-y-1 p-0">
                      {group.rows.map(row => (
                        <li
                          key={`${row.name}-${row.day}`}
                          className={`flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm ${
                            term && normalize(row.name).includes(term) ? 'bg-brand-amber/15 ring-1 ring-brand-amber/50' : ''
                          }`}
                        >
                          <RespondentAvatar name={row.name} photoUrl={row.profileImage} />
                          <div className="min-w-0 flex-1">
                            <p className="m-0 break-words font-medium text-cocoa-900 dark:text-white">
                              <Highlight text={row.name} term={term} />
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                              {row.placa && (
                                <span className="rounded-full bg-brand-red/10 px-2 py-0.5 font-mono text-brand-red">
                                  {row.placa}
                                </span>
                              )}
                              <span className="rounded-full bg-sand-100 px-2 py-0.5 text-cocoa-600 dark:bg-white/10 dark:text-white/70">
                                {row.origin}
                              </span>
                            </div>
                          </div>
                          <span className="flex-shrink-0 rounded-lg bg-sand-100 px-2 py-1 font-display text-cocoa-700 dark:bg-white/10 dark:text-white/80">
                            {pad(row.day)}/{pad(row.month + 1)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </>
          )}
        </div>

        <aside className="h-fit space-y-4 rounded-3xl border border-sand-200 bg-white p-5 dark:border-white/10 dark:bg-ink-900">
          <h2 className="m-0 font-display text-xl font-semibold uppercase text-cocoa-900 dark:text-white">
            Invitados manuales
          </h2>
          <p className="m-0 text-sm text-cocoa-500 dark:text-white/60">
            Para quien no llenó el formulario. Entran al reporte del semestre que corresponda a su cumpleaños.
          </p>
          <form onSubmit={handleAdd} className="space-y-3">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nombre completo"
              maxLength={120}
              className={`${inputCls} w-full`}
              aria-label="Nombre completo"
            />
            <div className="flex gap-2">
              <select value={month} onChange={e => setMonth(Number(e.target.value))} className={`${inputCls} flex-1`} aria-label="Mes">
                {MONTHS.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                value={day}
                onChange={e => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
                placeholder="Día"
                inputMode="numeric"
                className={`${inputCls} w-20`}
                aria-label="Día"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-cocoa-600 dark:text-white/70">
              <input
                type="checkbox"
                checked={onlyThisForm}
                disabled={!formId}
                onChange={e => setOnlyThisForm(e.target.checked)}
              />
              Solo para el formulario elegido
            </label>
            <button
              type="submit"
              disabled={saving || name.trim().length < 2 || !day}
              className="btn-fire h-11 w-full text-sm disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Agregar invitado'}
            </button>
          </form>

          {guests.length > 0 && (
            <ul className="m-0 list-none divide-y divide-sand-100 p-0 dark:divide-white/5">
              {guests.map(guest => (
                <li key={guest.id} className="flex items-center gap-2 py-2 text-sm">
                  <span className="flex-1 text-cocoa-900 dark:text-white">
                    {guest.fullName}
                    <span className="ml-2 text-cocoa-400">
                      {pad(guest.day)}/{pad(guest.month)}
                    </span>
                    {!guest.formId && <span className="ml-2 text-xs text-cocoa-400">(todos los reportes)</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(guest)}
                    aria-label={`Eliminar a ${guest.fullName}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-cocoa-400 transition-colors hover:bg-brand-red/10 hover:text-brand-red"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </main>

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}
