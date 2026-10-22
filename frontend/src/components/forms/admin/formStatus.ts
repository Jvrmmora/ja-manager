import type { FormStatus } from '../../../types/forms';

export const STATUS_META: Record<FormStatus, { label: string; cls: string }> = {
  DRAFT: {
    label: 'Borrador',
    cls: 'bg-sand-100 text-cocoa-600 dark:bg-white/10 dark:text-white/70',
  },
  OPEN: {
    label: 'Abierto',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
  },
  CLOSED: {
    label: 'Cerrado',
    cls: 'bg-brand-red/10 text-brand-red dark:bg-brand-red/20 dark:text-red-300',
  },
};

export const outlineBtn =
  'inline-flex h-10 items-center justify-center gap-2 rounded-full border border-sand-300 px-4 text-sm font-semibold text-cocoa-700 transition-colors hover:border-cocoa-400 disabled:opacity-50 dark:border-white/15 dark:text-white/85 dark:hover:border-white/40';

export const cardCls =
  'rounded-3xl border border-sand-200 bg-white p-5 dark:border-white/10 dark:bg-ink-900 sm:p-6';

export const labelCls = 'mb-1.5 block text-sm font-semibold text-cocoa-700 dark:text-white/85';
