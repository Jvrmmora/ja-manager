import React from 'react';
import {
  checkPassword,
  passwordStrength,
  strengthLabel,
} from '../../utils/passwordPolicy';

interface PasswordRequirementsProps {
  password: string;
  /** id del contenedor, para enlazarlo con aria-describedby del campo */
  id?: string;
}

const segmentColor = (score: number): string =>
  score <= 1
    ? 'bg-red-500'
    : score === 2
      ? 'bg-brand-ember'
      : score === 3
        ? 'bg-brand-amber'
        : 'bg-emerald-500';

/** Medidor de fuerza + lista de requisitos que se marca mientras se escribe. */
const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({
  password,
  id,
}) => {
  const checks = checkPassword(password);
  const score = passwordStrength(password);

  return (
    <div id={id} className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1.5" aria-hidden="true">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`h-[5px] rounded-full transition-colors ${
                password && i < score
                  ? segmentColor(score)
                  : 'bg-sand-200 dark:bg-white/15'
              }`}
            />
          ))}
        </div>
        <span
          className="min-w-[52px] text-right text-[13px] font-semibold text-cocoa-500 dark:text-white/65"
          aria-live="polite"
        >
          {strengthLabel(score, password)}
        </span>
      </div>

      <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-2 p-0 text-sm">
        {checks.map(check => (
          <li
            key={check.id}
            className={`flex items-center gap-2 ${
              check.ok
                ? 'text-emerald-700 dark:text-emerald-300'
                : check.id === 'chars'
                  ? 'col-span-2 font-semibold text-red-700 dark:text-red-300'
                  : 'text-cocoa-500 dark:text-white/65'
            }`}
          >
            <svg
              className="h-4 w-4 flex-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={check.ok ? 2.5 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              {check.ok && <path d="M8 12.5l3 3 5-6" />}
            </svg>
            <span>{check.label}</span>
            <span className="sr-only">{check.ok ? 'cumplido' : 'pendiente'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PasswordRequirements;
