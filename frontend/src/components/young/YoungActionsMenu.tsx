import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { IYoung } from '../../types';
import type { YoungActions } from './useYoungActions';

interface YoungActionsMenuProps {
  young: IYoung;
  actions: YoungActions;
  buttonClassName?: string;
}

// Menú ⋯ con todas las acciones de un joven.
const YoungActionsMenu: React.FC<YoungActionsMenuProps> = ({
  young,
  actions,
  buttonClassName = 'h-9 w-9 rounded-[10px]',
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Posición fija junto al botón; se voltea hacia arriba si no cabe abajo
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const MENU_W = 240;
    const place = () => {
      const btn = btnRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const h = menuRef.current?.offsetHeight ?? 320;
      const below = r.bottom + 8;
      const top =
        below + h > window.innerHeight - 8 && r.top - 8 - h > 8
          ? r.top - 8 - h
          : Math.min(below, Math.max(8, window.innerHeight - h - 8));
      const left = Math.min(
        Math.max(8, r.right - MENU_W),
        window.innerWidth - MENU_W - 8
      );
      setPos({ top, left });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  const item =
    'flex h-11 w-full items-center gap-2.5 rounded-[10px] px-3 text-left text-sm font-medium text-cocoa-900 hover:bg-cream dark:text-white dark:hover:bg-white/5';

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        type="button"
        aria-label="Más acciones"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className={`flex flex-shrink-0 items-center justify-center border border-sand-200 bg-white text-cocoa-500 transition-colors hover:border-[#F4B58C] hover:text-brand-deep dark:border-white/10 dark:bg-ink-800 dark:text-white/70 ${
          open ? 'border-[#F4B58C] bg-sand-100 text-brand-deep dark:bg-white/10' : ''
        } ${buttonClassName}`}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>
      {open &&
        createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            top: pos?.top ?? 0,
            left: pos?.left ?? 0,
            visibility: pos ? 'visible' : 'hidden',
          }}
          className="fixed z-[60] w-60 rounded-2xl border border-sand-200 bg-white p-1.5 shadow-[0_24px_48px_-16px_rgba(20,11,16,0.35)] dark:border-white/10 dark:bg-ink-800"
        >
          <button role="menuitem" type="button" className={item} onClick={run(actions.openPoints)}>
            Ver puntos y desglose
          </button>
          {actions.isAdmin && (
            <button role="menuitem" type="button" className={item} onClick={run(actions.openAssignPoints)}>
              Asignar puntos
            </button>
          )}
          <button role="menuitem" type="button" className={item} onClick={run(actions.edit)}>
            Editar
          </button>
          {young.placa ? (
            <>
              <button role="menuitem" type="button" className={item} onClick={run(actions.copyPlaca)}>
                Copiar placa
                <span className="ml-auto font-mono text-xs text-brand-wine dark:text-[#F4A3C0]">
                  {young.placa}
                </span>
              </button>
              <button role="menuitem" type="button" className={item} onClick={run(actions.openWelcome)}>
                Tarjeta de bienvenida
              </button>
              {actions.isAdmin ? (
                <button role="menuitem" type="button" className={item} onClick={run(actions.openPassword)}>
                  Generar contraseña
                </button>
              ) : (
                <button role="menuitem" type="button" className={item} onClick={run(actions.openReferral)}>
                  Invitar amigos
                </button>
              )}
            </>
          ) : (
            <button
              role="menuitem"
              type="button"
              className={item}
              disabled={actions.isGeneratingPlaca}
              onClick={run(actions.createPlaca)}
            >
              {actions.isGeneratingPlaca ? 'Generando placa…' : 'Generar placa'}
            </button>
          )}
          <span className="mx-2 my-1 block h-px bg-sand-100 dark:bg-white/10" />
          <button
            role="menuitem"
            type="button"
            className={`${item} !text-red-700 dark:!text-red-300`}
            onClick={run(actions.openDelete)}
          >
            Eliminar
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

export default YoungActionsMenu;
