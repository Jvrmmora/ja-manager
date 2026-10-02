import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { getElementCenter } from '../utils/elementCenter';
import ThemeMorphIcon from './ThemeMorphIcon';

const ThemeToggle: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={event => toggleTheme(getElementCenter(event.currentTarget))}
      type="button"
      className={`relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange ${
        isDark
          ? 'border-white/15 bg-ink-800 text-brand-amber hover:border-white/40'
          : 'border-sand-300 bg-white text-cocoa-600 hover:border-cocoa-400'
      }`}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      <ThemeMorphIcon dark={isDark} />
    </button>
  );
};

export default ThemeToggle;
