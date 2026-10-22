import type { FormEvent } from '../../types/forms';

const TZ = 'America/Bogota';

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "Sábado 25 de octubre" */
export const formatEventDate = (iso: string): string =>
  capitalize(
    new Intl.DateTimeFormat('es-CO', {
      timeZone: TZ,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
      .format(new Date(iso))
      .replace(',', '')
  );

/** "7:00 p. m." */
export const formatEventTime = (iso: string): string =>
  new Intl.DateTimeFormat('es-CO', {
    timeZone: TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso));

/** 25000 → "$25.000", 0 → "Gratis" */
export const formatCost = (cost?: number | null): string | null => {
  if (cost === null || cost === undefined) return null;
  if (cost === 0) return 'Gratis';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(cost);
};

const toCalendarStamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000;

/**
 * Enlace "Agregar a Google Calendar" (plantilla pública de Google, sin API).
 * Sin fecha de fin se asume una duración de 3 horas.
 */
export const buildGoogleCalendarUrl = (
  title: string,
  event: FormEvent,
  detailsUrl?: string
): string | null => {
  if (!event.startsAt) return null;
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : new Date(start.getTime() + DEFAULT_DURATION_MS);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${toCalendarStamp(start)}/${toCalendarStamp(end)}`,
    ctz: TZ,
  });
  if (event.location) params.set('location', event.location);
  if (detailsUrl) params.set('details', `Info y respuesta: ${detailsUrl}`);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/** Enlace a Maps: el que puso el admin o una búsqueda por el lugar. */
export const buildMapsUrl = (event: FormEvent): string | null => {
  if (event.mapsUrl) return event.mapsUrl;
  if (!event.location) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`;
};

// Colombia no tiene horario de verano: siempre UTC-5.
const BOGOTA_OFFSET_MS = -5 * 60 * 60 * 1000;

/** ISO (UTC) → valor de <input type="datetime-local"> en hora de Bogotá. */
export const toBogotaInput = (iso?: string | null): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() + BOGOTA_OFFSET_MS).toISOString().slice(0, 16);
};

/** Valor de <input type="datetime-local"> (hora de Bogotá) → ISO UTC. */
export const fromBogotaInput = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(`${value}:00-05:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
