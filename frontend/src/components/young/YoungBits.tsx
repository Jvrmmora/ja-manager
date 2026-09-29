import React from 'react';
import type { IYoung } from '../../types';
import type { YoungActions } from './useYoungActions';
import { getGroupColor, initialsOf } from './useYoungActions';

interface YoungAvatarProps {
  young: IYoung;
  size?: number;
  ring?: boolean;
  onOpenImage?: () => void;
}

// Avatar con anillo fuego opcional y punto del grupo.
export const YoungAvatar: React.FC<YoungAvatarProps> = ({
  young,
  size = 44,
  ring = false,
  onOpenImage,
}) => {
  const clickable = !!young.profileImage && !!onOpenImage;
  const inner = (
    <span
      className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-sand-100 text-cocoa-600 dark:bg-white/10 dark:text-white/85 font-display ${
        ring ? 'border-2 border-white dark:border-ink-900' : ''
      }`}
      style={{ fontSize: Math.round(size * 0.34) }}
    >
      {young.profileImage ? (
        <img
          src={young.profileImage}
          alt=""
          className={`h-full w-full object-cover ${clickable ? 'transition-transform duration-300 group-hover/avatar:scale-110' : ''}`}
        />
      ) : (
        initialsOf(young.fullName)
      )}
      {clickable && (
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors duration-300 group-hover/avatar:bg-black/50 group-focus-visible/avatar:bg-black/50">
          <svg
            className="h-5 w-5 text-white opacity-0 transition-opacity duration-300 group-hover/avatar:opacity-100 group-focus-visible/avatar:opacity-100"
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
      )}
    </span>
  );
  const dot = Math.max(10, Math.round(size * 0.26));
  const Tag = clickable ? 'button' : 'span';
  return (
    <Tag
      {...(clickable
        ? { type: 'button' as const, onClick: onOpenImage, 'aria-label': `Ver foto de ${young.fullName}` }
        : {})}
      className={`relative flex-shrink-0 rounded-full ${ring ? 'bg-[linear-gradient(135deg,#F9A23B,#DC3340,#8A1C45)] p-[2px]' : ''} ${
        clickable ? 'group/avatar cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange' : ''
      }`}
      style={{ width: size, height: size }}
    >
      {inner}
      <span
        title={young.group ? `Grupo ${young.group}` : 'Sin grupo'}
        className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white dark:border-ink-900"
        style={{ width: dot, height: dot, backgroundColor: getGroupColor(young.group) }}
      />
    </Tag>
  );
};

// Placa: copiar si existe, o generar.
export const PlacaChip: React.FC<{ young: IYoung; actions: YoungActions }> = ({
  young,
  actions,
}) =>
  young.placa ? (
    <button
      type="button"
      onClick={actions.copyPlaca}
      title="Clic para copiar"
      className="inline-flex h-[30px] max-w-full items-center gap-1.5 rounded-[10px] border border-sand-200 bg-cream px-2.5 font-mono text-xs font-semibold text-brand-wine transition-colors hover:border-[#F4B58C] dark:border-white/10 dark:bg-white/5 dark:text-[#F4A3C0]"
    >
      <span className="truncate">{young.placa}</span>
      <svg className="h-3 w-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    </button>
  ) : (
    <button
      type="button"
      onClick={actions.createPlaca}
      disabled={actions.isGeneratingPlaca}
      className="inline-flex h-[30px] items-center gap-1 rounded-[10px] border-[1.5px] border-dashed border-[#F4B58C] bg-white px-2.5 text-xs font-semibold text-brand-deep transition-colors hover:bg-sand-50 disabled:opacity-60 dark:bg-transparent dark:text-brand-amber"
    >
      {actions.isGeneratingPlaca ? (
        'Generando…'
      ) : (
        <>
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Generar placa
        </>
      )}
    </button>
  );

export const IconAction: React.FC<{
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}> = ({ label, onClick, danger = false, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`flex h-8 w-8 items-center justify-center rounded-[10px] border border-sand-200 bg-white text-cocoa-500 transition-colors dark:border-white/10 dark:bg-ink-800 dark:text-white/70 ${
      danger
        ? 'hover:border-red-300 hover:text-red-700 dark:hover:text-red-300'
        : 'hover:border-[#F4B58C] hover:text-brand-deep dark:hover:text-brand-amber'
    }`}
  >
    {children}
  </button>
);
