import React from 'react';
import { FlameIcon } from './FormIcons';

interface PointsBadgeProps {
  points: number;
}

/** Recompensa del formulario en la cabecera del evento (fondo oscuro). */
const PointsBadge: React.FC<PointsBadgeProps> = ({ points }) => (
  <p
    className="m-0 inline-flex items-center gap-2.5 rounded-full border border-brand-amber/35 bg-brand-amber/10 py-1.5 pl-1.5 pr-4 text-[14px] text-white/80"
    role="note"
  >
    <span className="bg-gold flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-brand-wine">
      <FlameIcon className="h-4 w-4" />
    </span>
    <span>
      <strong className="font-semibold text-brand-amber">+{points} puntos</strong> con tu cuenta o placa
    </span>
  </p>
);

export default PointsBadge;
