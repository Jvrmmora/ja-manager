import React, { useCallback, useEffect, useState } from 'react';
import ConfirmDangerModal from '../ui/ConfirmDangerModal';
import LoadingSpinner from '../LoadingSpinner';
import {
  dismissDuplicatePair,
  fetchDuplicatePairs,
  mergeYoungAccounts,
  previewYoungMerge,
  type DuplicatePair,
  type DuplicatePerson,
  type MergeSummary,
} from '../../services/youngDuplicatesApi';

interface DuplicatesManagerProps {
  onShowSuccess: (message: string) => void;
  onShowError: (message: string) => void;
  onCountChange: (count: number) => void;
  onMerged: () => void;
}

const RECENT_MS = 7 * 24 * 60 * 60 * 1000;

const FIELD_LABELS: Record<string, string> = {
  phone: 'Teléfono',
  email: 'Correo',
  birthday: 'Fecha de nacimiento',
  gender: 'Género',
  profileImage: 'Foto',
  group: 'Grupo',
  skills: 'Habilidades',
  referredBy: 'Quién lo refirió',
  dataConsent: 'Consentimiento de datos',
  placa: 'Placa',
  password: 'Contraseña',
};

const outlineBtn =
  'inline-flex h-10 items-center justify-center gap-2 rounded-full border border-sand-300 px-4 text-sm font-semibold text-cocoa-700 transition-colors hover:border-cocoa-400 disabled:opacity-50 dark:border-white/15 dark:text-white/85 dark:hover:border-white/40';

const cardCls = 'rounded-2xl border border-sand-200 bg-white p-4 dark:border-white/10 dark:bg-ink-800/60 sm:p-5';

// Fecha guardada a medianoche UTC: se muestra tal cual, sin correr el día
const formatBirthday = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
    : 'Sin dato';

const formatDate = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
    : 'Sin dato';

const Avatar: React.FC<{ person: Pick<DuplicatePerson, 'fullName' | 'profileImage'> }> = ({ person }) =>
  person.profileImage ? (
    <img src={person.profileImage} alt="" className="h-11 w-11 flex-shrink-0 rounded-full object-cover" />
  ) : (
    <span className="bg-fire flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full font-display text-lg font-semibold text-white">
      {person.fullName.charAt(0).toUpperCase()}
    </span>
  );

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between gap-3 text-sm">
    <dt className="flex-shrink-0 text-cocoa-500 dark:text-white/55">{label}</dt>
    <dd className="m-0 min-w-0 truncate text-right font-medium text-cocoa-900 dark:text-white/90">{value}</dd>
  </div>
);

const PersonDetails: React.FC<{ person: DuplicatePerson }> = ({ person }) => (
  <>
    <div className="flex items-center gap-3">
      <Avatar person={person} />
      <div className="min-w-0">
        <p className="m-0 truncate font-semibold text-cocoa-900 dark:text-white">{person.fullName}</p>
        <p className="m-0 font-mono text-xs text-brand-wine dark:text-brand-amber">{person.placa || 'Sin placa'}</p>
      </div>
    </div>
    <dl className="m-0 mt-3 space-y-1.5">
      <Row label="Correo" value={person.email || 'Sin dato'} />
      <Row label="Teléfono" value={person.phone || 'Sin dato'} />
      <Row label="Nacimiento" value={formatBirthday(person.birthday)} />
      <Row label="Creada" value={formatDate(person.createdAt)} />
      <Row label="Puntos" value={person.points} />
      <Row label="Asistencias" value={person.attendances} />
      <Row label="Consentimiento" value={person.consentStatus === 'current' ? 'Vigente' : 'Sin aceptar'} />
    </dl>
  </>
);

const Stat: React.FC<{ value: number; label: string }> = ({ value, label }) =>
  value > 0 ? (
    <li className="rounded-xl bg-sand-50 px-3 py-2 dark:bg-white/[0.05]">
      <span className="block font-display text-xl font-semibold text-cocoa-900 dark:text-white">{value}</span>
      <span className="block text-xs text-cocoa-500 dark:text-white/55">{label}</span>
    </li>
  ) : null;

/** Vista de fusión de un par: elegir qué cuenta queda y revisar el resultado. */
const MergeView: React.FC<{
  pair: DuplicatePair;
  onBack: () => void;
  onDone: () => void;
  onShowSuccess: (message: string) => void;
  onShowError: (message: string) => void;
}> = ({ pair, onBack, onDone, onShowSuccess, onShowError }) => {
  const [targetId, setTargetId] = useState(pair.suggestedTargetId);
  const [preview, setPreview] = useState<MergeSummary | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [merging, setMerging] = useState(false);

  const target = targetId === pair.a.id ? pair.a : pair.b;
  const source = targetId === pair.a.id ? pair.b : pair.a;

  useEffect(() => {
    let cancelled = false;
    setPreview(null);
    setPreviewError(null);
    previewYoungMerge(source.id, target.id)
      .then(data => !cancelled && setPreview(data))
      .catch(error => !cancelled && setPreviewError(error instanceof Error ? error.message : 'No se pudo calcular la fusión'));
    return () => {
      cancelled = true;
    };
  }, [source.id, target.id]);

  const handleMerge = async () => {
    setMerging(true);
    try {
      await mergeYoungAccounts(source.id, target.id);
      onShowSuccess(`Cuentas fusionadas. Queda ${target.placa || target.fullName}`);
      onDone();
    } catch (error) {
      onShowError(error instanceof Error ? error.message : 'No se pudo fusionar');
      setMerging(false);
      setConfirming(false);
    }
  };

  const conflicts = preview?.conflicts;
  const conflictLines = conflicts
    ? [
        conflicts.attendances && `${conflicts.attendances} asistencia(s) del mismo día`,
        conflicts.birthdays && `${conflicts.birthdays} bono(s) de cumpleaños del mismo año`,
        conflicts.formResponses && `${conflicts.formResponses} respuesta(s) al mismo formulario`,
        conflicts.welcomeBonus && `${conflicts.welcomeBonus} bono(s) de bienvenida repetido(s)`,
        conflicts.violetFlame && `${conflicts.violetFlame} Llama(s) Violeta de la misma temporada`,
        conflicts.selfReferrals && `${conflicts.selfReferrals} punto(s) de referido entre las dos cuentas`,
        conflicts.streaks && `${conflicts.streaks} racha(s) de la misma temporada (queda la mejor)`,
      ].filter(Boolean)
    : [];

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-brand-deep hover:underline dark:text-brand-amber">
        Volver a la lista
      </button>

      <div>
        <h3 className="m-0 font-display text-xl font-semibold uppercase text-cocoa-900 dark:text-white">¿Qué cuenta se conserva?</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Cuenta que se conserva">
          {[pair.a, pair.b].map(person => {
            const selected = person.id === targetId;
            return (
              <button
                key={person.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTargetId(person.id)}
                className={`rounded-2xl border-[1.5px] bg-white p-4 text-left transition-colors dark:bg-ink-800/60 ${
                  selected ? 'border-emerald-500' : 'border-sand-200 hover:border-cocoa-300 dark:border-white/10 dark:hover:border-white/25'
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${selected ? 'text-emerald-600 dark:text-emerald-300' : 'text-cocoa-400 dark:text-white/45'}`}>
                    {selected ? 'Se conserva' : 'Se da de baja'}
                  </span>
                  {person.id === pair.suggestedTargetId && (
                    <span className="rounded-full bg-sand-100 px-2 py-0.5 text-[11px] font-semibold text-cocoa-600 dark:bg-white/10 dark:text-white/70">
                      Sugerida
                    </span>
                  )}
                </div>
                <PersonDetails person={person} />
              </button>
            );
          })}
        </div>
      </div>

      {previewError && (
        <p className="m-0 rounded-2xl bg-brand-red/10 px-4 py-3 text-sm font-medium text-brand-red">{previewError}</p>
      )}

      {!preview && !previewError && (
        <p className="m-0 text-sm text-cocoa-500 dark:text-white/60">Calculando el resultado…</p>
      )}

      {preview && (
        <section className={cardCls}>
          <h3 className="m-0 font-display text-xl font-semibold uppercase text-cocoa-900 dark:text-white">Resultado</h3>
          <p className="m-0 mt-1 text-sm text-cocoa-600 dark:text-white/70">
            Queda <strong className="text-cocoa-900 dark:text-white">{preview.target.fullName}</strong> con la placa{' '}
            <span className="font-mono">{preview.resultingPlaca || 'sin asignar'}</span> y{' '}
            <strong className="text-cocoa-900 dark:text-white">{preview.resultingPoints} puntos</strong>.
          </p>

          <ul className="m-0 mt-3 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-4">
            <Stat value={preview.moves.points} label="puntos trasladados" />
            <Stat value={preview.moves.attendances} label="asistencias" />
            <Stat value={preview.moves.streaks} label="rachas" />
            <Stat value={preview.moves.formResponses} label="respuestas" />
            <Stat value={preview.moves.referrals} label="referidos" />
            <Stat value={preview.moves.consents} label="consentimientos" />
            <Stat value={preview.moves.snapshots} label="semanas de ranking" />
          </ul>

          {preview.filledFields.length > 0 && (
            <p className="mb-0 mt-3 text-sm text-cocoa-600 dark:text-white/70">
              <strong className="text-cocoa-900 dark:text-white">Datos que se completan:</strong>{' '}
              {preview.filledFields.map(field => FIELD_LABELS[field] ?? field).join(', ')}.
            </p>
          )}

          {conflictLines.length > 0 && (
            <div className="mt-3 rounded-xl bg-brand-amber/15 px-4 py-3 text-sm text-cocoa-800 dark:text-white/85">
              <p className="m-0 font-semibold">Se descarta lo repetido de la cuenta que se da de baja:</p>
              <ul className="m-0 mt-1 list-disc pl-5">
                {conflictLines.map(line => (
                  <li key={String(line)}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="mb-0 mt-3 text-sm text-cocoa-600 dark:text-white/70">
            La cuenta {source.placa ? <span className="font-mono">{source.placa}</span> : 'sin placa'} queda dada de baja y ya no podrá iniciar sesión.
          </p>

          <div className="mt-4 flex justify-end">
            <button type="button" onClick={() => setConfirming(true)} className="btn-fire h-11 px-6 text-sm">
              Fusionar cuentas
            </button>
          </div>
        </section>
      )}

      <ConfirmDangerModal
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={handleMerge}
        title="Fusionar cuentas"
        question="¿Fusionar estas dos cuentas en una sola?"
        subject={`${source.fullName} → ${target.fullName}`}
        warnings={[
          'El historial pasa a la cuenta que se conserva.',
          source.placa ? `La placa ${source.placa} dejará de funcionar: avísale a la persona.` : 'La otra cuenta queda dada de baja.',
        ]}
        confirmLabel="Fusionar"
        loading={merging}
      />
    </div>
  );
};

/** Sección del admin: posibles duplicados, descarte y fusión. */
const DuplicatesManager: React.FC<DuplicatesManagerProps> = ({ onShowSuccess, onShowError, onCountChange, onMerged }) => {
  const [pairs, setPairs] = useState<DuplicatePair[] | null>(null);
  const [selected, setSelected] = useState<DuplicatePair | null>(null);
  const [dismissing, setDismissing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchDuplicatePairs();
      setPairs(data);
      onCountChange(data.length);
    } catch (error) {
      onShowError(error instanceof Error ? error.message : 'No se pudieron cargar los duplicados');
      setPairs([]);
    }
  }, [onCountChange, onShowError]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDismiss = async (pair: DuplicatePair) => {
    setDismissing(pair.key);
    try {
      await dismissDuplicatePair(pair.a.id, pair.b.id);
      onShowSuccess('Marcados como personas distintas');
      await load();
    } catch (error) {
      onShowError(error instanceof Error ? error.message : 'No se pudo descartar');
    } finally {
      setDismissing(null);
    }
  };

  if (!pairs) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (selected) {
    return (
      <MergeView
        pair={selected}
        onBack={() => setSelected(null)}
        onShowSuccess={onShowSuccess}
        onShowError={onShowError}
        onDone={() => {
          setSelected(null);
          onMerged();
          load();
        }}
      />
    );
  }

  if (pairs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-sand-300 px-6 py-12 text-center dark:border-white/15">
        <svg className="mx-auto h-10 w-10 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 12.5l2.5 2.5 4.5-5" />
        </svg>
        <p className="mb-0 mt-3 font-semibold text-cocoa-900 dark:text-white">No hay posibles duplicados</p>
        <p className="m-0 mt-1 text-sm text-cocoa-500 dark:text-white/60">Cuando alguien se registre y se parezca a otro joven, aparecerá aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="m-0 text-sm text-cocoa-600 dark:text-white/70">
        Son coincidencias aproximadas: revísalas antes de fusionar. Las más fuertes y recientes aparecen primero.
      </p>
      {pairs.map(pair => {
        const isRecent = !!pair.newestAt && Date.now() - new Date(pair.newestAt).getTime() < RECENT_MS;
        return (
          <article key={pair.key} className={cardCls}>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  pair.level === 'high'
                    ? 'bg-brand-red/10 text-brand-red dark:bg-brand-red/20 dark:text-red-300'
                    : 'bg-brand-amber/20 text-brand-deep dark:text-brand-amber'
                }`}
              >
                {pair.level === 'high' ? 'Coincidencia fuerte' : 'Por revisar'}
              </span>
              {isRecent && (
                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-400/15 dark:text-sky-300">
                  Registro reciente
                </span>
              )}
              <span className="text-sm text-cocoa-600 dark:text-white/70">{pair.reasons.join(' · ')}</span>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {[pair.a, pair.b].map(person => (
                <div key={person.id} className="rounded-xl bg-sand-50 p-3 dark:bg-white/[0.04]">
                  <PersonDetails person={person} />
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" className={outlineBtn} disabled={dismissing === pair.key} onClick={() => handleDismiss(pair)}>
                {dismissing === pair.key ? 'Guardando…' : 'Son personas distintas'}
              </button>
              <button type="button" className="btn-fire h-10 px-5 text-sm" onClick={() => setSelected(pair)}>
                Revisar y fusionar
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default DuplicatesManager;
