const DEFAULT_WHATSAPP_MESSAGE =
  'Hola Jovenes Modelia, quisiera conocer mas de su grupo';

const withDefaultMessage = (url: URL): string => {
  if (!url.searchParams.get('text')) {
    url.searchParams.set('text', DEFAULT_WHATSAPP_MESSAGE);
  }
  return url.toString();
};

export const normalizeWhatsAppUrl = (input?: string): string => {
  const raw = (input || '').trim();

  if (!raw) {
    return `https://wa.me/?text=${encodeURIComponent(DEFAULT_WHATSAPP_MESSAGE)}`;
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const host = url.hostname.toLowerCase();

      if (
        host.includes('wa.me') ||
        host.includes('whatsapp.com') ||
        host.includes('whatsapp.net')
      ) {
        return withDefaultMessage(url);
      }

      return raw;
    } catch {
      return raw;
    }
  }

  if (/^wa\.me\//i.test(raw)) {
    return normalizeWhatsAppUrl(`https://${raw}`);
  }

  const digitsOnly = raw.replace(/[^\d+]/g, '');
  const phone = digitsOnly.replace(/^\+/, '');

  if (phone.length >= 7) {
    return `https://wa.me/${phone}?text=${encodeURIComponent(DEFAULT_WHATSAPP_MESSAGE)}`;
  }

  return `https://wa.me/?text=${encodeURIComponent(DEFAULT_WHATSAPP_MESSAGE)}`;
};
