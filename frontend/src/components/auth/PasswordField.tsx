import React, { useState } from 'react';

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: 'new-password' | 'current-password';
  placeholder?: string;
  /** Borde de estado: normal, con error o validado. */
  status?: 'default' | 'error' | 'ok';
  describedBy?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
}

const eyeOff = (
  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
);
const eyeOn = (
  <>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </>
);

const statusClass: Record<NonNullable<PasswordFieldProps['status']>, string> = {
  default: '',
  error: '!border-red-500 dark:!border-red-400',
  ok: '!border-emerald-600 dark:!border-emerald-400',
};

/**
 * Campo de contraseña con el "ojito" para verla u ocultarla. El estado de
 * visibilidad es de cada campo (cada uno tiene el suyo).
 */
const PasswordField: React.FC<PasswordFieldProps> = ({
  id,
  label,
  value,
  onChange,
  autoComplete = 'new-password',
  placeholder,
  status = 'default',
  describedBy,
  autoFocus,
  disabled,
  inputRef,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-cocoa-700 dark:text-white/85"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={event => onChange(event.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={64}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          aria-invalid={status === 'error' || undefined}
          aria-describedby={describedBy}
          className={`field-brand h-[52px] pr-14 ${statusClass[status]}`}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-xl text-cocoa-400 hover:text-cocoa-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40 dark:text-white/50 dark:hover:text-white"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {visible ? eyeOff : eyeOn}
          </svg>
        </button>
      </div>
    </div>
  );
};

export default PasswordField;
