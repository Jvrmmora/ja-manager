// Error de formulario asociado a un campo concreto (para resaltarlo inline).
export class FieldError extends Error {
  field: string;
  constructor(message: string, field: string) {
    super(message);
    this.name = 'FieldError';
    this.field = field;
  }
}

const DUPLICATE_LABELS: Record<string, { what: string; article: string }> = {
  email: { what: 'email', article: 'Este' },
  phone: { what: 'teléfono', article: 'Este' },
  placa: { what: 'placa', article: 'Esta' },
};

// Convierte la respuesta de error del backend en un Error (FieldError si el
// backend indica qué campo falló).
export const errorFromResponse = (
  status: number,
  errorData: any,
  fallback: string
): Error => {
  const details = errorData?.error?.details;
  const field: string | undefined = details?.field || undefined;

  if (status === 409 && field && DUPLICATE_LABELS[field]) {
    const { what, article } = DUPLICATE_LABELS[field];
    const owner = details?.existingOwner;
    const message = owner
      ? `${article} ${what} ya está registrado por ${owner}.`
      : `${article} ${what} ya está registrado por otro usuario.`;
    return new FieldError(message, field);
  }

  const message =
    errorData?.error?.message || errorData?.message || fallback;
  return field ? new FieldError(message, field) : new Error(message);
};
