/**
 * Enmascarado de datos personales para la identificación por placa (sin
 * sesión). Quien conozca una placa ajena solo ve lo justo para que el dueño
 * se reconozca, nunca el dato completo.
 */

/** "Javier Andrés Montaño" → "Javier M." */
export const shortName = (fullName: string): string => {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
};

/** "+57 300 123 4567" → "••• 4567" */
export const maskPhone = (phone?: string | null): string | null => {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 4) return null;
  return `••• ${digits.slice(-4)}`;
};

/** "javier.mora@gmail.com" → "j•••@gmail.com" */
export const maskEmail = (email?: string | null): string | null => {
  const [user, domain] = (email || '').split('@');
  if (!user || !domain) return null;
  return `${user.charAt(0)}•••@${domain}`;
};
