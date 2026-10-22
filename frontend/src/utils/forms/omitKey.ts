/** Copia de `obj` sin la clave `key` (para quitar campos opcionales con exactOptionalPropertyTypes). */
export const omitKey = <T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> => {
  const copy = { ...obj };
  delete copy[key];
  return copy;
};
