export type FormAvailability = 'draft' | 'open' | 'closed' | 'full';

interface AvailabilityInput {
  status: 'DRAFT' | 'OPEN' | 'CLOSED';
  closesAt?: Date | null;
  capacity?: number | null;
  seatsTaken: number;
}

/** Estado efectivo del formulario para quien lo abre en este momento. */
export const getAvailability = (form: AvailabilityInput, now: Date = new Date()): FormAvailability => {
  if (form.status === 'DRAFT') return 'draft';
  if (form.status === 'CLOSED') return 'closed';
  if (form.closesAt && now >= new Date(form.closesAt)) return 'closed';
  if (form.capacity && form.seatsTaken >= form.capacity) return 'full';
  return 'open';
};

export const spotsLeft = (form: AvailabilityInput): number | null =>
  form.capacity ? Math.max(0, form.capacity - form.seatsTaken) : null;

/** Una respuesta ocupa cupo salvo que diga explícitamente "no asistiré". */
export const occupiesSeat = (attending: boolean | null | undefined): boolean => attending !== false;
