import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type CredentialMode = 'auto' | 'email' | 'placa';

export interface DynamicCredentialInputProps {
  value: string;
  onChange: (
    value: string,
    meta: { mode: Exclude<CredentialMode, 'auto'>; isValid: boolean }
  ) => void;
  defaultMode?: CredentialMode;
  id?: string;
  label?: string;
  className?: string;
}

// Reutilizamos el patrón ya usado en el registro para mantener consistencia con el backend
// @MOD + 2-4 letras + 3 dígitos (ej: @MODJAVI001)
const PLACA_REGEX = /^@MOD[A-Z]{2,4}\d{3}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // HTML5-like simple regex

function sanitizePlacaInput(input: string): string {
  // Si está vacío, permitir
  if (!input) return '';

  // Convertir a mayúsculas y remover espacios
  const upper = input.toUpperCase().replace(/\s+/g, '');

  // Quitar caracteres inválidos (mantener solo @, letras y números)
  let filtered = upper.replace(/[^@A-Z0-9]/g, '');

  // Si NO empieza con @, sugeriríamos @MOD pero sin forzarlo en cada keystroke
  // Permitir que el usuario escriba libremente
  if (!filtered.startsWith('@') && filtered.length > 0) {
    // Solo si tiene estructura de placa (@MOD + letras + números), sugerir
    return filtered;
  }

  // Si empieza con @, permitir que edite libremente
  // Solo normalizar @ múltiples a uno
  if (filtered.startsWith('@@') || filtered.startsWith('@@@')) {
    filtered = '@' + filtered.replace(/^@+/, '');
  }

  // Limitar longitud total ("@MOD" + 7 => 11 máx)
  if (filtered.length > 11) {
    filtered = filtered.slice(0, 11);
  }

  return filtered;
}

function detectMode(input: string): Exclude<CredentialMode, 'auto'> {
  const v = input.trim();

  // Si es obviamente un email (tiene @ en la mitad), es email
  if (v.includes('@') && !v.startsWith('@')) {
    return 'email';
  }

  // Si empieza con @, probablemente sea placa
  if (v.startsWith('@')) {
    return 'placa';
  }

  // Si solo tiene letras/números sin símbolos especiales, es ambiguo
  // Default: email para permitir que el usuario pegue su correo fácilmente
  return 'email';
}

export default function DynamicCredentialInput({
  value,
  onChange,
  defaultMode = 'auto',
  id = 'username',
  label = 'Email o Placa',
  className = '',
}: DynamicCredentialInputProps) {
  const [mode, setMode] = useState<CredentialMode>(defaultMode);

  const handleModeChange = (newMode: CredentialMode) => {
    setMode(newMode);

    // Si el usuario cambia a modo "Email" y hay @MOD, removerlo
    if (newMode === 'email' && value.startsWith('@MOD')) {
      onChange('', { mode: 'email', isValid: false });
    }
  };

  const effectiveMode = useMemo(
    () =>
      mode === 'auto'
        ? detectMode(value)
        : (mode as Exclude<CredentialMode, 'auto'>),
    [mode, value]
  );
  const [focused, setFocused] = useState(false);

  const isValid = useMemo(() => {
    if (effectiveMode === 'placa') {
      // Aceptar placa completa o parcialmente válida durante la edición
      const upper = value.toUpperCase();
      return PLACA_REGEX.test(upper);
    }
    return EMAIL_REGEX.test(value.trim().toLowerCase());
  }, [effectiveMode, value]);

  useEffect(() => {
    onChange(value, { mode: effectiveMode, isValid });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, effectiveMode, isValid]);

  const placeholder =
    effectiveMode === 'placa'
      ? 'Ingresa tu placa (ej: @MODJAVI001)'
      : 'Ingresa tu email (ej: ejemplo@dominio.com)';

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // En modo Email, NO aplicar sanitización
    if (effectiveMode === 'email') {
      onChange(raw, { mode: effectiveMode, isValid });
      return;
    }

    // En modo Placa, aplicar sanitización
    if (effectiveMode === 'placa') {
      const sanitized = sanitizePlacaInput(raw);
      onChange(sanitized, { mode: effectiveMode, isValid });
      return;
    }

    // En modo Auto, dejar que el usuario escriba libremente
    onChange(raw, { mode: effectiveMode, isValid });
  };

  const helperText = useMemo(() => {
    if (effectiveMode === 'placa') {
      if (value === '') {
        return 'Formato: @MOD + 2-4 letras + 3 números. Ej: @MODJAVI001';
      }
      return isValid
        ? '✓ Placa válida'
        : 'Formato incorrecto. Necesita: @MOD + 2-4 letras + 3 números';
    }
    if (value === '') {
      return 'Ingresa tu correo electrónico completo';
    }
    return isValid
      ? '✓ Email válido'
      : 'Email inválido. Necesita: usuario@dominio.com';
  }, [effectiveMode, isValid, value]);

  return (
    <div className={`w-full ${className}`}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        {label}
      </label>

      {/* Toggle de modo con micro-animación */}
      <div className="mb-2 inline-flex rounded-full p-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 relative overflow-hidden">
        {(['auto', 'email', 'placa'] as CredentialMode[]).map(opt => {
          const active = mode === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => handleModeChange(opt)}
              className={`relative px-3 py-1.5 text-xs sm:text-sm rounded-full transition-all duration-200 ${active ? 'text-blue-600 dark:text-blue-400 scale-[1.02]' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
              aria-pressed={active}
            >
              {active && (
                <motion.span
                  layoutId="toggle-pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute inset-0 rounded-full bg-white dark:bg-gray-900 shadow"
                  style={{ zIndex: 0 }}
                />
              )}
              <span className="relative z-10">
                {opt === 'auto' ? 'Auto' : opt === 'email' ? 'Email' : 'Placa'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative group">
        <motion.input
          id={id}
          name={id}
          type="text"
          autoComplete="username"
          value={value}
          onChange={handleInput}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`w-full px-3 py-3 pr-10 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
            effectiveMode === 'placa'
              ? 'border-blue-300 dark:border-blue-500/40 dark:bg-gray-800 dark:text-white'
              : 'border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
          } ${isValid ? 'ring-0' : ''}`}
          placeholder={placeholder}
          animate={{
            boxShadow: focused
              ? '0 0 0 4px rgba(59,130,246,0.35)'
              : isValid && value
                ? '0 0 0 3px rgba(16,185,129,0.30)'
                : '0 0 0 0 rgba(0,0,0,0)',
            backgroundColor:
              effectiveMode === 'placa'
                ? 'rgba(30,64,175,0.06)'
                : 'rgba(0,0,0,0)',
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
        {/* Icono dinámico con transición */}
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          <AnimatePresence mode="wait" initial={false}>
            {effectiveMode === 'placa' ? (
              <motion.svg
                key="placa"
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -6, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className={`h-5 w-5 ${isValid ? 'text-emerald-500' : 'text-blue-500'}`}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l9 4v6c0 5-4 9-9 10-5-1-9-5-9-10V6l9-4z" />
              </motion.svg>
            ) : (
              <motion.svg
                key="email"
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -6, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className={`h-5 w-5 ${isValid ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-500'}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 8v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8"
                />
              </motion.svg>
            )}
          </AnimatePresence>
        </span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {value ? (
          <motion.div
            key={`validation-${effectiveMode}-${isValid}`}
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 2 }}
            transition={{ duration: 0.15 }}
            className={`mt-1 text-xs ${
              isValid
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {helperText}
          </motion.div>
        ) : (
          <motion.div
            key={`info-${effectiveMode}`}
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 2 }}
            transition={{ duration: 0.15 }}
            className="mt-1 text-xs text-gray-500 dark:text-gray-400"
          >
            {helperText}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
