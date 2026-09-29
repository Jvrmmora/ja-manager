import React from 'react';
import type { IYoung } from '../../types';
import PointsCard from '../PointsCard';
import { formatBirthday } from '../../utils/dateUtils';
import {
  useYoungActions,
  capitalizeRole,
  type YoungActionCallbacks,
} from './useYoungActions';
import YoungActionModals from './YoungActionModals';
import YoungActionsMenu from './YoungActionsMenu';
import { YoungAvatar, PlacaChip, IconAction } from './YoungBits';
import { ICONS } from './icons';

// Columnas de la tabla (se comparten con el encabezado de HomePage)
export const YOUNG_ROW_GRID =
  'md:grid md:grid-cols-[minmax(0,1fr)_100px_170px_150px] lg:grid-cols-[minmax(0,1fr)_72px_120px_100px_170px_150px] xl:grid-cols-[minmax(0,1fr)_72px_220px_120px_100px_170px_150px] md:gap-4 md:items-center';

interface YoungRowProps extends YoungActionCallbacks {
  young: IYoung;
  referralPoints?: number;
}

// Fila de un joven (vista "Lista" del admin).
const YoungRow: React.FC<YoungRowProps> = ({
  young,
  referralPoints = 500,
  ...callbacks
}) => {
  const actions = useYoungActions(young, callbacks);

  return (
    <div className="group flex min-h-[66px] items-center gap-3 border-b border-sand-100 px-3.5 py-2.5 transition-colors last:border-b-0 hover:bg-cream sm:px-5 dark:border-white/5 dark:hover:bg-white/[0.03] md:py-2">
      <div className={`flex min-w-0 flex-1 items-center gap-3 ${YOUNG_ROW_GRID}`}>
        {/* Joven */}
        <div className="flex min-w-0 items-center gap-3">
          <YoungAvatar young={young} size={40} onOpenImage={actions.openImage} />
          <div className="min-w-0">
            <p className="m-0 truncate text-sm font-bold text-cocoa-900 dark:text-white" title={young.fullName}>
              {young.fullName}
            </p>
            <p className="m-0 truncate text-xs text-cocoa-400 dark:text-white/55">
              {capitalizeRole(young.role)}
              {young.group ? ` · Grupo ${young.group}` : ''}
              <span className="md:hidden">
                {' · '}
                <span className="font-display text-[13px] text-brand-ember dark:text-brand-amber">
                  ★ {young.totalPoints ?? 0}
                </span>
              </span>
            </p>
          </div>
        </div>
        {/* Edad */}
        <span className="hidden text-[13px] text-cocoa-600 lg:block dark:text-white/70">
          {young.ageRange}
        </span>
        {/* Contacto */}
        <span className="hidden min-w-0 flex-col text-[13px] text-cocoa-600 xl:flex dark:text-white/70">
          <span className="truncate">{young.phone || '—'}</span>
          <span className="truncate text-xs text-cocoa-400 dark:text-white/45">
            {young.email || '—'}
          </span>
        </span>
        {/* Cumpleaños */}
        <span className="hidden text-[13px] text-cocoa-600 lg:block dark:text-white/70">
          {young.birthday ? formatBirthday(young.birthday) : '—'}
        </span>
        {/* Puntos */}
        <span className="hidden md:block">
          {young.id && (
            <PointsCard
              youngId={young.id}
              totalPoints={young.totalPoints ?? 0}
              onClick={actions.openPoints}
            />
          )}
        </span>
        {/* Placa */}
        <span className="hidden min-w-0 md:block">
          <PlacaChip young={young} actions={actions} />
        </span>
        {/* Acciones */}
        <span className="hidden items-center justify-end gap-1.5 opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 md:flex">
          {young.placa && (
            <IconAction label="Tarjeta de bienvenida" onClick={actions.openWelcome}>
              {ICONS.image}
            </IconAction>
          )}
          <IconAction label="Editar" onClick={actions.edit}>
            {ICONS.edit}
          </IconAction>
          <IconAction label="Eliminar" onClick={actions.openDelete} danger>
            {ICONS.trash}
          </IconAction>
          <YoungActionsMenu young={young} actions={actions} buttonClassName="h-8 w-8 rounded-[10px]" />
        </span>
      </div>
      {/* Móvil: todas las acciones en ⋯ */}
      <div className="md:hidden">
        <YoungActionsMenu young={young} actions={actions} buttonClassName="h-11 w-11 rounded-xl" />
      </div>

      <YoungActionModals
        young={young}
        actions={actions}
        referralPoints={referralPoints}
        onShowSuccess={callbacks.onShowSuccess}
        onShowError={callbacks.onShowError}
      />
    </div>
  );
};

export default YoungRow;
