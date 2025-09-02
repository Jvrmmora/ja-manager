import React, { useState, useRef, useEffect } from 'react';

interface Props {
  value: string[];
  onChange: (groups: string[]) => void;
  className?: string;
}

const GROUP_OPTIONS: Array<{ value: string; label: string; color: string }> = [
  { value: '1', label: '1 — Nivel 1', color: '#34C759' },
  { value: '2', label: '2 — Nivel 2', color: '#FF9500' },
  { value: '3', label: '3 — Nivel 3', color: '#FFCC00' },
  { value: '4', label: '4 — Nivel 4', color: '#0EA5E9' },
  { value: '5', label: '5 — Nivel 5', color: '#9CA3AF' },
];

const MultiGroupSelect: React.FC<Props> = ({ value, onChange, className }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const handleToggle = (groupValue: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isSelected = value.includes(groupValue);
    if (isSelected) {
      onChange(value.filter(g => g !== groupValue));
    } else {
      onChange([...value, groupValue]);
    }
  };

  const handleSelectAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (value.length === GROUP_OPTIONS.length) {
      onChange([]);
    } else {
      onChange(GROUP_OPTIONS.map(g => g.value));
    }
  };

  const getDisplayText = () => {
    if (value.length === 0) return 'Todos los grupos';
    if (value.length === 1) {
      const group = GROUP_OPTIONS.find(g => g.value === value[0]);
      return group ? group.label : 'Grupo seleccionado';
    }
    if (value.length === GROUP_OPTIONS.length) return 'Todos los grupos';
    return `${value.length} grupos seleccionados`;
  };

  const getSelectedColors = () => {
    if (value.length === 0 || value.length === GROUP_OPTIONS.length) {
      return GROUP_OPTIONS.map(g => g.color);
    }
    return value.map(v => GROUP_OPTIONS.find(g => g.value === v)?.color || '#7C3AED');
  };

  return (
    <div className={className} ref={ref}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm sm:text-base bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Indicadores de color */}
              <div className="flex gap-1">
                {getSelectedColors().slice(0, 3).map((color, idx) => (
                  <span
                    key={idx}
                    className="inline-block w-3 h-3 rounded-full border border-white"
                    style={{ backgroundColor: color }}
                  />
                ))}
                {getSelectedColors().length > 3 && (
                  <span className="text-xs text-gray-500 ml-1">+{getSelectedColors().length - 3}</span>
                )}
              </div>
              <span className="text-gray-800 truncate">{getDisplayText()}</span>
            </div>
            <svg 
              className={`w-4 h-4 text-gray-500 transform transition-transform ${open ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {/* Opción Seleccionar todo */}
            <div className="px-3 py-2 hover:bg-gray-50 border-b border-gray-100 cursor-pointer">
              <div className="flex items-center gap-3" onClick={(e) => handleSelectAll(e)}>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={value.length === GROUP_OPTIONS.length}
                    readOnly
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 pointer-events-none"
                  />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {value.length === GROUP_OPTIONS.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </span>
              </div>
            </div>

            {/* Opciones individuales */}
            {GROUP_OPTIONS.map(option => (
              <div
                key={option.value}
                className="px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center gap-3" onClick={(e) => handleToggle(option.value, e)}>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={value.includes(option.value)}
                      readOnly
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 pointer-events-none"
                    />
                  </div>
                  <span
                    className="inline-block w-3 h-3 rounded-full border border-white"
                    style={{ backgroundColor: option.color }}
                  />
                  <span className="text-sm text-gray-800">{option.label}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiGroupSelect;
