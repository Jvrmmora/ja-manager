import React, { useRef } from 'react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  className?: string;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  error,
  placeholder = "Escribe tu número",
  className = ""
}) => {
  // Países con códigos más comunes para Colombia
  const countries = [
    { code: '+57', country: 'CO', flag: '🇨🇴', name: 'Colombia' },
    { code: '+1', country: 'US', flag: '🇺🇸', name: 'Estados Unidos' },
    { code: '+52', country: 'MX', flag: '🇲🇽', name: 'México' },
    { code: '+34', country: 'ES', flag: '🇪🇸', name: 'España' },
    { code: '+54', country: 'AR', flag: '🇦🇷', name: 'Argentina' },
  ];

  const [selectedCountry, setSelectedCountry] = React.useState(countries[0]);
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorPositionRef = useRef<number>(0);

  // Inicializar valores cuando el componente se monta
  React.useEffect(() => {
    if (value) {
      // Si el valor ya incluye código de país, separarlo
      const country = countries.find(c => value.startsWith(c.code));
      if (country) {
        setSelectedCountry(country);
        setPhoneNumber(value.replace(country.code, '').trim());
      } else {
        // Si no tiene código de país, usar el valor completo como número
        setPhoneNumber(value);
      }
    } else {
      setPhoneNumber('');
    }
  }, [value]);

  // Función para formatear número colombiano preservando la posición del cursor
  const formatColombianPhone = (value: string, cursorPos: number): { formatted: string; newCursorPos: number } => {
    // Remover todo excepto números
    const digitsOnly = value.replace(/\D/g, '');
    
    if (digitsOnly.length === 0) {
      return { formatted: '', newCursorPos: 0 };
    }

    // Limitar a 10 dígitos
    const limitedDigits = digitsOnly.slice(0, 10);
    
    // Calcular cuántos dígitos hay antes del cursor en el valor original (sin espacios)
    const digitsBeforeCursor = value.slice(0, cursorPos).replace(/\D/g, '').length;
    
    // Formatear
    let formatted = '';
    let newCursorPos = 0;
    
    if (limitedDigits.length > 6) {
      formatted = `${limitedDigits.slice(0, 3)} ${limitedDigits.slice(3, 6)} ${limitedDigits.slice(6)}`;
    } else if (limitedDigits.length > 3) {
      formatted = `${limitedDigits.slice(0, 3)} ${limitedDigits.slice(3)}`;
    } else {
      formatted = limitedDigits;
    }

    // Calcular nueva posición del cursor
    // Si el cursor estaba después del último dígito, ponerlo al final
    if (digitsBeforeCursor >= limitedDigits.length) {
      newCursorPos = formatted.length;
    } else {
      // Contar espacios antes de la posición objetivo
      let spacesBefore = 0;
      let digitCount = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (formatted[i] === ' ') {
          spacesBefore++;
        } else {
          digitCount++;
          if (digitCount >= digitsBeforeCursor) {
            newCursorPos = i + 1;
            break;
          }
        }
      }
    }

    return { formatted, newCursorPos };
  };

  const handleCountryChange = (country: typeof countries[0]) => {
    setSelectedCountry(country);
    
    // Solo enviar el código de país si hay un número
    if (phoneNumber.trim()) {
      const fullNumber = `${country.code}${phoneNumber}`.replace(/\s/g, '');
      onChange(fullNumber);
    } else {
      // Si está vacío, mantener vacío
      onChange('');
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const cursorPos = input.selectionStart || 0;
    let inputValue = input.value;
    
    // Guardar posición del cursor antes de formatear
    cursorPositionRef.current = cursorPos;
    
    // Formatear para Colombia: XXX XXX XXXX
    if (selectedCountry.code === '+57') {
      const { formatted, newCursorPos } = formatColombianPhone(inputValue, cursorPos);
      inputValue = formatted;
      
      setPhoneNumber(inputValue);
      
      // Restaurar posición del cursor después de actualizar el estado
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    } else {
      // Para otros países, solo permitir números
      inputValue = inputValue.replace(/[^\d\s-]/g, '');
      setPhoneNumber(inputValue);
      
      // Mantener posición del cursor
      setTimeout(() => {
        if (inputRef.current) {
          const newPos = Math.min(cursorPos, inputValue.length);
          inputRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    }
    
    // Solo enviar el código de país si hay un número
    if (inputValue.trim()) {
      const fullNumber = `${selectedCountry.code}${inputValue}`.replace(/\s/g, '');
      onChange(fullNumber);
    } else {
      // Si está vacío, enviar string vacío
      onChange('');
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="relative">
        <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-400 focus-within:border-blue-500 dark:focus-within:border-blue-400 bg-white dark:bg-gray-700">
          {/* Dropdown de países */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              className="flex items-center px-3 py-2 bg-gray-50 dark:bg-gray-600 border-r border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors duration-200 focus:outline-none focus:ring-0 whitespace-nowrap"
              onClick={() => {
                // Aquí podrías implementar un dropdown personalizado si quieres
                // Por ahora uso el select nativo pero estilizado
              }}
            >
              <span className="text-xl mr-1.5">{selectedCountry.flag}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedCountry.code}</span>
              <svg className="w-4 h-4 ml-1.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Select oculto para la funcionalidad */}
            <select
              className="absolute inset-0 opacity-0 cursor-pointer"
              value={selectedCountry.code}
              onChange={(e) => {
                const country = countries.find(c => c.code === e.target.value);
                if (country) handleCountryChange(country);
              }}
            >
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.flag} {country.code} {country.name}
                </option>
              ))}
            </select>
          </div>

          {/* Input del número */}
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            value={phoneNumber}
            onChange={handlePhoneChange}
            placeholder={placeholder}
            className={`flex-1 min-w-0 px-3 py-2 focus:outline-none bg-white dark:bg-gray-700 ${
              error ? 'text-red-900 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'
            } placeholder-gray-500 dark:placeholder-gray-400`}
            maxLength={selectedCountry.code === '+57' ? 13 : 20}
          />
        </div>

        {/* Texto de ayuda para formato colombiano */}
        {selectedCountry.code === '+57' && !error && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-1">
            Formato: XXX XXX XXXX (10 dígitos)
          </p>
        )}
      </div>

      {/* Mensaje de error */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 ml-1">{error}</p>
      )}
    </div>
  );
};

export default PhoneInput;
