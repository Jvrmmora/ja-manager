import { useRef } from 'react';

/**
 * Hook personalizado que compara valores profundamente
 * Útil para detectar cambios reales en objetos complejos
 */
export function useDeepCompare<T>(value: T): T {
  const ref = useRef<T>(value);
  const signalRef = useRef<number>(0);

  if (JSON.stringify(value) !== JSON.stringify(ref.current)) {
    ref.current = value;
    signalRef.current += 1;
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return ref.current;
}

/**
 * Compara dos valores profundamente
 * Retorna true si son diferentes
 */
export function hasDeepChanged<T>(prev: T, next: T): boolean {
  return JSON.stringify(prev) !== JSON.stringify(next);
}
