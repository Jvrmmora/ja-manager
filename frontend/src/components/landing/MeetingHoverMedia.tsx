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
      {children}
    </div>
  );
}
