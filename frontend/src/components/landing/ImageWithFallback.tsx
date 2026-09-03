import { useEffect, useState } from 'react';
import type { ImgHTMLAttributes } from 'react';

interface ImageWithFallbackProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** URL de la imagen. Si falla la carga se muestra el placeholder. */
  src?: string;
  /** Texto opcional que se muestra dentro del placeholder (p. ej. el título). */
  fallbackLabel?: string;
}

/**
 * Imagen resiliente para la landing: si la URL responde 404 (por ejemplo un
 * recurso de Cloudinary que fue borrado) muestra un placeholder con icono en
 * vez del icono de "imagen rota" del navegador.
 */
export default function ImageWithFallback({
  src,
  alt,
  fallbackLabel,
  className,
  ...imgProps
}: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);

  // Si cambia el src (nuevo upload desde el CMS) reintentamos.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
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

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      {...imgProps}
    />
  );
}
