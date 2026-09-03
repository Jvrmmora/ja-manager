import { useEffect, useState } from 'react';
import type { ImgHTMLAttributes } from 'react';

interface ImageWithFallbackProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** URL de la imagen. Si falla la carga se reintenta una vez y luego se muestra el placeholder. */
  src?: string;
  /** Texto opcional que se muestra dentro del placeholder (p. ej. el título). */
  fallbackLabel?: string;
}

/**
 * Imagen resiliente para la landing.
 *
 * Cloudinary sirve los assets a través de varios CDN y ocasionalmente un edge
 * responde (y cachea) un 404 espurio para una imagen que sí existe. Sin esto el
 * navegador deja el icono de "imagen rota" hasta que se limpia la caché.
 *
 * Estrategia: al fallar la carga se reintenta una vez con un parámetro
 * anti-caché (normalmente pega en otro edge y resuelve). Si vuelve a fallar se
 * muestra un placeholder con icono en vez del glyph roto del navegador.
 */
export default function ImageWithFallback({
  src,
  alt,
  fallbackLabel,
  className,
  ...imgProps
}: ImageWithFallbackProps) {
  const [attempt, setAttempt] = useState(0); // 0 = original, 1 = reintento, 2 = placeholder

  // Si cambia el src (nuevo upload desde el CMS) reiniciamos el ciclo.
  useEffect(() => {
    setAttempt(0);
  }, [src]);

  if (!src || attempt >= 2) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 text-gray-400 dark:text-gray-500 ${className ?? ''}`}
        role="img"
        aria-label={alt || fallbackLabel || 'Imagen no disponible'}
      >
        <svg
          className="w-10 h-10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.6}
            d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.6}
            d="M3 16l5-5 4 4 3-3 6 6"
          />
          <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
        </svg>
        {fallbackLabel && (
          <span className="px-3 text-center text-xs font-semibold">
            {fallbackLabel}
          </span>
        )}
      </div>
    );
  }

  const resolvedSrc =
    attempt === 0
      ? src
      : `${src}${src.includes('?') ? '&' : '?'}retry=${attempt}`;

  return (
    <img
      key={resolvedSrc}
      src={resolvedSrc}
      alt={alt}
      className={className}
      onError={() => setAttempt(prev => prev + 1)}
      {...imgProps}
    />
  );
}
