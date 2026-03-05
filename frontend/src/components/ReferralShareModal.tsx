import React, { useState } from 'react';
import { useToast } from '../hooks/useToast';

interface ReferralShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPlaca: string;
  referralPoints?: number;
}

const ReferralShareModal: React.FC<ReferralShareModalProps> = ({
  isOpen,
  onClose,
  userPlaca,
  referralPoints = 500, // Default si no viene de la API
}) => {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const showToast = toast?.showToast;

  const frontendUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://www.jovenesmodelia.com/';

  const referralLink = `${frontendUrl}/register?referredBy=${userPlaca}`;

  const invitationMessage = `¡Hola! Te invito a unirte a Modelia Youth. Usa mi código ${userPlaca} al registrarte y ambos ganamos ${referralPoints} puntos 🎁\n\n${referralLink}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      if (showToast) {
        showToast('Link copiado al portapapeles', 'success');
      }
      setTimeout(() => setCopied(false), 2000);
    } catch {
      if (showToast) {
        showToast('Error al copiar', 'error');
      }
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(invitationMessage);
      if (showToast) {
        showToast('Mensaje copiado al portapapeles', 'success');
      }
      setTimeout(() => setCopied(false), 2000);
    } catch {
      if (showToast) {
        showToast('Error al copiar', 'error');
      }
    }
  };

  const handleShareWhatsApp = () => {
    const encodedMessage = encodeURIComponent(invitationMessage);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShareInstagram = () => {
    // Instagram no permite compartir URLs directas, copiar mensaje
    handleCopyMessage();
    if (showToast) {
      showToast(
        'Mensaje copiado. Abre Instagram y pégalo en un mensaje directo',
        'info'
      );
    }
  };

  const handleShareSMS = () => {
    const encodedMessage = encodeURIComponent(invitationMessage);
    const smsUrl = `sms:?body=${encodedMessage}`;
    window.location.href = smsUrl;
  };

  const handleShareMore = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Únete a Modelia Youth',
          text: invitationMessage,
          url: referralLink,
        });
      } catch (error) {
        console.error('Error compartiendo:', error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Modal - Optimizado para móvil */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] rounded-t-3xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden md:bottom-auto md:left-1/2 md:transform md:-translate-x-1/2 md:rounded-2xl md:w-full md:max-w-lg md:top-1/2 md:-translate-y-1/2 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="overflow-y-auto max-h-[90vh]">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Invita amigos</h2>
              <p className="text-purple-100 text-sm mt-1">
                Y gana recompensas juntos
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Contenido */}
          <div className="p-6 space-y-6">
            {/* Puntos destacados */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-700/50">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center flex-1">
                  <p className="text-purple-600 dark:text-purple-300 text-sm font-medium">
                    Tú ganas
                  </p>
                  <p className="text-3xl font-bold text-purple-700 dark:text-purple-200">
                    {referralPoints}
                  </p>
                  <p className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                    puntos
                  </p>
                </div>
                <div className="text-2xl">🤝</div>
                <div className="text-center flex-1">
                  <p className="text-blue-600 dark:text-blue-300 text-sm font-medium">
                    Tu amigo gana
                  </p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-200">
                    {referralPoints}
                  </p>
                  <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                    puntos
                  </p>
                </div>
              </div>
            </div>

            {/* Tu código */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Tu código de invitación:
              </p>
              <div
                onClick={handleCopyLink}
                className="bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              >
                <span className="font-mono font-bold text-blue-800 dark:text-blue-200">
                  {userPlaca}
                </span>
                <span className="material-symbols-rounded text-blue-600 dark:text-blue-400">
                  content_copy
                </span>
              </div>
            </div>

            {/* Link compartible */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Link de invitación:
              </p>
              <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {referralLink}
                  </p>
                </div>
                <button
                  onClick={handleCopyLink}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {copied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Botones de compartir */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Comparte en:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* WhatsApp */}
                <button
                  onClick={handleShareWhatsApp}
                  className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors active:scale-95"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-5.031 1.378c-1.533.964-2.605 2.375-2.93 3.785-.76 3.454.239 7.224 2.677 9.487 2.438 2.263 6.879 2.977 10.497 1.636 2.783-.857 4.797-2.934 5.175-5.371h2.967c-1.104 4.069-5.823 6.937-10.148 5.32-3.769-1.456-6.559-5.637-5.957-9.829.521-3.665 3.829-6.412 7.791-6.226 2.480.11 4.9 1.168 6.583 2.915.4.403.763.858 1.077 1.327h-2.812c-1.222-1.624-3.02-2.531-5.023-2.701m8.217-2.85c-.075.197-.226.385-.43.52-.204.134-.476.232-.683.232-.207 0-.48-.098-.683-.232-.204-.135-.355-.323-.43-.52h2.226Z" />
                  </svg>
                  WhatsApp
                </button>

                {/* SMS */}
                <button
                  onClick={handleShareSMS}
                  className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors active:scale-95"
                >
                  <span className="material-symbols-rounded text-lg">sms</span>
                  SMS
                </button>

                {/* Instagram */}
                <button
                  onClick={handleShareInstagram}
                  className="flex items-center justify-center gap-2 bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors active:scale-95"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.322a1.44 1.44 0 110-2.881 1.44 1.44 0 010 2.881z" />
                  </svg>
                  Instagram
                </button>

                {/* Más opciones */}
                {typeof navigator !== 'undefined' &&
                  typeof navigator.share === 'function' && (
                    <button
                      onClick={handleShareMore}
                      className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors active:scale-95"
                    >
                      <span className="material-symbols-rounded text-lg">
                        share
                      </span>
                      Más
                    </button>
                  )}
              </div>
            </div>

            {/* Mensaje preview */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                Vista previa del mensaje:
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                {invitationMessage}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
            <button
              onClick={onClose}
              className="w-full py-3 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold rounded-xl transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Estilos para animación */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default ReferralShareModal;
