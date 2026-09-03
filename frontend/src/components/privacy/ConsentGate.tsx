import { useCallback, useEffect, useState } from 'react';
import {
  fetchMyConsent,
  acceptConsent,
  declineConsent,
  type ConsentStatus,
} from '../../services/consentService';
import { authService } from '../../services/auth';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import LoadingSpinner from '../LoadingSpinner';
import logo from '../../assets/logos/logo.png';

/**
 * Compuerta de consentimiento (Opción B).
 *
 * Se monta cuando hay sesión activa. Consulta el estado real en el backend y,
 * si el usuario no ha aceptado la versión vigente de la política, muestra una
 * pantalla bloqueante hasta que acepte. Si rechaza, cierra la sesión.
 */
export default function ConsentGate() {
  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [checked, setChecked] = useState(true); // ya montado => verificando
  const [accepted, setAccepted] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianRel, setGuardianRel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declineInfo, setDeclineInfo] = useState<string | null>(null);
  const [showPolicy, setShowPolicy] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await fetchMyConsent();
      setStatus(s);
    } catch {
      // Si falla la verificación, no bloqueamos al usuario.
      setStatus(null);
    } finally {
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!checked) return null;
  if (!status || !status.requiresConsent) return null;

  const handleAccept = async () => {
    setError(null);
    if (!accepted) {
      setError('Debes marcar la casilla para continuar.');
      return;
    }
    if (isMinor && !guardianName.trim()) {
      setError('Ingresa el nombre del padre, madre o representante legal.');
      return;
    }
    setSubmitting(true);
    try {
      await acceptConsent({
        policyVersion: status.currentVersion,
        guardianFullName: isMinor ? guardianName.trim() : undefined,
        guardianRelationship: isMinor ? guardianRel.trim() : undefined,
      });
      // Refrescar el perfil en localStorage para limpiar el flag.
      try {
        const profile = await authService.getProfile();
        authService.updateUserInfo(profile.data);
      } catch {
        /* no crítico */
      }
      window.location.reload();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo registrar el consentimiento';
      setError(msg);
      if (/menor de edad/i.test(msg)) setIsMinor(true);
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setSubmitting(true);
    try {
      const { contactEmail } = await declineConsent();
      setDeclineInfo(contactEmail || status.contactEmail);
    } catch {
      setDeclineInfo(status.contactEmail);
    } finally {
      setSubmitting(false);
    }
  };

  const finishDecline = async () => {
    await authService.logout();
    window.location.href = '/login';
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <img src={logo} alt="" className="h-9 w-9 object-contain" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Protección de tus datos personales
            </h2>
          </div>

          {declineInfo ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Registramos que no autorizas el tratamiento de tus datos
                personales. Sin esa autorización no puedes usar la plataforma.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Si quieres que eliminemos tu información, escríbenos a{' '}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {declineInfo}
                </span>
                . Atenderemos tu solicitud conforme a la Ley 1581 de 2012.
              </p>
              <button
                onClick={finishDecline}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"
              >
                Entendido, cerrar sesión
              </button>
              <button
                onClick={() => setDeclineInfo(null)}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Volver
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Para seguir usando la plataforma necesitamos tu autorización
                para tratar tus datos personales (nombre, fecha de nacimiento,
                contacto, género y rol en la iglesia), conforme a la{' '}
                <button
                  type="button"
                  onClick={() => setShowPolicy(true)}
                  className="text-blue-600 dark:text-blue-400 underline font-medium"
                >
                  Política de Privacidad
                </button>{' '}
                (versión {status.currentVersion}).
              </p>

              <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3 text-xs text-gray-500 dark:text-gray-400">
                El suministro de datos sensibles (rol o liderazgo en la iglesia)
                es facultativo. Puedes conocer, actualizar, rectificar o suprimir
                tus datos y revocar esta autorización escribiendo a{' '}
                {status.contactEmail}.
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={e => setAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">
                  He leído y acepto la Política de Privacidad y{' '}
                  <strong>autorizo el tratamiento de mis datos personales</strong>.
                </span>
              </label>

              <div>
                <button
                  type="button"
                  onClick={() => setIsMinor(v => !v)}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                >
                  {isMinor
                    ? '− El titular es mayor de edad'
                    : '+ El titular es menor de edad'}
                </button>
                {isMinor && (
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      value={guardianName}
                      onChange={e => setGuardianName(e.target.value)}
                      placeholder="Nombre del padre, madre o representante legal"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={guardianRel}
                      onChange={e => setGuardianRel(e.target.value)}
                      placeholder="Parentesco (padre, madre, representante legal)"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-400">
                      Como representante legal, autorizo el tratamiento de los
                      datos del menor.
                    </p>
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={handleAccept}
                  disabled={submitting}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2"
                >
                  {submitting && <LoadingSpinner size="sm" className="text-white" />}
                  Aceptar y continuar
                </button>
                <button
                  onClick={handleDecline}
                  disabled={submitting}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
                >
                  No acepto
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <PrivacyPolicyModal open={showPolicy} onClose={() => setShowPolicy(false)} />
    </div>
  );
}
