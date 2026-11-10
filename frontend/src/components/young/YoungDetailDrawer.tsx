import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { IYoung } from '../../types';
import ParticipantHistoryModal from '../ParticipantHistoryModal';
import { formatBirthdayWithYear } from '../../utils/dateUtils';
import { getGroupColor } from './useYoungActions';
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

const sectionTitle =
  'm-0 mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-deep dark:text-brand-amber';
const rowCard =
  'flex items-center gap-3 rounded-2xl border border-sand-200 px-3.5 py-2.5 dark:border-white/10';
const linkBtn =
  'flex-shrink-0 rounded-full border border-sand-200 px-3 py-1.5 text-xs font-semibold text-brand-deep transition-colors hover:border-[#F4B58C] dark:border-white/10 dark:text-brand-amber';

// Partes (año, mes, día) de una fecha YYYY-MM-DD sin sufrir corrimiento de zona horaria
const dateParts = (value: Date | string | undefined) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
  return m ? { y: +m[1]!, mo: +m[2]!, d: +m[3]! } : null;
};

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

  // Bloquea el scroll de la página de atrás mientras el panel está abierto
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // Arrastrar hacia abajo el asa/encabezado cierra la hoja (solo en móvil,
  // donde el panel es una hoja inferior)
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDragY(0);
      setDragging(false);
      dragStart.current = null;
    }
  }, [isOpen]);

  const onDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia('(min-width: 640px)').matches) return;
    if ((e.target as HTMLElement).closest('button, a')) return;
    dragStart.current = e.clientY;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) return;
    setDragY(Math.max(0, e.clientY - dragStart.current));
  };
  const onDragEnd = () => {
    if (dragStart.current === null) return;
    const shouldClose = dragY > 120;
    dragStart.current = null;
    setDragging(false);
    setDragY(0);
    if (shouldClose) onClose();
  };

  if (!isOpen) return null;

  const bd = dateParts(young.birthday);
  const today = new Date();
  let age: number | null = null;
  let birthdayHint = '';
  if (bd) {
    age = today.getFullYear() - bd.y;
    const passed =
      today.getMonth() + 1 > bd.mo ||
      (today.getMonth() + 1 === bd.mo && today.getDate() >= bd.d);
    if (!passed) age -= 1;
    const next = new Date(today.getFullYear(), bd.mo - 1, bd.d);
    if (!passed) next.setFullYear(today.getFullYear());
    else if (today.getMonth() + 1 !== bd.mo || today.getDate() !== bd.d)
      next.setFullYear(today.getFullYear() + 1);
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const days = Math.round((next.getTime() - startToday.getTime()) / 86400000);
    birthdayHint =
      days === 0 ? '🎂 ¡Hoy cumple años!' : days <= 30 ? `Cumple en ${days} día${days === 1 ? '' : 's'}` : '';
  }
  const phoneDigits = (young.phone || '').replace(/\D/g, '');
  const whatsappUrl = phoneDigits ? `https://wa.me/${phoneDigits}` : '';

  // Cierra el panel y ejecuta la acción (que abre su propio modal)
  const run = (fn: () => void) => () => {
    onClose();
    fn();
  };

  return createPortal(
    <div className="fixed inset-0 z-[55] flex items-end justify-end bg-[#0C0609]/60 backdrop-blur-[2px] sm:items-stretch" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle de ${young.fullName}`}
        onClick={e => e.stopPropagation()}
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragging ? 'none' : 'transform 200ms ease-out',
        }}
        className="flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:h-full sm:max-w-[480px] sm:rounded-none dark:bg-ink-900"
      >
        {/* Zona de arrastre (móvil): asa + encabezado. Arrastrar hacia abajo cierra la hoja */}
        <div
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          className="flex-shrink-0 touch-none sm:touch-auto"
        >
        <div className="mx-auto mt-2.5 h-1.5 w-10 cursor-grab rounded-full bg-sand-200 sm:hidden dark:bg-white/20" aria-hidden="true" />
        {/* Encabezado */}
        <div className="flex items-start gap-3 border-b border-sand-100 p-4 sm:gap-4 sm:p-5 dark:border-white/10">
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
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-sand-200 text-cocoa-500 hover:border-[#F4B58C] dark:border-white/10 dark:text-white/70"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
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
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-5">
          {tab === 'resumen' ? (
            <div className="space-y-6">
              {/* Datos clave */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl border border-sand-200 bg-sand-50 p-3 text-center dark:border-white/10 dark:bg-white/[0.05]">
                  <div className="font-display text-3xl font-bold leading-none text-brand-ember dark:text-brand-amber">
                    {young.totalPoints ?? 0}
                  </div>
                  <div className="mt-1 text-[11px] text-cocoa-500 dark:text-white/55">puntos</div>
                </div>
                <div className="rounded-2xl border border-sand-200 bg-sand-50 p-3 text-center dark:border-white/10 dark:bg-white/[0.05]">
                  <div className="font-display text-3xl font-bold leading-none text-cocoa-900 dark:text-white">
                    {age ?? '—'}
                  </div>
                  <div className="mt-1 text-[11px] text-cocoa-500 dark:text-white/55">
                    años{young.ageRange ? ` · ${young.ageRange}` : ''}
                  </div>
                </div>
                <div className="rounded-2xl border border-sand-200 bg-sand-50 p-3 text-center dark:border-white/10 dark:bg-white/[0.05]">
                  <div className="flex items-center justify-center gap-1.5 font-display text-3xl font-bold leading-none text-cocoa-900 dark:text-white">
                    {young.group ? (
                      <>
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: getGroupColor(young.group) }}
                        />
                        {young.group}
                      </>
                    ) : (
                      '—'
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-cocoa-500 dark:text-white/55">grupo</div>
                </div>
              </div>

              {/* Contacto */}
              <section>
                <h3 className={sectionTitle}>Contacto</h3>
                <div className="space-y-2">
                  <div className={rowCard}>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-[11px] text-cocoa-400 dark:text-white/45">Teléfono</p>
                      <p className="m-0 truncate text-sm font-medium text-cocoa-900 dark:text-white">
                        {young.phone || '—'}
                      </p>
                    </div>
                    {whatsappUrl && (
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={linkBtn}>
                        WhatsApp
                      </a>
                    )}
                  </div>
                  <div className={rowCard}>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-[11px] text-cocoa-400 dark:text-white/45">Email</p>
                      <p className="m-0 truncate text-sm font-medium text-cocoa-900 dark:text-white">
                        {young.email || '—'}
                      </p>
                    </div>
                    {young.email && (
                      <a href={`mailto:${young.email}`} className={linkBtn}>
                        Escribir
                      </a>
                    )}
                  </div>
                </div>
              </section>

              {/* Datos personales */}
              <section>
                <h3 className={sectionTitle}>Datos personales</h3>
                <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-4 rounded-2xl border border-sand-200 p-4 dark:border-white/10">
                  <Field label="Cumpleaños">
                    {young.birthday ? formatBirthdayWithYear(young.birthday) : ''}
                    {birthdayHint && (
                      <span className="mt-0.5 block text-xs font-medium text-brand-deep dark:text-brand-amber">
                        {birthdayHint}
                      </span>
                    )}
                  </Field>
                  <Field label="Género">
                    {young.gender
                      ? young.gender.charAt(0).toUpperCase() + young.gender.slice(1)
                      : ''}
                  </Field>
                  <Field label="Rol">{capitalizeRole(young.role)}</Field>
                  <Field label="En el grupo desde">
                    {young.createdAt ? formatBirthdayWithYear(young.createdAt) : ''}
                  </Field>
                </dl>
              </section>

              {/* Habilidades */}
              <section>
                <h3 className={sectionTitle}>Habilidades</h3>
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
                  <p className="m-0 text-sm text-cocoa-400 dark:text-white/45">
                    Aún no tiene habilidades registradas.
                  </p>
                )}
              </section>
            </div>
          ) : (
            <ParticipantHistoryModal
              youngId={young.id || ''}
              youngName={young.fullName}
              profileImage={young.profileImage}
              onClose={onClose}
              embedded
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
