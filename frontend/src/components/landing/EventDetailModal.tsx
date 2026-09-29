import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { normalizeRichTextHtml } from '../../utils/richText';

interface EventMedia {
  _id: string;
  title: string;
  description?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'document';
  altText: string;
}

interface EventDetailModalProps {
  event: EventMedia | null;
  onClose: () => void;
}

// Modal editorial para el detalle de un evento: la pieza gráfica manda,
// el texto va abajo con tipografía de lectura (no otro recuadro con scroll interno).
export default function EventDetailModal({
  event,
  onClose,
}: EventDetailModalProps) {
  const open = Boolean(event);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  let media: ReactNode = null;
  if (event?.mediaType === 'video') {
    media = (
      <video
        src={event.mediaUrl}
        controls
        className="block max-h-[52vh] w-full bg-black object-contain sm:max-h-[58vh]"
      />
    );
  } else if (event?.mediaType === 'image') {
    media = (
      <img
        src={event.mediaUrl}
        alt={event.altText || event.title}
        className="block max-h-[52vh] w-full object-contain bg-ink-950 sm:max-h-[58vh]"
      />
    );
  } else if (event?.mediaType === 'document') {
    media = (
      <iframe
        src={event.mediaUrl}
        title={event.title}
        className="h-[58vh] w-full border-0 bg-white"
      />
    );
  }

  return (
    <AnimatePresence>
      {open && event && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-[#0C0609]/85 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={event.title}
            className="relative flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-white shadow-[0_60px_120px_-40px_rgba(0,0,0,0.85)] dark:bg-ink-900 sm:max-h-[90vh] sm:rounded-[28px]"
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-md transition-colors hover:border-white/50 hover:bg-black/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
            >
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            <div className="flex-shrink-0 overflow-hidden">{media}</div>

            <div className="overflow-y-auto px-6 py-6 sm:px-8 sm:py-7">
              <span className="eyebrow text-brand-ember dark:text-brand-amber">
                Evento
              </span>
              <h3 className="m-0 mt-1.5 font-display text-2xl font-bold uppercase leading-tight text-cocoa-900 dark:text-white sm:text-3xl">
                {event.title}
              </h3>

              {event.description && (
                <div
                  className="rich-content mt-4 max-w-none text-[15px] leading-relaxed text-cocoa-600 dark:text-white/75 [&_a]:text-brand-deep dark:[&_a]:text-brand-amber [&_p]:my-3 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
                  dangerouslySetInnerHTML={{
                    __html: normalizeRichTextHtml(event.description),
                  }}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
