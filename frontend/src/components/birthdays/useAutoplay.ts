import { useEffect, useRef } from 'react';

interface AutoplayOptions {
  /** Solo avanza mientras sea true (pausa, mouse encima, foto abierta… lo apagan). */
  running: boolean;
  /** Milisegundos por tarjeta. */
  duration: number;
  /** Cambia cuando se navega o cambia el período: la cuenta vuelve a cero. */
  resetKey: string;
  onAdvance: () => void;
}

/**
 * Autoplay de la cinta de cumpleaños. Cuenta el tiempo con requestAnimationFrame
 * y pinta la barra de progreso directo en el DOM, sin re-render en cada cuadro.
 * Devuelve el ref que va en la barra.
 */
export const useAutoplay = ({ running, duration, resetKey, onAdvance }: AutoplayOptions) => {
  const barRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef(0);
  const onAdvanceRef = useRef(onAdvance);

  useEffect(() => {
    onAdvanceRef.current = onAdvance;
  }, [onAdvance]);

  useEffect(() => {
    elapsedRef.current = 0;
    if (barRef.current) barRef.current.style.transform = 'scaleX(0)';
  }, [resetKey]);

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // Tope de 100 ms por cuadro: si la pestaña estuvo oculta no se acumula tiempo
      elapsedRef.current += Math.min(now - last, 100);
      last = now;
      if (elapsedRef.current >= duration) {
        elapsedRef.current = 0;
        onAdvanceRef.current();
      }
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${Math.min(elapsedRef.current / duration, 1)})`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, duration]);

  return barRef;
};
