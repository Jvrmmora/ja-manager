import React from 'react';
import { getInitials } from '../../utils/nameUtils';

interface AvatarPhotoProps {
  name: string;
  image?: string | undefined;
  /** Tamaño, borde y tamaño de texto de las iniciales. */
  className: string;
  style?: React.CSSProperties;
  /** Si se pasa y hay foto, el avatar es un botón que abre la foto en grande. */
  onOpen?: ((url: string, name: string) => void) | undefined;
}

/**
 * Avatar redondo con foto de perfil o iniciales. Con `onOpen`, tocar la foto
 * la abre en grande (mismo comportamiento que la vista de cumpleaños).
 */
const AvatarPhoto: React.FC<AvatarPhotoProps> = ({ name, image, className, style, onOpen }) => {
  const base = `relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-800 font-display text-white ${className}`;

  if (!image || !onOpen) {
    return (
      <span className={base} {...(style ? { style } : {})}>
        {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : getInitials(name)}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(image, name)}
      className={`group/photo cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber ${base}`}
      {...(style ? { style } : {})}
      title="Ver foto en grande"
      aria-label={`Ver foto de ${name}`}
    >
      <img
        src={image}
        alt=""
        className="h-full w-full object-cover transition-transform duration-300 group-hover/photo:scale-110"
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover/photo:bg-black/45 group-focus-visible/photo:bg-black/45">
        <svg
          className="h-[38%] max-h-7 w-[38%] max-w-7 text-white opacity-0 transition-opacity duration-300 group-hover/photo:opacity-100 group-focus-visible/photo:opacity-100"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </span>
    </button>
  );
};

export default AvatarPhoto;
