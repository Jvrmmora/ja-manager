// Utilidades de DOM de la cinemática. Los textos siempre van por textContent.
export const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string
) => {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => Array.from(word)[0])
    .join('')
    .toLocaleUpperCase('es');

/** Retrato con iniciales de respaldo mientras carga (o si no hay) la foto */
export const portrait = (person: {
  name: string;
  photo?: string | undefined;
}) => {
  const frame = el('div', 'portrait');
  const fallback = el('span', 'initials', initials(person.name));
  fallback.setAttribute('aria-hidden', 'true');
  const photo = el('img', 'portrait-photo');
  photo.alt = '';
  photo.draggable = false;
  photo.hidden = true;
  if (person.photo) {
    photo.addEventListener('load', () => (photo.hidden = false), {
      once: true,
    });
    photo.src = person.photo;
  }
  frame.append(fallback, photo);
  return frame;
};
