import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import type { AdminForm, FormSettings } from '../../../types/forms';
import { buildFormShareUrl, formShareMessage } from '../../../utils/shareUrls';
import { formatEventDate, formatEventTime, fromBogotaInput, toBogotaInput } from '../../../utils/forms/eventFormat';
import { copyText } from '../../../utils/clipboard';
import { cardCls, labelCls, outlineBtn } from './formStatus';

const Toggle: React.FC<{
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  description: string;
}> = ({ checked, onChange, title, description }) => (
  <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
    <span>
      <span className="block font-semibold text-cocoa-900 dark:text-white">{title}</span>
      <span className="block text-sm text-cocoa-500 dark:text-white/60">{description}</span>
    </span>
    <span className="relative mt-1 inline-flex flex-shrink-0">
      <input type="checkbox" role="switch" checked={checked} onChange={e => onChange(e.target.checked)} className="peer sr-only" />
      <span className="h-6 w-11 rounded-full bg-sand-300 transition-colors peer-checked:bg-brand-orange peer-focus-visible:ring-4 peer-focus-visible:ring-brand-orange/25 dark:bg-white/20" />
      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
    </span>
  </label>
);

interface SettingsTabProps {
  form: AdminForm;
  onChange: (patch: { settings?: FormSettings; capacity?: number | null; closesAt?: string | null }) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ form, onChange }) => {
  const setSettings = (patch: Partial<FormSettings>) => onChange({ settings: { ...form.settings, ...patch } });

  return (
    <div className="space-y-5">
      <section className={cardCls}>
        <h2 className="m-0 font-display text-xl font-semibold uppercase text-cocoa-900 dark:text-white">Quién puede responder</h2>
        <div className="mt-2 divide-y divide-sand-100 dark:divide-white/5">
          <Toggle
            checked={form.settings.allowGuests}
            onChange={value => setSettings({ allowGuests: value })}
            title="Permitir invitados"
            description="Personas sin cuenta pueden responder escribiendo sus datos."
          />
          <Toggle
            checked={form.settings.showRegisterCta}
            onChange={value => setSettings({ showRegisterCta: value })}
            title="Invitar a crear cuenta"
            description="Después de responder, a los invitados se les sugiere registrarse."
          />
        </div>
      </section>

      <section className={cardCls}>
        <h2 className="m-0 font-display text-xl font-semibold uppercase text-cocoa-900 dark:text-white">Cupo y cierre</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cfg-capacity" className={labelCls}>Cupo máximo</label>
            <input
              id="cfg-capacity"
              type="number"
              min={1}
              inputMode="numeric"
              value={form.capacity ?? ''}
              placeholder="Sin límite"
              onChange={e => onChange({ capacity: e.target.value === '' ? null : Math.max(1, Math.floor(Number(e.target.value))) })}
              className="field-brand h-11"
            />
            <p className="m-0 mt-1 text-xs text-cocoa-500 dark:text-white/55">
              Quien responde “No asistiré” no ocupa cupo. Ocupados: {form.seatsTaken}.
            </p>
          </div>
          <div>
            <label htmlFor="cfg-closes" className={labelCls}>Cerrar respuestas automáticamente</label>
            <input
              id="cfg-closes"
              type="datetime-local"
              value={toBogotaInput(form.closesAt)}
              onChange={e => onChange({ closesAt: fromBogotaInput(e.target.value) })}
              className="field-brand h-11"
            />
            <p className="m-0 mt-1 text-xs text-cocoa-500 dark:text-white/55">Hora de Bogotá. Vacío = hasta que lo cierres tú.</p>
          </div>
        </div>
      </section>

      <section className={cardCls}>
        <h2 className="m-0 font-display text-xl font-semibold uppercase text-cocoa-900 dark:text-white">Puntos</h2>
        <p className="m-0 mt-1 text-sm text-cocoa-500 dark:text-white/60">
          Premia a los jóvenes que responden con su cuenta o placa (una sola vez por formulario, en la temporada activa).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[0, 10, 20, 30, 50].map(points => (
            <button
              key={points}
              type="button"
              onClick={() => setSettings({ pointsReward: points })}
              aria-pressed={form.settings.pointsReward === points}
              className={`h-10 rounded-full border-[1.5px] px-4 text-sm font-semibold transition-colors ${
                form.settings.pointsReward === points
                  ? 'border-brand-orange bg-brand-orange/10 text-brand-deep dark:text-brand-amber'
                  : 'border-sand-300 text-cocoa-600 hover:border-cocoa-400 dark:border-white/15 dark:text-white/75'
              }`}
            >
              {points === 0 ? 'Sin puntos' : `+${points}`}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

interface SharePanelProps {
  form: AdminForm;
  onNotify: (message: string) => void;
}

/** Enlace, WhatsApp y QR para proyectar o imprimir. */
export const SharePanel: React.FC<SharePanelProps> = ({ form, onNotify }) => {
  const url = buildFormShareUrl(form.slug);
  const qrRef = useRef<HTMLDivElement>(null);
  const [showQr, setShowQr] = useState(false);
  const when = form.event.startsAt ? `${formatEventDate(form.event.startsAt)} · ${formatEventTime(form.event.startsAt)}` : null;
  const message = formShareMessage(url, form.title, when);

  const downloadQr = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${form.slug}-qr.png`;
    link.click();
  };

  return (
    <section className="rounded-3xl bg-ink-950 p-5 text-white sm:p-6">
      <p className="eyebrow m-0 text-brand-amber">Compartir</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input readOnly value={url} onFocus={e => e.target.select()} className="h-11 flex-1 rounded-2xl border border-white/15 bg-white/5 px-4 font-mono text-sm text-white/90" />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              await copyText(url);
              onNotify('Enlace copiado');
            }}
            className="btn-outline-light h-11 px-4 text-sm"
          >
            Copiar
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="btn-fire h-11 px-4 text-sm">
            WhatsApp
          </a>
          <button type="button" onClick={() => setShowQr(v => !v)} className="btn-outline-light h-11 px-4 text-sm" aria-expanded={showQr}>
            QR
          </button>
        </div>
      </div>
      {showQr && (
        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row">
          <div ref={qrRef} className="rounded-2xl bg-white p-3">
            <QRCodeCanvas value={url} size={168} level="M" fgColor="#140b10" />
          </div>
          <div className="text-sm text-white/70">
            <p className="m-0">Proyéctalo en el culto o imprímelo: al escanearlo abre el formulario.</p>
            <button type="button" onClick={downloadQr} className={`${outlineBtn} mt-3 border-white/30 text-white`}>
              Descargar PNG
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
