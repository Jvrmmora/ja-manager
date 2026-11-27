import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthShell from '../components/auth/AuthShell';
import OtpInput from '../components/auth/OtpInput';
import PasswordField from '../components/auth/PasswordField';
import PasswordRequirements from '../components/auth/PasswordRequirements';
import DynamicCredentialInput from '../components/DynamicCredentialInput';
import { formatClock, useCountdown } from '../hooks/useCountdown';
import { removeAuthToken } from '../services/httpClient';
import {
  RecoveryError,
  requestResetCode,
  resetPasswordWithToken,
  verifyResetCode,
} from '../services/passwordRecovery';
import { isPasswordValid } from '../utils/passwordPolicy';

type Step = 'identify' | 'code' | 'password' | 'done';

const PLACA_REGEX = /^@MOD[A-Z]{2,4}\d{3}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isIdentifierValid = (value: string): boolean => {
  const v = value.trim();
  return EMAIL_REGEX.test(v) || PLACA_REGEX.test(v.toUpperCase());
};

const CODE_LENGTH = 6;

const STEP_LABEL: Record<Exclude<Step, 'done'>, string> = {
  identify: 'Paso 1 de 3 · Identifícate',
  code: 'Paso 2 de 3 · Verifica el código',
  password: 'Paso 3 de 3 · Nueva contraseña',
};
const STEP_INDEX: Record<Exclude<Step, 'done'>, number> = {
  identify: 1,
  code: 2,
  password: 3,
};

const Spinner: React.FC = () => (
  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const ErrorBox: React.FC<{ id?: string; children: React.ReactNode }> = ({
  id,
  children,
}) => (
  <div
    id={id}
    role="alert"
    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
  >
    {children}
  </div>
);

const formClass =
  'flex flex-col gap-5 rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_20px_40px_-24px_rgba(78,15,58,0.35)] sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none dark:border-white/10 dark:bg-ink-900 lg:dark:bg-transparent';
const titleClass =
  'm-0 font-display text-[30px] lg:text-[44px] font-semibold uppercase leading-[1.05] text-cocoa-900 dark:text-white';
const subtitleClass =
  'm-0 text-sm lg:text-base leading-relaxed text-cocoa-500 dark:text-white/65';
const linkButtonClass =
  'text-sm font-semibold text-brand-deep hover:text-brand-wine disabled:cursor-not-allowed disabled:text-cocoa-400 dark:text-brand-amber dark:disabled:text-white/40 transition-colors';

/**
 * Recuperación de contraseña por correo en 4 pantallas: identificarse, escribir
 * el código de 6 dígitos, elegir la contraseña nueva (con confirmación) y
 * confirmación final. Nada sensible (código, token, contraseñas) se guarda en
 * storage: vive solo en el estado de esta pantalla.
 */
const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = (location.state as { identifier?: string } | null)?.identifier;

  const [step, setStep] = useState<Step>('identify');
  const [identifier, setIdentifier] = useState(prefill ?? '');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [codeDead, setCodeDead] = useState(false); // vencido o sin intentos
  const [codeWrong, setCodeWrong] = useState(false);

  const [codeExpiresAt, setCodeExpiresAt] = useState<number | null>(null);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null);

  const codeSeconds = useCountdown(codeExpiresAt);
  const resendSeconds = useCountdown(resendAt);
  const tokenSeconds = useCountdown(tokenExpiresAt);
  const codeExpired =
    step === 'code' && codeExpiresAt !== null && codeSeconds === 0;

  const otpRef = useRef<HTMLInputElement | null>(null);
  const newPasswordRef = useRef<HTMLInputElement | null>(null);

  // Foco en el primer control de cada pantalla.
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      if (step === 'password') newPasswordRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [step]);

  // El código recupera el foco cada vez que termina una petición (verificar,
  // reenviar): mientras carga el campo está deshabilitado y no puede tenerlo.
  useEffect(() => {
    if (step !== 'code' || loading || codeDead || codeExpired) return;
    const id = window.requestAnimationFrame(() => otpRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [step, loading, codeDead, codeExpired]);

  const backToStart = useCallback((message: string) => {
    setStep('identify');
    setCode('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setTokenExpiresAt(null);
    setCodeExpiresAt(null);
    setCodeDead(false);
    setCodeWrong(false);
    setNotice('');
    setError(message);
  }, []);

  // El token del paso 3 vence a los 10 min: se avisa y se vuelve a empezar.
  useEffect(() => {
    if (step === 'password' && tokenExpiresAt !== null && tokenSeconds === 0) {
      backToStart('La verificación venció. Pide un código nuevo para continuar.');
    }
  }, [step, tokenExpiresAt, tokenSeconds, backToStart]);

  const describe = (e: unknown): string => {
    if (e instanceof RecoveryError) {
      if (e.code === 'RATE_LIMITED' && e.retryAfterMinutes) {
        return `${e.message}`;
      }
      return e.message;
    }
    return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
  };

  /* ------------------------------ Paso 1 y reenvío ----------------------------- */

  const requestCode = async (isResend: boolean) => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const data = await requestResetCode(identifier.trim());
      const now = Date.now();
      setCodeExpiresAt(now + data.expiresInMinutes * 60_000);
      setResendAt(now + data.resendAfterSeconds * 1000);
      setCode('');
      setCodeDead(false);
      setCodeWrong(false);
      if (isResend) {
        setNotice('Si la cuenta existe, te enviamos un código nuevo.');
      }
      setStep('code');
    } catch (e) {
      setError(describe(e));
    } finally {
      setLoading(false);
    }
  };

  const handleIdentify = (event: React.FormEvent) => {
    event.preventDefault();
    if (loading || !isIdentifierValid(identifier)) return;
    void requestCode(false);
  };

  /* ---------------------------------- Paso 2 ---------------------------------- */

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading || code.length !== CODE_LENGTH || codeExpired || codeDead) return;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const data = await verifyResetCode(identifier.trim(), code);
      setResetToken(data.resetToken);
      setTokenExpiresAt(Date.now() + data.expiresInSeconds * 1000);
      setCode('');
      setCodeWrong(false);
      setStep('password');
    } catch (e) {
      setError(describe(e));
      setCode('');
      if (e instanceof RecoveryError) {
        if (e.code === 'RESET_CODE_EXPIRED' || e.code === 'RESET_TOO_MANY_ATTEMPTS') {
          setCodeDead(true);
          setCodeWrong(false);
        } else if (e.code === 'RESET_CODE_INVALID') {
          setCodeWrong(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------- Paso 3 ---------------------------------- */

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsDiffer = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSave = isPasswordValid(newPassword) && passwordsMatch && !loading;

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    setLoading(true);
    setError('');
    try {
      await resetPasswordWithToken(resetToken, newPassword, confirmPassword);
      // Si quedó un token viejo en este dispositivo ya no sirve: se limpia.
      removeAuthToken();
      setNewPassword('');
      setConfirmPassword('');
      setResetToken('');
      setTokenExpiresAt(null);
      setStep('done');
    } catch (e) {
      if (e instanceof RecoveryError && e.code === 'RESET_TOKEN_INVALID') {
        backToStart(e.message);
      } else {
        setError(describe(e));
      }
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------- Render ---------------------------------- */

  const progress =
    step !== 'done' ? (
      <div className="flex flex-col gap-2.5">
        <div
          className="flex gap-1.5"
          role="img"
          aria-label={STEP_LABEL[step]}
        >
          {[1, 2, 3].map(n => (
            <div
              key={n}
              className={`h-[5px] flex-1 rounded-full transition-colors ${
                n <= STEP_INDEX[step]
                  ? 'bg-gradient-to-r from-brand-ember to-brand-red'
                  : 'bg-sand-200 dark:bg-white/15'
              }`}
            />
          ))}
        </div>
        <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-cocoa-500 dark:text-white/65">
          {STEP_LABEL[step]}
        </span>
      </div>
    ) : null;

  const submitContent = (label: string, busy: string) =>
    loading ? (
      <>
        <Spinner />
        {busy}
      </>
    ) : (
      label
    );

  return (
    <AuthShell
      kicker="Recupera tu acceso a"
      title="JA Manager"
      description="Te enviaremos un código a tu correo para confirmar que eres tú. En unos pasos tendrás una contraseña nueva y tu familia juvenil te estará esperando."
    >
      {step === 'identify' && (
        <form className={formClass} onSubmit={handleIdentify} noValidate>
          {progress}
          <div className="flex flex-col gap-1.5">
            <h2 className={titleClass}>¿Olvidaste tu contraseña?</h2>
            <p className={subtitleClass}>
              Escribe tu correo o tu placa. Si hay una cuenta con ese dato, te
              enviamos un código de 6 dígitos al correo registrado.
            </p>
          </div>

          {error && <ErrorBox>{error}</ErrorBox>}

          <DynamicCredentialInput
            value={identifier}
            onChange={value => {
              // El campo avisa también al montarse: solo cuenta si de verdad cambió.
              if (value === identifier) return;
              setIdentifier(value);
              if (error) setError('');
            }}
            defaultMode="auto"
          />

          <button
            type="submit"
            disabled={loading || !isIdentifierValid(identifier)}
            className="btn-fire h-14 w-full text-base disabled:cursor-not-allowed"
          >
            {submitContent('Enviar código', 'Enviando código...')}
          </button>

          <div className="flex items-start gap-3 rounded-2xl border border-sand-200 bg-sand-50 px-4 py-3.5 text-sm leading-relaxed text-cocoa-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/65">
            <svg
              className="mt-0.5 h-[18px] w-[18px] flex-none text-brand-deep dark:text-brand-amber"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>
              Por seguridad mostramos siempre el mismo mensaje, exista o no la
              cuenta. ¿Sin correo registrado? Pídele ayuda a un líder
              administrador.
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className={`${linkButtonClass} inline-flex items-center gap-1.5 self-center`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Volver a iniciar sesión
          </button>
        </form>
      )}

      {step === 'code' && (
        <form className={formClass} onSubmit={handleVerify} noValidate>
          {progress}
          <div className="flex flex-col gap-1.5">
            <h2 className={titleClass}>Revisa tu correo</h2>
            <p className={subtitleClass}>
              Si existe una cuenta con ese dato, te enviamos un código de 6
              dígitos. Si no lo ves, mira en spam o correo no deseado.
            </p>
          </div>

          {error && <ErrorBox>{error}</ErrorBox>}
          {notice && !error && (
            <div
              role="status"
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
            >
              {notice}
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <label
              htmlFor="reset-code"
              className="text-sm font-semibold text-cocoa-700 dark:text-white/85"
            >
              Código de verificación
            </label>
            <OtpInput
              id="reset-code"
              value={code}
              onChange={value => {
                setCode(value);
                if (codeWrong) setCodeWrong(false);
                if (error) setError('');
              }}
              disabled={loading || codeExpired || codeDead}
              hasError={codeWrong}
              describedBy="reset-code-hint"
              inputRef={otpRef}
            />
            <p
              id="reset-code-hint"
              className="m-0 min-h-[22px] text-sm text-cocoa-500 dark:text-white/65"
            >
              {codeExpired || codeDead ? (
                <span className="font-semibold text-red-700 dark:text-red-300">
                  {codeExpired
                    ? 'El código venció. Pide uno nuevo.'
                    : 'Este código ya no sirve. Pide uno nuevo.'}
                </span>
              ) : (
                <>
                  El código vence en{' '}
                  <strong className="tabular-nums text-cocoa-900 dark:text-white">
                    {formatClock(codeSeconds)}
                  </strong>
                </>
              )}
            </p>
          </div>

          <button
            type="submit"
            disabled={
              loading || code.length !== CODE_LENGTH || codeExpired || codeDead
            }
            className="btn-fire h-14 w-full text-base disabled:cursor-not-allowed"
          >
            {submitContent('Verificar código', 'Verificando...')}
          </button>

          <div className="flex flex-col items-center gap-1 text-sm text-cocoa-500 dark:text-white/65">
            <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
              ¿No te llegó?
              <button
                type="button"
                disabled={loading || resendSeconds > 0}
                onClick={() => void requestCode(true)}
                className={`${linkButtonClass} min-h-[44px]`}
              >
                {resendSeconds > 0 ? (
                  <>
                    Reenviar en{' '}
                    <span className="tabular-nums">{formatClock(resendSeconds)}</span>
                  </>
                ) : (
                  'Reenviar código'
                )}
              </button>
            </span>
            <button
              type="button"
              onClick={() => {
                setStep('identify');
                setError('');
                setNotice('');
                setCode('');
              }}
              className={`${linkButtonClass} min-h-[44px]`}
            >
              Usar otro correo o placa
            </button>
          </div>
        </form>
      )}

      {step === 'password' && (
        <form className={formClass} onSubmit={handleSave} noValidate>
          {progress}
          <div className="flex flex-col gap-1.5">
            <h2 className={titleClass}>Nueva contraseña</h2>
            <p className={subtitleClass}>
              Código verificado. Elige una contraseña que no uses en otros
              sitios.
            </p>
          </div>

          {error && <ErrorBox>{error}</ErrorBox>}

          <PasswordField
            id="new-password"
            label="Nueva contraseña"
            value={newPassword}
            onChange={value => {
              setNewPassword(value);
              if (error) setError('');
            }}
            placeholder="Mínimo 8 caracteres"
            describedBy="password-requirements"
            inputRef={newPasswordRef}
            disabled={loading}
          />

          <PasswordRequirements password={newPassword} id="password-requirements" />

          <div className="flex flex-col gap-2">
            <PasswordField
              id="confirm-password"
              label="Confirmar contraseña"
              value={confirmPassword}
              onChange={value => {
                setConfirmPassword(value);
                if (error) setError('');
              }}
              placeholder="Repite la contraseña"
              status={passwordsDiffer ? 'error' : passwordsMatch ? 'ok' : 'default'}
              describedBy="confirm-message"
              disabled={loading}
            />
            <p
              id="confirm-message"
              aria-live="polite"
              className={`m-0 min-h-[20px] text-sm font-semibold ${
                passwordsDiffer
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {passwordsDiffer
                ? 'Las contraseñas no coinciden'
                : passwordsMatch
                  ? 'Las contraseñas coinciden'
                  : ''}
            </p>
          </div>

          <button
            type="submit"
            disabled={!canSave}
            className="btn-fire h-14 w-full text-base disabled:cursor-not-allowed"
          >
            {submitContent('Guardar contraseña', 'Guardando...')}
          </button>
          <p className="m-0 text-center text-[13px] leading-relaxed text-cocoa-500 dark:text-white/65">
            Al guardar, cerraremos tu sesión en todos los dispositivos.
          </p>
        </form>
      )}

      {step === 'done' && (
        <div className={`${formClass} items-center text-center`}>
          <div
            className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-gradient-to-br from-brand-amber to-brand-red shadow-[0_18px_40px_-16px_rgba(220,51,64,0.7)]"
            aria-hidden="true"
          >
            <svg className="h-11 w-11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
          <div className="flex flex-col gap-2.5">
            <h2 className={titleClass} role="status">
              ¡Contraseña actualizada!
            </h2>
            <p className={subtitleClass}>
              Por seguridad cerramos tus sesiones abiertas. Inicia sesión con
              tu nueva contraseña. Te enviamos un correo de confirmación.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="btn-fire h-14 w-full text-base"
            autoFocus
          >
            Ir a iniciar sesión
          </button>
        </div>
      )}
    </AuthShell>
  );
};

export default ForgotPasswordPage;
