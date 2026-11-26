import { useEffect, useState } from 'react';

/**
 * Segundos que faltan para `targetMs` (marca de tiempo en ms), actualizados
 * cada segundo. Con `null` devuelve 0.
 *
 * El valor se calcula contra el reloj EN CADA RENDER (el intervalo solo fuerza
 * el re-render): así, en el mismo render en que llega un `targetMs` nuevo ya
 * devuelve los segundos correctos y nunca se ve un "0" falso intermedio (que
 * haría creer que algo ya venció). Tampoco se desfasa con la pestaña en
 * segundo plano.
 */
export function useCountdown(targetMs: number | null): number {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!targetMs) return;
    const id = window.setInterval(() => {
      setTick(tick => tick + 1);
      if (Date.now() >= targetMs) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [targetMs]);

  return targetMs ? Math.max(0, Math.ceil((targetMs - Date.now()) / 1000)) : 0;
}

/** 125 -> "2:05" */
export const formatClock = (totalSeconds: number): string => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};
