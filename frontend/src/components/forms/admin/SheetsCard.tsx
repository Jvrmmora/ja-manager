import React, { useEffect, useState } from 'react';
import {
  connectSheets,
  disconnectSheets,
  getForm,
  getSheetsConfig,
  resyncSheets,
} from '../../../services/formsApi';
import type { AdminForm, FormSheets } from '../../../types/forms';
import { copyText } from '../../../utils/clipboard';
import { cardCls, outlineBtn } from './formStatus';

interface SheetsCardProps {
  form: AdminForm;
  onSheetsChange: (sheets: FormSheets) => void;
  onError: (message: string) => void;
  onNotify: (message: string) => void;
}

const formatSync = (iso?: string | null) =>
  iso
    ? new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(iso))
    : 'nunca';

const SheetsIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#0F9D58" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path fill="#87CEAC" d="M14 2v6h6z" />
    <path fill="#fff" d="M7 11h10v7H7zm1.5 1.5v1.25h3v-1.25zm4.5 0v1.25h2.5v-1.25zm-4.5 2.75v1.25h3v-1.25zm4.5 0v1.25h2.5v-1.25z" />
  </svg>
);

/**
 * Conexión con Google Sheets: el admin comparte su hoja con la cuenta de
 * servicio y pega el enlace. Desde ahí cada respuesta llega sola a la hoja,
 * que se puede compartir con quien sea.
 */
const SheetsCard: React.FC<SheetsCardProps> = ({ form, onSheetsChange, onError, onNotify }) => {
  const [config, setConfig] = useState<{ configured: boolean; serviceAccountEmail: string | null } | null>(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState<'connect' | 'resync' | 'disconnect' | null>(null);
  const { sheets } = form;
  const connected = sheets.enabled && !!sheets.spreadsheetId;
  const sheetUrl = sheets.spreadsheetId ? `https://docs.google.com/spreadsheets/d/${sheets.spreadsheetId}/edit` : null;

  useEffect(() => {
    getSheetsConfig()
      .then(setConfig)
      .catch(() => setConfig({ configured: false, serviceAccountEmail: null }));
  }, []);

  const refresh = async () => onSheetsChange((await getForm(form.id)).sheets);

  const run = async (kind: 'connect' | 'resync' | 'disconnect', action: () => Promise<string>) => {
    setBusy(kind);
    try {
      onNotify(await action());
    } catch (error) {
      onError(error instanceof Error ? error.message : 'No se pudo completar');
    } finally {
      await refresh().catch(() => undefined);
      setBusy(null);
    }
  };

  if (!config) return null;

  return (
    <section className={cardCls}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-400/10">
          <SheetsIcon />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 font-display text-xl font-semibold uppercase text-cocoa-900 dark:text-white">Google Sheets</h2>
          <p className="m-0 mt-0.5 text-sm text-cocoa-500 dark:text-white/60">
            {connected
              ? 'Cada respuesta llega sola a la hoja. Compártela con quien necesite verla.'
              : 'Envía las respuestas a una hoja de cálculo en vivo para compartirla con cualquiera.'}
          </p>
        </div>
        {connected && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
            Conectada
          </span>
        )}
      </div>

      {!config.configured ? (
        <p className="mb-0 mt-4 rounded-2xl bg-sand-50 px-4 py-3 text-sm text-cocoa-600 dark:bg-white/[0.04] dark:text-white/70">
          La integración aún no está activa en el servidor (falta la cuenta de servicio de Google). Mientras tanto
          puedes descargar el Excel.
        </p>
      ) : connected ? (
        <div className="mt-4 space-y-3">
          <p className="m-0 text-sm text-cocoa-600 dark:text-white/70">
            Última sincronización: <strong className="text-cocoa-900 dark:text-white">{formatSync(sheets.lastSyncAt)}</strong>
          </p>
          {sheets.lastError && (
            <p className="m-0 rounded-2xl bg-brand-amber/15 px-4 py-3 text-sm text-cocoa-800 dark:text-white/85">
              ⚠️ {sheets.lastError} Se reintentará automáticamente, o pulsa “Resincronizar”.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {sheetUrl && (
              <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="btn-fire h-10 px-4 text-sm">
                Abrir hoja ↗
              </a>
            )}
            <button
              type="button"
              className={outlineBtn}
              disabled={!!busy}
              onClick={() =>
                run('resync', async () => `Hoja actualizada (${(await resyncSheets(form.id)).rows} respuestas)`)
              }
            >
              {busy === 'resync' ? 'Sincronizando…' : 'Resincronizar'}
            </button>
            <button
              type="button"
              className={`${outlineBtn} ml-auto`}
              disabled={!!busy}
              onClick={() =>
                run('disconnect', async () => {
                  await disconnectSheets(form.id);
                  return 'Hoja desconectada (no se borró nada en Google)';
                })
              }
            >
              Desconectar
            </button>
          </div>
        </div>
      ) : (
        <ol className="m-0 mt-5 list-none space-y-4 p-0">
          <li className="flex gap-3">
            <span className="bg-fire flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">1</span>
            <div className="min-w-0 flex-1 text-sm text-cocoa-700 dark:text-white/80">
              Crea una hoja en{' '}
              <a href="https://sheets.new" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-deep underline dark:text-brand-amber">
                sheets.new
              </a>{' '}
              (o usa una que ya tengas).
            </div>
          </li>
          <li className="flex gap-3">
            <span className="bg-fire flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">2</span>
            <div className="min-w-0 flex-1 text-sm text-cocoa-700 dark:text-white/80">
              Pulsa <strong>Compartir</strong> y agrega este correo como <strong>Editor</strong>:
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-xl bg-sand-100 px-3 py-2 font-mono text-xs text-cocoa-800 dark:bg-white/10 dark:text-white/85">
                  {config.serviceAccountEmail}
                </code>
                <button
                  type="button"
                  className={outlineBtn}
                  onClick={async () => {
                    await copyText(config.serviceAccountEmail ?? '');
                    onNotify('Correo copiado');
                  }}
                >
                  Copiar
                </button>
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="bg-fire flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">3</span>
            <div className="min-w-0 flex-1 text-sm text-cocoa-700 dark:text-white/80">
              Pega aquí el enlace de la hoja:
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  type="url"
                  value={url}
                  placeholder="https://docs.google.com/spreadsheets/d/…"
                  onChange={e => setUrl(e.target.value)}
                  className="field-brand h-10 flex-1 text-sm"
                />
                <button
                  type="button"
                  disabled={!url.trim() || !!busy}
                  onClick={() =>
                    run('connect', async () => {
                      const result = await connectSheets(form.id, url.trim());
                      setUrl('');
                      return `Conectado a «${result.title}» (${result.rows} respuestas copiadas)`;
                    })
                  }
                  className="btn-fire h-10 px-5 text-sm"
                >
                  {busy === 'connect' ? 'Conectando…' : 'Conectar'}
                </button>
              </div>
            </div>
          </li>
        </ol>
      )}
    </section>
  );
};

export default SheetsCard;
