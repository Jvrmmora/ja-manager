import DOMPurify from 'dompurify';

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Etiquetas/atributos que puede producir el editor (`RichTextEditor`):
 * TipTap StarterKit + Underline + Link + TextAlign. Cualquier otra cosa
 * (scripts, iframes, event handlers, etc.) se elimina al sanear.
 */
const ALLOWED_TAGS = [
  'p', 'br', 'span',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'mark',
  'h2', 'h3',
  'ul', 'ol', 'li',
  'blockquote', 'code', 'pre',
  'a',
];
// `style` solo lo usa TextAlign (text-align); DOMPurify filtra el CSS peligroso.
const ALLOWED_ATTR = ['href', 'style'];

// Solo enlaces http(s), mailto, tel, anclas y rutas relativas.
const ALLOWED_URI_REGEXP = /^(?:https?:|mailto:|tel:|#|\/)/i;

let linkHookInstalled = false;
const installLinkHook = () => {
  if (linkHookInstalled) return;
  linkHookInstalled = true;
  // Todo enlace del contenido se abre en pestaña nueva y sin pasar el referrer.
  DOMPurify.addHook('afterSanitizeAttributes', node => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
  });
};

const sanitize = (html: string): string => {
  // Sin DOM (build/prerender): degradar a texto plano seguro.
  if (typeof window === 'undefined' || !window.document) {
    return `<p>${escapeHtml(html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())}</p>`;
  }
  installLinkHook();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP,
    ADD_ATTR: ['target'],
  });
};

/**
 * Normaliza y **sanea** contenido enriquecido antes de inyectarlo con
 * `dangerouslySetInnerHTML`. Es la única puerta de entrada: si el valor trae
 * HTML se limpia contra la allowlist; si es texto plano se convierte a
 * párrafos escapando el contenido.
 */
export const normalizeRichTextHtml = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const normalizedValue = value.replace(/\r\n/g, '\n').trim();

  if (!normalizedValue) {
    return '';
  }

  if (HTML_TAG_PATTERN.test(normalizedValue)) {
    return sanitize(normalizedValue);
  }

  return normalizedValue
    .split(/\n{2,}/)
    .map(
      paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`
    )
    .join('');
};
