import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { sectionSharePath } from '../../seo/config';

// Copia el enlace compartible de la sección (/s/<id>). Esa ruta tiene su propia
// vista previa (OG) y redirige a /#<id>, porque el #hash no llega a los
// scrapers de WhatsApp/Facebook.
const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback para contextos sin Clipboard API (http, webviews antiguos).
    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(input);
    return ok;
  }
};

interface ShareSectionButtonProps {
  /** id del <section> que se comparte (ver SECTION_SHARES) */
  sectionId: string;
  /** Distancia desde el borde superior de la sección (clases Tailwind top-*). */
  topClass?: string;
  /** 'dark' para secciones con fondo siempre oscuro (galería, testimonios). */
  tone?: 'auto' | 'dark';
}

// Sutil: sin fondo ni borde, solo el ícono atenuado; se realza al pasar encima.
const TONES = {
  auto: 'text-cocoa-900/35 hover:bg-cocoa-900/5 hover:text-cocoa-900/70 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white/80',
  dark: 'text-white/40 hover:bg-white/10 hover:text-white/80',
};

export default function ShareSectionButton({
  sectionId,
  topClass = 'top-24 md:top-28',
  tone = 'auto',
}: ShareSectionButtonProps) {
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleCopy = async () => {
    const ok = await copyText(
      `${window.location.origin}${sectionSharePath(sectionId)}`
    );
    setStatus(ok ? 'ok' : 'error');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus('idle'), 2200);
  };

  return (
    <>
      <div
        className={`pointer-events-none absolute inset-x-0 z-10 ${topClass}`}
      >
        <div className="mx-auto flex max-w-7xl justify-end px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={handleCopy}
            className={`pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber sm:h-8 sm:w-8 ${TONES[tone]}`}
            aria-label="Copiar enlace de esta sección"
            title="Copiar enlace de esta sección"
          >
            {status === 'ok' ? (
              <svg
                className="h-4 w-4 text-brand-amber"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
                <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div
        className="pointer-events-none fixed inset-x-0 bottom-8 z-50 flex justify-center px-4"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence>
          {status !== 'idle' && (
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="rounded-full border border-white/15 bg-ink-950/95 px-4 py-2 text-sm font-medium text-white shadow-lg"
            >
              {status === 'ok'
                ? 'Enlace de la sección copiado'
                : 'No se pudo copiar el enlace'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
