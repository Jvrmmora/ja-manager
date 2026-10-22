import React, { useRef, useState } from 'react';
import RichTextEditor from '../../RichTextEditor';
import type { ContactField, ContactFieldConfig, ContactFieldMode, FormEvent } from '../../../types/forms';
import { fromBogotaInput, toBogotaInput } from '../../../utils/forms/eventFormat';
import { uploadFormCover } from '../../../services/formsApi';
import { CONTACT_LABELS } from '../public/ContactInputs';
import { cardCls, labelCls } from './formStatus';

interface EventEditorProps {
  title: string;
  description: string;
  coverImage: string | null;
  event: FormEvent;
  onChange: (patch: { title?: string; description?: string; coverImage?: string | null; event?: FormEvent }) => void;
  onError: (message: string) => void;
}

/** Tarjeta principal: título, portada, cuándo/dónde/cuánto y descripción. */
export const EventEditor: React.FC<EventEditorProps> = ({ title, description, coverImage, event, onChange, onError }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const setEvent = (patch: Partial<FormEvent>) => onChange({ event: { ...event, ...patch } });

  const upload = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      onError('La imagen no puede pesar más de 5MB');
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadFormCover(file);
      onChange({ coverImage: url });
    } catch (error) {
      onError(error instanceof Error ? error.message : 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className={`${cardCls} border-t-4 !border-t-brand-orange`}>
      <div className="relative mb-5 overflow-hidden rounded-2xl bg-ink-950">
        {coverImage ? (
          <img src={coverImage} alt="" className="aspect-[16/6] w-full object-cover" />
        ) : (
          <div className="aspect-[16/6] w-full bg-[radial-gradient(circle_at_30%_120%,rgba(242,106,46,.55),rgba(138,28,69,.35)_45%,transparent_70%)]" />
        )}
        <div className="absolute bottom-3 right-3 flex gap-2">
          {coverImage && (
            <button type="button" onClick={() => onChange({ coverImage: null })} className="btn-outline-light h-9 bg-black/40 px-3 text-xs">
              Quitar
            </button>
          )}
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-outline-light h-9 bg-black/40 px-3 text-xs">
            {uploading ? 'Subiendo…' : coverImage ? 'Cambiar portada' : '📷 Agregar portada'}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => {
            upload(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>

      <input
        value={title}
        maxLength={120}
        aria-label="Título del formulario"
        placeholder="Título del formulario"
        onChange={e => onChange({ title: e.target.value })}
        className="w-full border-0 border-b-2 border-transparent bg-transparent px-0 pb-1 font-display text-3xl font-semibold uppercase text-cocoa-900 transition-colors focus:border-brand-orange focus:outline-none focus:ring-0 dark:text-white"
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ev-start" className={labelCls}>Empieza</label>
          <input
            id="ev-start"
            type="datetime-local"
            value={toBogotaInput(event.startsAt)}
            onChange={e => setEvent({ startsAt: fromBogotaInput(e.target.value) })}
            className="field-brand h-11"
          />
        </div>
        <div>
          <label htmlFor="ev-end" className={labelCls}>Termina (opcional)</label>
          <input
            id="ev-end"
            type="datetime-local"
            value={toBogotaInput(event.endsAt)}
            min={toBogotaInput(event.startsAt) || undefined}
            onChange={e => setEvent({ endsAt: fromBogotaInput(e.target.value) })}
            className="field-brand h-11"
          />
        </div>
        <div>
          <label htmlFor="ev-location" className={labelCls}>Lugar</label>
          <input
            id="ev-location"
            value={event.location ?? ''}
            maxLength={200}
            placeholder="Ej: Bolera Unicentro"
            onChange={e => setEvent({ location: e.target.value })}
            className="field-brand h-11"
          />
        </div>
        <div>
          <label htmlFor="ev-maps" className={labelCls}>Enlace de Maps (opcional)</label>
          <input
            id="ev-maps"
            type="url"
            value={event.mapsUrl ?? ''}
            maxLength={500}
            placeholder="https://maps.app.goo.gl/…"
            onChange={e => setEvent({ mapsUrl: e.target.value })}
            className="field-brand h-11"
          />
        </div>
        <div>
          <label htmlFor="ev-cost" className={labelCls}>Costo por persona (COP)</label>
          <input
            id="ev-cost"
            type="number"
            min={0}
            inputMode="numeric"
            value={event.cost ?? ''}
            placeholder="Vacío = no mostrar · 0 = gratis"
            onChange={e => setEvent({ cost: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })}
            className="field-brand h-11"
          />
        </div>
        <div>
          <label htmlFor="ev-cost-note" className={labelCls}>Nota del costo</label>
          <input
            id="ev-cost-note"
            value={event.costNote ?? ''}
            maxLength={200}
            placeholder="Ej: incluye 2 líneas y gaseosa"
            onChange={e => setEvent({ costNote: e.target.value })}
            className="field-brand h-11"
          />
        </div>
      </div>

      <div className="mt-5">
        <span className={labelCls}>Información del evento</span>
        <RichTextEditor
          value={description}
          onChange={value => onChange({ description: value })}
          placeholder="Qué van a hacer, qué llevar, a qué hora salen…"
          minHeightClassName="min-h-[120px]"
        />
      </div>
    </section>
  );
};

const MODES: { id: ContactFieldMode; label: string }[] = [
  { id: 'required', label: 'Obligatorio' },
  { id: 'optional', label: 'Opcional' },
  { id: 'hidden', label: 'No pedir' },
];

const FIELD_ORDER: ContactField[] = ['fullName', 'phone', 'email', 'birthday', 'ageRange', 'gender', 'group'];

interface ContactFieldsEditorProps {
  contactFields: ContactFieldConfig[];
  onChange: (field: ContactField, mode: ContactFieldMode) => void;
}

/** "Tus datos": qué se pide. Para jóvenes con cuenta se llena solo. */
export const ContactFieldsEditor: React.FC<ContactFieldsEditorProps> = ({ contactFields, onChange }) => {
  const modeOf = (field: ContactField): ContactFieldMode =>
    contactFields.find(c => c.field === field)?.mode ?? 'hidden';

  return (
    <section className={cardCls}>
      <h2 className="m-0 font-display text-xl font-semibold uppercase text-cocoa-900 dark:text-white">Tus datos</h2>
      <p className="m-0 mt-1 text-sm text-cocoa-500 dark:text-white/60">
        Los jóvenes con cuenta o placa no los escriben: se llenan solos desde su perfil. Solo se les pide lo que falte.
      </p>
      <div className="mt-4 divide-y divide-sand-100 dark:divide-white/5">
        {FIELD_ORDER.map(field => {
          const mode = modeOf(field);
          const locked = field === 'fullName';
          return (
            <div key={field} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[15px] font-medium text-cocoa-800 dark:text-white/85">
                {CONTACT_LABELS[field]}
                {locked && <span className="ml-2 text-xs text-cocoa-400">siempre</span>}
              </span>
              <div className="inline-flex rounded-full bg-sand-100 p-1 dark:bg-white/[0.06]" role="radiogroup" aria-label={CONTACT_LABELS[field]}>
                {MODES.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={mode === option.id}
                    disabled={locked}
                    onClick={() => onChange(field, option.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed ${
                      mode === option.id
                        ? 'bg-white text-cocoa-900 shadow-sm dark:bg-ink-800 dark:text-white'
                        : 'text-cocoa-500 hover:text-cocoa-800 dark:text-white/55'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
