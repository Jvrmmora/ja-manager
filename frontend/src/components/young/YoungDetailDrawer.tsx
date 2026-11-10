import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { IYoung } from '../../types';
import PointsBreakdownModal from '../PointsBreakdownModal';
import { formatBirthdayWithYear } from '../../utils/dateUtils';
import { capitalizeRole, type YoungActions } from './useYoungActions';
import { YoungAvatar, PlacaChip } from './YoungBits';

interface YoungDetailDrawerProps {
  young: IYoung;
  actions: YoungActions;
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'resumen' | 'historial';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="min-w-0">
    <dt className="text-[11px] font-semibold uppercase tracking-wide text-cocoa-400 dark:text-white/45">
      {label}
    </dt>
    <dd className="m-0 mt-0.5 break-words text-sm text-cocoa-900 dark:text-white">
      {children || '—'}
    </dd>
  </div>
);

const actionBtn =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-sand-200 bg-white px-4 text-sm font-semibold text-cocoa-900 transition-colors hover:border-[#F4B58C] hover:text-brand-deep dark:border-white/10 dark:bg-ink-800 dark:text-white dark:hover:text-brand-amber';

// Panel lateral con todo el detalle de un joven (vista admin).
const YoungDetailDrawer: React.FC<YoungDetailDrawerProps> = ({
  young,
  actions,
  isOpen,
  onClose,
}) => {
  const [tab, setTab] = useState<Tab>('resumen');

  useEffect(() => {
    if (isOpen) setTab('resumen');
  }, [isOpen, young.id]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Cierra el panel y ejecuta la acción (que abre su propio modal)
  const run = (fn: () => void) => () => {
    onClose();
    fn();
  };

  return createPortal(
    <div className="fixed inset-0 z-[55] flex justify-end bg-[#0C0609]/60 backdrop-blur-[2px]" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle de ${young.fullName}`}
        onClick={e => e.stopPropagation()}
        className="flex h-full w-full max-w-[480px] flex-col bg-white shadow-2xl dark:bg-ink-900"
      >
        {/* Encabezado */}
        <div className="flex items-start gap-4 border-b border-sand-100 p-5 dark:border-white/10">
          <YoungAvatar young={young} size={64} ring onOpenImage={actions.openImage} />
          <div className="min-w-0 flex-1">
            <h2 className="m-0 truncate text-lg font-bold text-cocoa-900 dark:text-white" title={young.fullName}>
              {young.fullName}
            </h2>
            <p className="m-0 mb-2 truncate text-sm text-cocoa-400 dark:text-white/55">
              {capitalizeRole(young.role)}
              {young.group ? ` · Grupo ${young.group}` : ''}
            </p>
            <PlacaChip young={young} actions={actions} />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-sand-200 text-cocoa-500 hover:border-[#F4B58C] dark:border-white/10 dark:text-white/70"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Pestañas */}
        <div role="tablist" className="flex gap-1 border-b border-sand-100 px-5 dark:border-white/10">
          {([
            ['resumen', 'Resumen'],
            ['historial', 'Puntos e historial'],
          ] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`-mb-px h-11 border-b-2 px-3 text-sm font-semibold transition-colors ${
                tab === id
                  ? 'border-brand-orange text-brand-deep dark:text-brand-amber'
                  : 'border-transparent text-cocoa-400 hover:text-cocoa-900 dark:text-white/55 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'resumen' ? (
            <div className="space-y-6">
              <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-4">
                <Field label="Teléfono">{young.phone}</Field>
                <Field label="Email">{young.email}</Field>
                <Field label="Cumpleaños">
                  {young.birthday ? formatBirthdayWithYear(young.birthday) : ''}
                </Field>
                <Field label="Rango de edad">
                  {young.ageRange ? `${young.ageRange} años` : ''}
                </Field>
                <Field label="Género">
                  {young.gender
                    ? young.gender.charAt(0).toUpperCase() + young.gender.slice(1)
                    : ''}
                </Field>
                <Field label="Puntos (temporada)">★ {young.totalPoints ?? 0}</Field>
              </dl>
              <div>
                <p className="m-0 mb-2 text-[11px] font-semibold uppercase tracking-wide text-cocoa-400 dark:text-white/45">
                  Habilidades
                </p>
                {young.skills?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {young.skills.map(skill => (
                      <span
                        key={skill}
                        className="rounded-full bg-sand-100 px-3 py-1 text-xs font-medium text-cocoa-600 dark:bg-white/10 dark:text-white/80"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="m-0 text-sm text-cocoa-400 dark:text-white/45">—</p>
                )}
              </div>
            </div>
          ) : (
            <PointsBreakdownModal
              young={young}
              isOpen
              embedded
              onClose={onClose}
              isAdmin={actions.isAdmin}
              onAssignPoints={() => actions.openAssignPoints()}
            />
          )}
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap gap-2 border-t border-sand-100 p-4 dark:border-white/10">
          <button type="button" className={actionBtn} onClick={run(actions.edit)}>
            Editar
          </button>
          {actions.isAdmin && (
            <button type="button" className={actionBtn} onClick={run(actions.openAssignPoints)}>
              Asignar puntos
            </button>
          )}
          {young.placa && (
            <button type="button" className={actionBtn} onClick={run(actions.openWelcome)}>
              Tarjeta de bienvenida
            </button>
          )}
          {young.placa && actions.isAdmin && (
            <button type="button" className={actionBtn} onClick={run(actions.openPassword)}>
              Generar contraseña
            </button>
          )}
          <button
            type="button"
            className={`${actionBtn} ml-auto !text-red-700 hover:!border-red-300 dark:!text-red-300`}
            onClick={run(actions.openDelete)}
          >
            Eliminar
          </button>
        </div>
      </aside>
    </div>,
    document.body
  );
};

export default YoungDetailDrawer;
