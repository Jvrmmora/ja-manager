import React, { useState } from 'react';
import { getInitials } from '../../../utils/forms/initials';

interface RespondentAvatarProps {
  name: string;
  /** Foto del perfil (jóvenes con sesión o placa). Sin foto o si falla, se usan iniciales. */
  photoUrl?: string | null | undefined;
  size?: 'md' | 'lg';
}

const SIZES = { md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg' };

/** Foto del joven o, si no hay (invitados), círculo con sus iniciales. */
const RespondentAvatar: React.FC<RespondentAvatarProps> = ({ name, photoUrl, size = 'md' }) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = !!photoUrl && failedUrl !== photoUrl;

  return showPhoto ? (
    <img
      src={photoUrl}
      alt=""
      loading="lazy"
      onError={() => setFailedUrl(photoUrl)}
      className={`${SIZES[size]} flex-shrink-0 rounded-full bg-sand-100 object-cover dark:bg-white/10`}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`${SIZES[size]} bg-fire flex flex-shrink-0 items-center justify-center rounded-full font-display font-semibold tracking-wide text-white`}
    >
      {getInitials(name)}
    </span>
  );
};

export default RespondentAvatar;
