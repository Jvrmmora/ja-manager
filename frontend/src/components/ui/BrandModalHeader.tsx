import React from 'react';

type IconTone = 'fire' | 'wine' | 'gold' | 'green';

interface BrandModalHeaderProps {
  title: string;
  subtitle?: React.ReactNode | undefined;
  icon?: React.ReactNode;
  iconTone?: IconTone;
  onClose?: (() => void) | undefined;
  actions?: React.ReactNode;
  sticky?: boolean;
  compact?: boolean;
}

const TONES: Record<IconTone, string> = {
  fire: 'bg-gradient-to-br from-brand-orange to-[#B3243B] text-white',
  wine: 'bg-[#B0245A]/30 text-[#F4A3C0]',
  gold: 'bg-gold text-ink-950',
  green: 'bg-emerald-500/25 text-emerald-300',
};

// Cabecera oscura de marca compartida por los modales y paneles del admin.
const BrandModalHeader: React.FC<BrandModalHeaderProps> = ({
  title,
  subtitle,
  icon,
  iconTone = 'fire',
  onClose,
  actions,
  sticky = false,
  compact = false,
}) => (
  <div
    className={`${sticky ? 'sticky top-0 z-10' : 'relative'} flex flex-shrink-0 items-center justify-between gap-3 overflow-hidden bg-ink-950 text-white ${
      compact ? 'px-5 py-4' : 'px-5 sm:px-7 py-4 sm:py-5'
    }`}
  >
    <div className="pointer-events-none absolute -right-24 -top-56 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(242,106,46,.35)_0%,rgba(20,11,16,0)_65%)]" />
    <div className="relative flex min-w-0 items-center gap-3.5">
      {icon && (
        <span
          className={`flex h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0 items-center justify-center rounded-[14px] ${TONES[iconTone]}`}
        >
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-col">
        <h2
          className={`m-0 font-display font-semibold uppercase leading-none ${
            compact ? 'text-xl' : 'text-[22px] sm:text-[26px]'
          }`}
        >
          {title}
        </h2>
        {subtitle && (
          <span className="mt-1 truncate text-[13px] text-white/60">
            {subtitle}
          </span>
        )}
      </span>
    </div>
    <div className="relative flex flex-shrink-0 items-center gap-2">
      {actions}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
        >
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </div>
  </div>
);

export const headerActionCls =
  'inline-flex h-10 sm:h-11 items-center gap-2 rounded-full border border-white/20 px-3 sm:px-4 text-[13px] font-semibold text-white transition-colors hover:border-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber';

export default BrandModalHeader;
