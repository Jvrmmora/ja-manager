import { useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface MeetingHoverMediaProps {
  /** Imagen plana en reposo (logo blanco sobre fondo oscuro). */
  poster: string;
  /** Clip corto en loop donde el logo "se enciende"; mismo encuadre que el poster. */
  video: string;
  alt: string;
  /** Contenido superpuesto (p. ej. el badge de modalidad). */
  children?: ReactNode;
}

/**
 * Media de tarjeta con efecto "hover estilo Disney+": en reposo se ve el poster
 * plano; al pasar el mouse, enfocar con teclado o tocar (alterna), el video
 * hace fade-in y el logo se enciende. El clip está alineado con el poster, por
 * eso la transición se lee como un solo logo. Respeta prefers-reduced-motion.
 */
export default function MeetingHoverMedia({
  poster,
  video,
  alt,
  children,
}: MeetingHoverMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);

  const start = () => {
    setActive(true);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    videoRef.current?.play().catch(() => {});
  };

  const stop = () => {
    setActive(false);
    const el = videoRef.current;
    if (!el) return;
    el.pause();
    try {
      el.currentTime = 0;
    } catch {
      // algunos navegadores lanzan si el video aún no tiene metadata
    }
  };

  return (
    <div
      className="relative h-52 cursor-pointer overflow-hidden bg-[#111] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
      tabIndex={0}
      role="img"
      aria-label={alt}
      onPointerEnter={e => e.pointerType !== 'touch' && start()}
      onPointerLeave={e => e.pointerType !== 'touch' && stop()}
      onPointerUp={e => {
        if (e.pointerType !== 'touch') return;
        if (active) stop();
        else start();
      }}
      onFocus={e => e.currentTarget.matches(':focus-visible') && start()}
      onBlur={stop}
    >
      <img
        src={poster}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        draggable={false}
      />
      <video
        ref={videoRef}
        src={video}
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
          active ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute left-1/2 top-3 inline-flex h-7 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/20 bg-white/10 pl-2.5 pr-3 font-display text-[11px] uppercase tracking-[0.18em] text-white/90 shadow-[0_8px_20px_-10px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all duration-300 motion-reduce:hidden ${
          active ? '-translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inset-0 rounded-full bg-brand-amber/70 motion-safe:animate-ping" />
          <span className="relative h-2 w-2 rounded-full bg-brand-amber" />
        </span>
        <span className="[@media(hover:hover)]:hidden">Toca aquí</span>
        <span className="hidden [@media(hover:hover)]:inline">Pasa el cursor</span>
      </span>
      {children}
    </div>
  );
}
