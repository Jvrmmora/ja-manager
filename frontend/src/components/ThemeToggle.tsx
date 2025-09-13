import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 
        ${isDark 
          ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }
        shadow-md hover:shadow-lg group
      `}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      <div className="relative w-6 h-6">
        {/* Icono de sol (modo claro) */}
        <svg
          className={`
            absolute inset-0 w-6 h-6 transition-all duration-500 transform
            ${isDark 
              ? 'opacity-0 rotate-180 scale-50' 
              : 'opacity-100 rotate-0 scale-100'
            }
          `}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>

        {/* Icono de luna (modo oscuro) */}
        <svg
          className={`
            absolute inset-0 w-6 h-6 transition-all duration-500 transform
            ${isDark 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 -rotate-180 scale-50'
            }
          `}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      </div>

      {/* Tooltip */}
      <div 
        className={`
          absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium
          rounded-md whitespace-nowrap pointer-events-none transition-all duration-200
          ${isDark 
            ? 'bg-gray-800 text-white' 
            : 'bg-gray-900 text-white'
          }
          opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0
        `}
      >
        {isDark ? 'Modo claro' : 'Modo oscuro'}
        <div 
          className={`
            absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent
            ${isDark ? 'border-t-gray-800' : 'border-t-gray-900'}
          `}
        />
      </div>
    </button>
  );
};

export default ThemeToggle;
