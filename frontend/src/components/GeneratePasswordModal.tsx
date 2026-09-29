import React, { useState } from 'react';
import { generateNewPassword } from '../services/api';
import BrandModalHeader from './ui/BrandModalHeader';

interface GeneratePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPassword: string) => void;
  youngId: string;
  youngName: string;
}

const GeneratePasswordModal: React.FC<GeneratePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  youngId,
  youngName,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Función para generar una contraseña aleatoria
  const generateRandomPassword = () => {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = 12;
    let result = '';

    // Asegurar al menos una mayúscula, una minúscula y un número
    result += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    result += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    result += '0123456789'[Math.floor(Math.random() * 10)];

    // Completar el resto de la contraseña
    for (let i = 3; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }

    // Mezclar los caracteres
    return result
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  };

  const handleGenerateRandom = () => {
    const randomPassword = generateRandomPassword();
    setNewPassword(randomPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword.trim()) {
      setError('La nueva contraseña es requerida');
      return;
    }

    // Validar formato de contraseña
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&._\-+=]{8,50}$/;
    if (!passwordRegex.test(newPassword)) {
      setError(
        'La contraseña debe tener entre 8-50 caracteres, incluir al menos una mayúscula, una minúscula y un número. Caracteres especiales permitidos: @$!%*?&._-+='
      );
      return;
    }

    setIsLoading(true);

    try {
      await generateNewPassword(youngId, newPassword);
      onSuccess(newPassword);
      onClose();
      // Limpiar el formulario
      setNewPassword('');
      setError(null);
    } catch (error: any) {
      setError(error.message || 'Error al generar nueva contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setNewPassword('');
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0C0609]/75 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-[0_50px_100px_-40px_rgba(0,0,0,0.8)] dark:bg-ink-900"
        role="dialog"
        aria-modal="true"
        aria-label="Generar nueva contraseña"
      >
        <BrandModalHeader
          title="Nueva contraseña"
          subtitle={youngName}
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="7.5" cy="15.5" r="5.5" />
              <path d="M21 2l-9.6 9.6M15.5 7.5l3 3L22 7l-3-3" />
            </svg>
          }
          onClose={isLoading ? undefined : handleClose}
          compact
        />

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <p className="text-sm text-cocoa-600 dark:text-white/70 mb-4">
              Generando nueva contraseña para: <strong>{youngName}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-[13px] font-semibold text-cocoa-600 dark:text-white/75 mb-1.5"
                >
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="newPassword"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="field-brand h-12 !pr-20 text-[15px]"
                    placeholder="Ingresa la nueva contraseña"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-11 top-1/2 -translate-y-1/2 text-cocoa-400 hover:text-cocoa-600 dark:text-white/50"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateRandom}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-deep hover:text-brand-wine dark:text-brand-amber"
                    disabled={isLoading}
                    title="Generar contraseña aleatoria"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                </div>
                <p className="text-xs leading-relaxed text-cocoa-400 dark:text-white/50 mt-1.5">
                  Debe tener entre 8-50 caracteres, incluir al menos una
                  mayúscula, una minúscula y un número. Caracteres especiales
                  permitidos: @$!%*?&._-+=
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateRandom}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-[#F4B58C] bg-cream text-[13px] font-semibold text-brand-deep hover:bg-sand-50 dark:bg-white/5 dark:text-brand-amber"
                disabled={isLoading}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                </svg>
                Generar contraseña aleatoria
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="h-12 flex-1 rounded-full border-[1.5px] border-sand-300 bg-white text-sm font-semibold text-cocoa-600 hover:border-cocoa-400 disabled:opacity-50 dark:border-white/15 dark:bg-transparent dark:text-white/80"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !newPassword.trim()}
              className="btn-fire h-12 flex-1 text-sm disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generando...
                </>
              ) : (
                'Generar contraseña'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GeneratePasswordModal;
