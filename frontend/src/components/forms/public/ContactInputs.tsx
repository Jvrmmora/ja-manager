import React from 'react';
import PhoneInput from '../../PhoneInput';
import type { ContactField, ContactValues } from '../../../types/forms';

export const CONTACT_LABELS: Record<ContactField, string> = {
  fullName: 'Nombre completo',
  phone: 'Teléfono',
  email: 'Correo',
  birthday: 'Fecha de nacimiento',
  ageRange: 'Rango de edad',
  gender: 'Género',
  group: 'Grupo',
};

const AGE_RANGES = ['13-15', '16-18', '19-21', '22-25', '26-30', '30+'];

export const labelCls = 'mb-1.5 block text-sm font-semibold text-cocoa-700 dark:text-white/85';
export const inputCls = (error?: string) =>
  `field-brand h-12 text-[15px] ${error ? '!border-red-500' : ''}`;
export const ErrorText: React.FC<{ children?: string | undefined }> = ({ children }) =>
  children ? <p className="mt-1 text-xs font-medium text-red-500">{children}</p> : null;

interface ContactInputsProps {
  fields: ContactField[];
  required: Set<ContactField>;
  values: ContactValues;
  errors: Partial<Record<ContactField, string>>;
  onChange: (field: ContactField, value: string) => void;
  disabled?: boolean;
}

/** Campos de "Tus datos" que hay que escribir (invitado o lo que falta en el perfil). */
const ContactInputs: React.FC<ContactInputsProps> = ({
  fields,
  required,
  values,
  errors,
  onChange,
  disabled,
}) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    {fields.map(field => {
      const id = `contact-${field}`;
      const label = `${CONTACT_LABELS[field]}${required.has(field) ? ' *' : ''}`;
      const value = values[field] ?? '';
      const error = errors[field];
      const wide = field === 'fullName' || field === 'phone' || field === 'email';

      return (
        <div key={field} className={wide ? 'sm:col-span-2' : ''}>
          <label htmlFor={id} className={labelCls}>
            {label}
          </label>
          {field === 'phone' ? (
            <PhoneInput
              value={value}
              onChange={v => onChange('phone', v)}
              variant="brand"
              className={error ? 'border-red-500' : 'border-sand-300 dark:border-white/15'}
            />
          ) : field === 'ageRange' || field === 'gender' || field === 'group' ? (
            <select
              id={id}
              value={value}
              disabled={disabled}
              onChange={e => onChange(field, e.target.value)}
              className={inputCls(error)}
            >
              <option value="">Selecciona…</option>
              {field === 'ageRange' &&
                AGE_RANGES.map(range => (
                  <option key={range} value={range}>
                    {range} años
                  </option>
                ))}
              {field === 'gender' && (
                <>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                </>
              )}
              {field === 'group' &&
                [1, 2, 3, 4, 5].map(group => (
                  <option key={group} value={group}>
                    Grupo {group}
                  </option>
                ))}
            </select>
          ) : (
            <input
              id={id}
              type={field === 'email' ? 'email' : field === 'birthday' ? 'date' : 'text'}
              value={value}
              disabled={disabled}
              autoComplete={field === 'fullName' ? 'name' : field === 'email' ? 'email' : 'off'}
              max={field === 'birthday' ? new Date().toISOString().split('T')[0] : undefined}
              placeholder={field === 'fullName' ? 'Ej: Ana María Pérez' : field === 'email' ? 'tu@correo.com' : ''}
              onChange={e => onChange(field, e.target.value)}
              className={inputCls(error)}
            />
          )}
          <ErrorText>{error}</ErrorText>
        </div>
      );
    })}
  </div>
);

export default ContactInputs;
