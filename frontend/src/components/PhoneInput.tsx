import React from 'react';

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
    }
  }, [value]);

  const handleCountryChange = (country: typeof countries[0]) => {
    setSelectedCountry(country);
    const fullNumber = `${country.code}${phoneNumber}`.replace(/\s/g, '');
    onChange(fullNumber);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Permitir solo números, espacios y guiones
    inputValue = inputValue.replace(/[^\d\s-]/g, '');
    
    // Formatear para Colombia: XXX XXX XXXX
    if (selectedCountry.code === '+57' && inputValue.length > 0) {
      inputValue = inputValue.replace(/\D/g, ''); // Solo números
      if (inputValue.length <= 10) {
        if (inputValue.length > 6) {
          inputValue = inputValue.replace(/(\d{3})(\d{3})(\d{1,4})/, '$1 $2 $3');
        } else if (inputValue.length > 3) {
          inputValue = inputValue.replace(/(\d{3})(\d{1,3})/, '$1 $2');
        }
      }
    }
    
    setPhoneNumber(inputValue);
    const fullNumber = `${selectedCountry.code}${inputValue}`.replace(/\s/g, '');
    onChange(fullNumber);
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="relative">
        <div className="flex border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
          {/* Dropdown de países */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center px-3 py-2 bg-gray-50 border-r border-gray-300 hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-0"
              onClick={() => {
                // Aquí podrías implementar un dropdown personalizado si quieres
                // Por ahora uso el select nativo pero estilizado
              }}
            >
              <span className="text-xl mr-2">{selectedCountry.flag}</span>
              <span className="text-sm font-medium text-gray-700">{selectedCountry.code}</span>
              <svg className="w-4 h-4 ml-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            type="tel"
            value={phoneNumber}
            onChange={handlePhoneChange}
            placeholder={placeholder}
            className={`flex-1 px-3 py-2 focus:outline-none bg-white ${
              error ? 'text-red-900' : 'text-gray-900'
            }`}
            maxLength={selectedCountry.code === '+57' ? 13 : 20}
          />
        </div>

        {/* Texto de ayuda para formato colombiano */}
        {selectedCountry.code === '+57' && !error && (
          <p className="text-xs text-gray-500 mt-1 ml-1">
            Formato: XXX XXX XXXX (10 dígitos)
          </p>
        )}
      </div>

      {/* Mensaje de error */}
      {error && (
        <p className="text-sm text-red-600 ml-1">{error}</p>
      )}
    </div>
  );
};

export default PhoneInput;
