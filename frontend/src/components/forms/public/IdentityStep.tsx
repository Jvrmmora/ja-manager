import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  ContactField,
  ContactValues,
  PlacaIdentity,
  PublicForm,
  PublicFormMe,
} from '../../../types/forms';
import ContactInputs, { CONTACT_LABELS, ErrorText, inputCls } from './ContactInputs';
import PrivacyPolicyModal from '../../privacy/PrivacyPolicyModal';
import { UserPlusIcon } from './FormIcons';

export type IdentityMode = 'session' | 'placa' | 'guest';

const PLACA_REGEX = /^@MOD[A-Z]{2,4}\d{3}$/;

interface IdentityStepProps {
  form: PublicForm;
  me: PublicFormMe | null;
  mode: IdentityMode;
  onModeChange: (mode: IdentityMode) => void;
  placaIdentity: PlacaIdentity | null;
  onIdentify: (placa: string) => Promise<void>;
  onClearPlaca: () => void;
  contact: ContactValues;
  contactErrors: Partial<Record<ContactField, string>>;
  onContactChange: (field: ContactField, value: string) => void;
  acceptPolicy: boolean;
  onAcceptPolicy: (value: boolean) => void;
  saveToProfile: boolean;
  onSaveToProfile: (value: boolean) => void;
  onLogout: () => void;
  loginHref: string;
  policyError?: string | undefined;
}

const Check = () => (
  <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
    <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Lock = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
  </svg>
);

const PlacaChip: React.FC<{ placa: string }> = ({ placa }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1 font-mono text-[13px] font-semibold text-brand-wine dark:bg-white/10 dark:text-brand-amber">
    <Lock /> {placa}
  </span>
);

const formatValue = (field: ContactField, value: unknown) => {
  if (field === 'gender') return value === 'masculino' ? 'Masculino' : value === 'femenino' ? 'Femenino' : '';
  if (field === 'group') return `Grupo ${value}`;
  return String(value);
};

/** Tarjeta "Respondiendo como…" para sesión o placa reconocida. */
const IdentityBadge: React.FC<{
  name: string;
  placa: string | null;
  image?: string | null;
  rows: { field: ContactField; value: string }[];
  action: React.ReactNode;
}> = ({ name, placa, image, rows, action }) => (
  <div className="rounded-[22px] border-[1.5px] border-emerald-500/30 bg-emerald-50/60 p-4 dark:border-emerald-400/25 dark:bg-emerald-400/[0.06]">
    <div className="flex items-center gap-3">
      {image ? (
        <img src={image} alt="" className="h-12 w-12 rounded-full object-cover" />
      ) : (
        <span className="bg-fire flex h-12 w-12 items-center justify-center rounded-full font-display text-xl font-semibold text-white">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="m-0 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
          Respondiendo como
        </p>
        <p className="m-0 truncate text-[17px] font-semibold text-cocoa-900 dark:text-white">{name}</p>
      </div>
      {placa && <PlacaChip placa={placa} />}
    </div>
    {rows.length > 0 && (
      <ul className="m-0 mt-3 grid list-none gap-1.5 p-0 sm:grid-cols-2">
        {rows.map(row => (
          <li key={row.field} className="flex items-center gap-2 text-sm text-cocoa-700 dark:text-white/80">
            <Check />
            <span className="text-cocoa-500 dark:text-white/55">{CONTACT_LABELS[row.field]}:</span>
            <span className="truncate font-medium">{row.value}</span>
          </li>
        ))}
      </ul>
    )}
    <div className="mt-3 text-sm">{action}</div>
  </div>
);

/**
 * Paso "¿Quién eres?". Con sesión no pide nada (salvo lo que falte en el
 * perfil); sin sesión ofrece placa (datos enmascarados) o invitado.
 */
const IdentityStep: React.FC<IdentityStepProps> = props => {
  const { form, me, mode, placaIdentity, contact, contactErrors, onContactChange } = props;
  const [placaInput, setPlacaInput] = useState('');
  const [placaError, setPlacaError] = useState<string | null>(null);
  const [checking, setCheckingPlaca] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  const visible = form.contactFields.map(c => c.field);
  const required = new Set(form.contactFields.filter(c => c.mode === 'required').map(c => c.field));
  const linkCls = 'font-semibold text-brand-deep underline-offset-2 hover:underline dark:text-brand-amber';

  const missingInputs = (missing: ContactField[]) =>
    missing.length > 0 && (
      <div className="mt-4">
        <p className="mb-3 mt-0 text-sm font-medium text-cocoa-600 dark:text-white/70">
          Solo nos falta {missing.length === 1 ? 'este dato' : 'estos datos'}:
        </p>
        <ContactInputs
          fields={missing}
          required={required}
          values={contact}
          errors={contactErrors}
          onChange={onContactChange}
        />
      </div>
    );

  // ── Con sesión ───────────────────────────────────────────────────────────
  if (mode === 'session' && me) {
    const rows = visible
      .filter(field => me.contact[field] !== null && me.contact[field] !== undefined && field !== 'fullName')
      .map(field => ({ field, value: formatValue(field, me.contact[field]) }));
    return (
      <>
        <IdentityBadge
          name={me.fullName}
          placa={me.placa}
          image={me.profileImage}
          rows={rows}
          action={
            <span className="text-cocoa-500 dark:text-white/60">
              ¿No eres tú?{' '}
              <button type="button" onClick={props.onLogout} className={linkCls}>
                Cerrar sesión
              </button>
            </span>
          }
        />
        {missingInputs(me.missing)}
        {me.missing.length > 0 && (
          <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm text-cocoa-600 dark:text-white/75">
            <input
              type="checkbox"
              checked={props.saveToProfile}
              onChange={e => props.onSaveToProfile(e.target.checked)}
              className="h-[18px] w-[18px] rounded accent-brand-ember"
            />
            Guardar en mi perfil para la próxima vez
          </label>
        )}
      </>
    );
  }

  // ── Placa reconocida ─────────────────────────────────────────────────────
  if (mode === 'placa' && placaIdentity) {
    const rows: { field: ContactField; value: string }[] = [];
    if (placaIdentity.masked.phone) rows.push({ field: 'phone', value: placaIdentity.masked.phone });
    if (placaIdentity.masked.email) rows.push({ field: 'email', value: placaIdentity.masked.email });
    return (
      <>
        <IdentityBadge
          name={placaIdentity.shortName}
          placa={placaIdentity.placa}
          image={placaIdentity.profileImage}
          rows={rows}
          action={
            <span className="text-cocoa-500 dark:text-white/60">
              Usaremos los datos guardados en tu cuenta.{' '}
              <button type="button" onClick={props.onClearPlaca} className={linkCls}>
                Cambiar placa
              </button>
            </span>
          }
        />
        {placaIdentity.alreadyResponded && (
          <p className="mb-0 mt-3 rounded-2xl bg-brand-amber/15 px-4 py-3 text-sm text-cocoa-700 dark:text-white/85">
            Ya tenemos una respuesta tuya. Si envías de nuevo, la actualizamos.
          </p>
        )}
        {missingInputs(placaIdentity.missing)}
      </>
    );
  }

  // ── Sin sesión: elegir cómo responder ───────────────────────────────────
  const submitPlaca = async () => {
    const placa = placaInput.trim().toUpperCase();
    if (!PLACA_REGEX.test(placa)) {
      setPlacaError('Formato inválido. Ej: @MODPRUE001');
      return;
    }
    setPlacaError(null);
    setCheckingPlaca(true);
    try {
      await props.onIdentify(placa);
    } catch (error) {
      setPlacaError(error instanceof Error ? error.message : 'No pudimos verificar la placa');
    } finally {
      setCheckingPlaca(false);
    }
  };

  const tabs: { id: IdentityMode; label: string; hint: string }[] = [
    { id: 'placa', label: 'Tengo placa', hint: 'Más rápido' },
    ...(form.settings.allowGuests ? [{ id: 'guest' as const, label: 'Soy invitado', hint: 'Sin cuenta' }] : []),
  ];
  const activeTab = mode === 'guest' && form.settings.allowGuests ? 'guest' : 'placa';

  return (
    <>
      {tabs.length > 1 && (
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-sand-100 p-1.5 dark:bg-white/[0.06]" role="tablist">
          {tabs.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => props.onModeChange(tab.id)}
                className={`rounded-xl px-3 py-2.5 text-center transition-all ${
                  active
                    ? 'bg-white text-cocoa-900 shadow-sm dark:bg-ink-800 dark:text-white'
                    : 'text-cocoa-500 hover:text-cocoa-800 dark:text-white/55 dark:hover:text-white'
                }`}
              >
                <span className="block text-[15px] font-semibold">{tab.label}</span>
                <span className="block text-xs opacity-75">{tab.hint}</span>
              </button>
            );
          })}
        </div>
      )}

      {activeTab === 'placa' ? (
        <div className="mt-4">
          <label htmlFor="placa" className="mb-1.5 block text-sm font-semibold text-cocoa-700 dark:text-white/85">
            Tu placa
          </label>
          <div className="flex gap-2">
            <input
              id="placa"
              value={placaInput}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="@MODPRUE001"
              onChange={e => {
                setPlacaInput(e.target.value.toUpperCase());
                setPlacaError(null);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submitPlaca();
                }
              }}
              className={`${inputCls(placaError || undefined)} font-mono tracking-wide`}
            />
            <button
              type="button"
              onClick={submitPlaca}
              disabled={checking || !placaInput.trim()}
              className="btn-fire h-12 flex-shrink-0 px-5 text-[15px]"
            >
              {checking ? 'Buscando…' : 'Usar'}
            </button>
          </div>
          <ErrorText>{placaError || undefined}</ErrorText>
          <p className="mb-0 mt-3 text-sm text-cocoa-500 dark:text-white/60">
            Con tu placa llenamos tus datos por ti. ¿Prefieres entrar?{' '}
            <Link to={props.loginHref} className={linkCls}>
              Inicia sesión
            </Link>
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <ContactInputs
            fields={visible}
            required={required}
            values={contact}
            errors={contactErrors}
            onChange={onContactChange}
          />
          <label className="mt-4 flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={props.acceptPolicy}
              onChange={e => props.onAcceptPolicy(e.target.checked)}
              className="mt-0.5 h-[18px] w-[18px] flex-shrink-0 rounded accent-brand-ember"
            />
            <span className="text-sm leading-relaxed text-cocoa-600 dark:text-white/75">
              Acepto la{' '}
              <button type="button" onClick={() => setShowPolicy(true)} className={`${linkCls} underline`}>
                Política de Privacidad
              </button>{' '}
              y autorizo el tratamiento de mis datos para este evento.
            </span>
          </label>
          <ErrorText>{props.policyError}</ErrorText>
          {form.settings.showRegisterCta && (
            <p className="mb-0 mt-4 flex items-start gap-2.5 rounded-2xl border border-dashed border-sand-300 px-4 py-3 text-sm text-cocoa-600 dark:border-white/15 dark:text-white/70">
              <UserPlusIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-deep dark:text-brand-amber" />
              <span>
                <strong>¿Vienes seguido?</strong> Crea tu cuenta y la próxima vez solo escribes tu placa.{' '}
                <Link to="/register" className={linkCls}>
                  Registrarme
                </Link>
              </span>
            </p>
          )}
          <PrivacyPolicyModal open={showPolicy} onClose={() => setShowPolicy(false)} />
        </div>
      )}
    </>
  );
};

export default IdentityStep;
