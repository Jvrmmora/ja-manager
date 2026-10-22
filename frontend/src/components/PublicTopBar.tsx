import React from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import logo from '../assets/logos/logo.png';

interface PublicTopBarProps {
  /** Contenido extra a la derecha, antes del ThemeToggle. */
  right?: React.ReactNode;
  className?: string;
}

/**
 * Barra superior estándar de las vistas públicas y de autenticación: mismo
 * ancho y márgenes que la landing (logo + nombre → "/", ThemeToggle).
 */
const PublicTopBar: React.FC<PublicTopBarProps> = ({ right, className = '' }) => {
  const navigate = useNavigate();

  return (
    <div
      className={`z-50 flex-shrink-0 border-b border-sand-200 bg-white dark:border-white/10 dark:bg-ink-950 ${className}`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/')}
          className="group flex items-center gap-3"
          aria-label="Volver al inicio"
        >
          <img
            src={logo}
            alt="JA Modelia"
            className="h-9 w-9 object-contain transition-transform group-hover:scale-110"
          />
          <span className="font-display text-lg font-semibold tracking-wide text-cocoa-900 transition-colors group-hover:text-brand-deep dark:text-white dark:group-hover:text-brand-amber">
            Jóvenes Modelia Bogotá
          </span>
        </button>
        <div className="flex items-center gap-2">
          {right}
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
};

export default PublicTopBar;
