import React from 'react';
import type { IYoung } from '../types';
import PointsCard from './PointsCard';
import { formatBirthday } from '../utils/dateUtils';
import {
  useYoungActions,
  capitalizeRole,
  type YoungActionCallbacks,
} from './young/useYoungActions';
import YoungActionModals from './young/YoungActionModals';
import YoungActionsMenu from './young/YoungActionsMenu';
import { YoungAvatar, PlacaChip } from './young/YoungBits';

interface YoungCardProps extends YoungActionCallbacks {
  young: IYoung;
  referralPoints?: number;
}

// Tarjeta compacta de un joven (vista "Tarjetas" del admin).
const YoungCard: React.FC<YoungCardProps> = ({
  young,
  referralPoints = 500,
  ...callbacks
}) => {
  const actions = useYoungActions(young, callbacks);

  return (
    <>
    <article className="flex flex-col gap-4 rounded-[20px] border border-sand-200 bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-28px_rgba(78,15,58,0.45)] dark:border-white/10 dark:bg-ink-900">
      <div className="flex items-start gap-3.5">
        <YoungAvatar young={young} size={48} onOpenImage={actions.openImage} />
        <div className="min-w-0 flex-1">
          <h3
            className="m-0 line-clamp-2 break-words text-[15px] font-bold leading-tight text-cocoa-900 dark:text-white"
            title={young.fullName}
          >
            {young.fullName}
          </h3>
          <p className="mt-1 truncate text-xs text-cocoa-400 dark:text-white/55">
            {capitalizeRole(young.role)}
            {young.group ? ` · Grupo ${young.group}` : ''}
          </p>
        </div>
        <YoungActionsMenu young={young} actions={actions} />
      </div>

      <div className="flex flex-col gap-1 text-[13px] text-cocoa-500 dark:text-white/60">
        {young.phone && <span className="truncate">{young.phone}</span>}
        {young.email && <span className="truncate">{young.email}</span>}
        <span className="text-cocoa-400 dark:text-white/45">
          {young.ageRange} años · {formatBirthday(young.birthday)}
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        {young.id && (
          <PointsCard
            youngId={young.id}
            totalPoints={young.totalPoints ?? 0}
            onClick={actions.openPoints}
          />
        )}
        <PlacaChip young={young} actions={actions} />
      </div>
    </article>
      {/* Fuera del <article>: su hover:-translate crea un bloque contenedor y los `fixed` se colapsarían dentro de la tarjeta */}
      <YoungActionModals
        young={young}
        actions={actions}
        referralPoints={referralPoints}
        onShowSuccess={callbacks.onShowSuccess}
        onShowError={callbacks.onShowError}
      />
    </>
  );
};

export default YoungCard;
