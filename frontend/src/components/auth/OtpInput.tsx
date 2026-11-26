import React, { useRef, useState } from 'react';

interface OtpInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  hasError?: boolean;
  describedBy?: string;
  autoFocus?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
}

const onlyDigits = (raw: string, length: number): string =>
  raw.replace(/\D/g, '').slice(0, length);

/**
 * Código de verificación de N dígitos. Hay UN solo <input> real (transparente,
 * encima de las casillas) para que funcionen el autocompletado del código por
 * SMS/correo (`one-time-code`), el teclado numérico del celular, pegar el
 * código completo y los lectores de pantalla. Las casillas son solo visuales.
 */
const OtpInput: React.FC<OtpInputProps> = ({
  id,
  value,
  onChange,
  length = 6,
  disabled,
  hasError,
  describedBy,
  autoFocus,
  inputRef,
}) => {
  const [focused, setFocused] = useState(false);
  const localRef = useRef<HTMLInputElement | null>(null);

  const setRefs = (node: HTMLInputElement | null) => {
    localRef.current = node;
    if (typeof inputRef === 'function') inputRef(node);
    else if (inputRef) (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = onlyDigits(event.clipboardData.getData('text'), length);
    if (pasted) {
      event.preventDefault();
      onChange(pasted);
    }
  };

  const activeIndex = Math.min(value.length, length - 1);

  return (
    <div className="relative">
      <div
        className="grid gap-2.5 sm:gap-3"
        style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
        aria-hidden="true"
      >
        {Array.from({ length }).map((_, i) => {
          const isActive = focused && !hasError && i === activeIndex && !disabled;
          return (
            <div
              key={i}
              className={`flex h-[54px] items-center justify-center rounded-xl border-[1.5px] bg-white font-display text-2xl font-semibold text-cocoa-900 transition sm:h-[60px] sm:rounded-2xl sm:text-[28px] dark:bg-ink-800 dark:text-white ${
                hasError
                  ? 'border-red-500 bg-red-50 dark:border-red-400 dark:bg-red-900/20'
                  : isActive
                    ? 'border-brand-orange ring-4 ring-brand-orange/20'
                    : value[i]
                      ? 'border-brand-deep dark:border-brand-amber'
                      : 'border-sand-300 dark:border-white/15'
              } ${disabled ? 'opacity-60' : ''}`}
            >
              {value[i] ?? ''}
            </div>
          );
        })}
      </div>
      <input
        id={id}
        ref={setRefs}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        maxLength={length}
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={`Código de verificación de ${length} dígitos`}
        aria-describedby={describedBy}
        aria-invalid={hasError || undefined}
        onChange={event => onChange(onlyDigits(event.target.value, length))}
        onPaste={handlePaste}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
    </div>
  );
};

export default OtpInput;
