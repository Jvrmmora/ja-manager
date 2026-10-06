import React, { useEffect, useRef, useState } from 'react';
import { copyText } from '../utils/clipboard';

interface ShareLinkButtonProps {
  url: string;
  /** Texto completo para WhatsApp (ya incluye la URL al final). */
  message: string;
  /** Título para el menú nativo de compartir del celular. */
  title: string;
  /** Muestra la etiqueta "Compartir" también en móvil (por defecto solo el ícono). */
  alwaysShowLabel?: boolean;
}

/**
 * Botón "Compartir" para las vistas de ranking y cumpleaños: abre un menú con
 * WhatsApp, copiar enlace, copiar mensaje y (en celular) el menú nativo.
 * Pensado para fondos oscuros.
 */
const ShareLinkButton: React.FC<ShareLinkButtonProps> = ({
  url,
  message,
  title,
  alwaysShowLabel = false,
}) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<'link' | 'message' | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const handleCopy = async (kind: 'link' | 'message') => {
    const ok = await copyText(kind === 'link' ? url : message);
    if (!ok) return;
    setCopied(kind);
    setTimeout(() => {
      setCopied(null);
      setOpen(false);
    }, 1400);
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, text: message.replace(url, '').trim(), url });
      setOpen(false);
    } catch {
      // El usuario canceló el menú nativo: no hacer nada
    }
  };

  const item =
    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/90 transition-colors hover:bg-white/[0.08] focus:outline-none focus-visible:bg-white/[0.08]';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Compartir enlace"
        title="Compartir enlace"
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/20 text-sm font-semibold text-white transition-colors hover:border-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber ${
          alwaysShowLabel ? 'px-4' : 'w-11 sm:w-auto sm:px-4'
        } ${open ? 'border-white/50 bg-white/[0.08]' : ''}`}
      >
        <ShareIcon className="h-4 w-4" />
        <span className={alwaysShowLabel ? '' : 'hidden sm:inline'}>Compartir</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-30 w-[248px] rounded-2xl border border-white/10 bg-ink-900/95 p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)] backdrop-blur-md"
        >
          <a
            role="menuitem"
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className={item}
          >
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
              <WhatsappIcon className="h-4 w-4" />
            </span>
            Enviar por WhatsApp
          </a>
          <button role="menuitem" type="button" onClick={() => handleCopy('link')} className={item}>
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
              {copied === 'link' ? (
                <CheckIcon className="h-4 w-4 text-emerald-400" />
              ) : (
                <LinkIcon className="h-4 w-4" />
              )}
            </span>
            {copied === 'link' ? '¡Enlace copiado!' : 'Copiar enlace'}
          </button>
          <button role="menuitem" type="button" onClick={() => handleCopy('message')} className={item}>
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
              {copied === 'message' ? (
                <CheckIcon className="h-4 w-4 text-emerald-400" />
              ) : (
                <MessageIcon className="h-4 w-4" />
              )}
            </span>
            {copied === 'message' ? '¡Mensaje copiado!' : 'Copiar mensaje con enlace'}
          </button>
          {canNativeShare && (
            <button role="menuitem" type="button" onClick={handleNativeShare} className={item}>
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
                <ShareIcon className="h-4 w-4" />
              </span>
              Más opciones…
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const ShareIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
  </svg>
);

const LinkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
    <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.5-1.5" />
  </svg>
);

const MessageIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const WhatsappIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.44 1.32 4.94L2.05 22l5.29-1.38a9.87 9.87 0 0 0 4.7 1.2h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm0 18.06h-.01a8.16 8.16 0 0 1-4.16-1.14l-.3-.18-3.13.82.84-3.05-.2-.31a8.15 8.15 0 0 1-1.25-4.31c0-4.5 3.66-8.16 8.17-8.16 2.18 0 4.23.85 5.77 2.39a8.1 8.1 0 0 1 2.39 5.78c0 4.5-3.67 8.16-8.12 8.16Zm4.47-6.12c-.24-.12-1.45-.72-1.68-.8-.22-.08-.39-.12-.55.12-.16.24-.63.8-.78.97-.14.16-.29.18-.53.06-.24-.12-1.02-.38-1.95-1.21-.72-.64-1.2-1.44-1.35-1.68-.14-.24-.01-.37.11-.49.11-.11.24-.29.36-.43.12-.14.16-.24.24-.4.08-.16.04-.31-.02-.43-.06-.12-.55-1.32-.75-1.81-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.43.06-.65.31-.22.24-.86.84-.86 2.05s.88 2.38 1 2.54c.12.16 1.73 2.64 4.2 3.7.59.25 1.05.4 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.45-.59 1.66-1.17.2-.57.2-1.06.14-1.17-.06-.1-.22-.16-.46-.28Z" />
  </svg>
);

export default ShareLinkButton;
