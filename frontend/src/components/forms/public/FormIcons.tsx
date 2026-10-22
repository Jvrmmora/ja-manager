import React from 'react';

/** Íconos de trazo del formulario público (en vez de emojis, que cambian según el sistema). */
type IconProps = { className?: string };

const Stroke: React.FC<IconProps & { children: React.ReactNode }> = ({ className = 'h-4 w-4', children }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const FlameIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.6 2.2c.3 2.6-.9 4.3-2.3 5.9-1.5 1.7-3.1 3.4-3.1 6.4a4.8 4.8 0 0 0 9.6 0c0-1.6-.6-2.9-1.4-3.9.1 1.2-.3 2.2-1.2 2.7.2-2.9-.6-5.3-1.6-7.1-.6 1.6-1.6 2.6-2.4 3.4.2-2.9 1.6-5 2.4-7.4z" />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = props => (
  <Stroke {...props}>
    <path d="M5 12l5 5L20 7" />
  </Stroke>
);

export const XIcon: React.FC<IconProps> = props => (
  <Stroke {...props}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Stroke>
);

export const CalendarIcon: React.FC<IconProps> = props => (
  <Stroke {...props}>
    <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
  </Stroke>
);

export const PinIcon: React.FC<IconProps> = props => (
  <Stroke {...props}>
    <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
  </Stroke>
);

export const EyeIcon: React.FC<IconProps> = props => (
  <Stroke {...props}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Stroke>
);

export const CheckCircleIcon: React.FC<IconProps> = props => (
  <Stroke {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.5l2.5 2.5 4.5-5" />
  </Stroke>
);

export const UserPlusIcon: React.FC<IconProps> = props => (
  <Stroke {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6" />
  </Stroke>
);
