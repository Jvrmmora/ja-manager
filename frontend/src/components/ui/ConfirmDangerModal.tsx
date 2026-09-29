import React, { useEffect } from 'react';

interface ConfirmDangerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  question: string;
  subject: string;
  badge?: string | undefined;
  warnings: string[];
  confirmLabel: string;
  loading?: boolean;
}

// Confirmación de acciones destructivas (el rojo solo se usa para borrar).
const ConfirmDangerModal: React.FC<ConfirmDangerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  question,
  subject,
  badge,
  warnings,
  confirmLabel,
  loading = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0C0609]/75 p-4 backdrop-blur-sm"
      onClick={() => !loading && onClose()}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-[0_50px_100px_-40px_rgba(0,0,0,0.8)] dark:bg-ink-900"
        onClick={e => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex flex-col items-center gap-3 px-6 pb-4 pt-7 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300">
            <svg className="h-[30px] w-[30px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </span>
          <h3 className="m-0 font-display text-2xl font-semibold uppercase text-cocoa-900 dark:text-white">
            {title}
          </h3>
          <p className="m-0 text-sm text-cocoa-600 dark:text-white/70">
            {question} <strong className="text-cocoa-900 dark:text-white">{subject}</strong>?
          </p>
          {badge && (
            <span className="inline-flex h-7 items-center rounded-full bg-red-700 px-3 text-xs font-bold text-white">
              {badge}
            </span>
          )}
          <div className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-[13px] leading-relaxed text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            <strong className="block">Advertencia</strong>
            <ul className="m-0 list-none p-0">
              {warnings.map(w => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex gap-2.5 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-12 flex-1 rounded-full border-[1.5px] border-sand-300 bg-white text-sm font-semibold text-cocoa-600 hover:border-cocoa-400 disabled:opacity-50 dark:border-white/15 dark:bg-transparent dark:text-white/80"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-red-700 text-sm font-semibold text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Eliminando...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDangerModal;
