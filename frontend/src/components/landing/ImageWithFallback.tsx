import { useEffect, useRef, useState } from 'react';
import type { ImgHTMLAttributes } from 'react';

interface ImageWithFallbackProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** URL de la imagen. Si falla la carga se reintenta y luego se muestra el placeholder. */
  src?: string;
  /** Texto opcional que se muestra dentro del placeholder (p. ej. el título). */
  fallbackLabel?: string;
}

/**
 * Esperas (ms) antes de cada reintento. La longitud del array define cuántos
 * reintentos hay: [400, 1200] => 1ª carga + 2 reintentos = 3 intentos totales.
 * La espera creciente da tiempo a que un 404 cacheado en un edge del CDN expire.
 */
const RETRY_DELAYS_MS = [400, 1200];

/**
 * Añade parámetros anti-caché a la URL para el reintento.
 *
 * - `?retry=N` cambia la clave de caché tanto en el navegador como en el CDN,
 *   por lo que la petición suele ser atendida por otro edge (que sí tiene la
 *   imagen buena) en vez de reusar el 404 cacheado.
 * - En URLs de Cloudinary sin transformaciones se inserta además `f_auto/`, que
 *   cambia la ruta de entrega y, con ella, el objeto cacheado.
 */
const withRetryParams = (url: string, attempt: number): string => {
  const withFormat = url.replace(
    /(\/image\/upload\/)(v\d+\/)/,
    '$1f_auto/$2'
  );
  const separator = withFormat.includes('?') ? '&' : '?';
  return `${withFormat}${separator}retry=${attempt}`;
};

/**
 * Imagen resiliente para la landing.
 *
 * Cloudinary sirve los assets a través de varios CDN y ocasionalmente un edge
 * responde (y cachea) un 404 espurio para una imagen que sí existe. Sin esto el
 * navegador deja el icono de "imagen rota" hasta que se limpia la caché.
 *
 * Al fallar la carga se reintenta con espera creciente y parámetros anti-caché;
 * agotados los reintentos se muestra un placeholder con icono y el título.
 */
export default function ImageWithFallback({
  src,
  alt,
  fallbackLabel,
  className,
  ...imgProps
}: ImageWithFallbackProps) {
  // 0 = original, 1..RETRY_DELAYS_MS.length = reintentos, > length = placeholder
  const [attempt, setAttempt] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Si cambia el src (nuevo upload desde el CMS) reiniciamos el ciclo.
  useEffect(() => {
    setAttempt(0);
    return clearTimer;
  }, [src]);

  const handleError = () => {
    if (attempt >= RETRY_DELAYS_MS.length) {
      setAttempt(attempt + 1); // agotados los reintentos -> placeholder
      return;
    }
    clearTimer();
    timerRef.current = setTimeout(() => {
      setAttempt(prev => prev + 1);
    }, RETRY_DELAYS_MS[attempt]);
  };

  if (!src || attempt > RETRY_DELAYS_MS.length) {
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

  const resolvedSrc = attempt === 0 ? src : withRetryParams(src, attempt);

  return (
    <img
      key={resolvedSrc}
      src={resolvedSrc}
      alt={alt}
      className={className}
      onError={handleError}
      {...imgProps}
    />
  );
}
