import React, { useEffect } from 'react';

interface SeasonConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

// Confirmación de cierre de temporada (no destructiva: no se borra nada)
const SeasonConfirmModal: React.FC<SeasonConfirmModalProps> = ({
  title,
  message,
  confirmLabel,
  loading,
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      if (!loading) onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [loading, onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0C0609]/75 p-4 backdrop-blur-sm"
      onClick={() => !loading && onClose()}
    >
      <div
        className="w-full max-w-md rounded-[28px] bg-white p-6 text-center shadow-2xl dark:bg-ink-900"
        onClick={e => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <h3 className="m-0 font-display text-2xl font-semibold uppercase text-cocoa-900 dark:text-white">
          {title}
        </h3>
        <p className="mb-6 mt-3 text-sm leading-relaxed text-cocoa-600 dark:text-white/70">
          {message}
        </p>
        <div className="flex gap-2.5">
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
            className="btn-fire h-12 flex-1 text-sm disabled:opacity-60"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeasonConfirmModal;
