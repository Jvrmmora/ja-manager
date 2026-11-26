import React from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../ThemeToggle';
import logo from '../../assets/logos/logo.png';

interface AuthShellProps {
  /** Línea pequeña sobre el título del panel oscuro ("Recupera tu acceso a") */
  kicker: string;
  /** Título grande con degradado ("JA Manager") */
  title: string;
  description: string;
  children: React.ReactNode;
}

const Verse: React.FC<{ compact: boolean }> = ({ compact }) => (
  <figure
    className={`m-0 flex w-full flex-col items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.05] text-center ${
      compact ? 'px-5 py-5' : 'px-8 py-7'
    }`}
  >
    <span className="text-fire -mb-6 font-display text-6xl leading-none" aria-hidden="true">
      “
    </span>
    <blockquote
      className={`m-0 italic leading-relaxed text-white/90 ${compact ? 'text-sm' : 'text-base'}`}
    >
      Esfuérzate y sé valiente. No temas ni desmayes, porque el Señor tu Dios
      estará contigo dondequiera que vayas.
    </blockquote>
    <figcaption className="font-display text-[13px] uppercase tracking-[0.16em] text-brand-amber">
      Josué 1:9
    </figcaption>
  </figure>
);

/**
 * Marco de las pantallas de acceso (mismo ancho y márgenes que el login): barra
 * superior con logo y tema, panel oscuro con brasas y versículo, y el área del
 * formulario a la derecha (en móvil, franja oscura arriba y tarjeta debajo).
 */
const AuthShell: React.FC<AuthShellProps> = ({
  kicker,
  title,
  description,
  children,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-cream dark:bg-ink-950">
      <div className="z-50 flex-shrink-0 border-b border-sand-200 bg-white dark:border-white/10 dark:bg-ink-950">
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
          <ThemeToggle />
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="relative flex items-center justify-center overflow-hidden bg-ink-950 px-6 pb-14 pt-10 lg:w-[44%] lg:p-16">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(242,106,46,.34)_0%,rgba(138,28,69,.18)_40%,rgba(20,11,16,0)_68%)] motion-safe:animate-ember" />
          <div className="relative flex w-full max-w-md flex-col items-center gap-5 text-center lg:gap-6">
            <h1 className="m-0 flex flex-col items-center gap-1 font-display font-bold uppercase">
              <span className="text-[22px] font-medium tracking-wide text-white/85 lg:text-[34px]">
                {kicker}
              </span>
              <span className="text-fire text-[52px] leading-[0.95] lg:text-[76px]">
                {title}
              </span>
            </h1>
            <p className="m-0 text-[15px] leading-relaxed text-white/75 lg:text-[17px]">
              {description}
            </p>
            <div className="hidden w-full pt-2 lg:block">
              <Verse compact={false} />
            </div>
          </div>
        </aside>

        <div className="flex flex-1 items-start justify-center px-4 pb-10 sm:px-6 lg:items-center lg:px-12 lg:py-12">
          <div className="relative -mt-6 w-full max-w-md lg:mt-0">
            {children}

            <div className="mt-6 rounded-[22px] bg-ink-950 p-1 lg:hidden">
              <Verse compact />
            </div>
            <p className="mt-6 text-center text-xs text-cocoa-500 dark:text-white/45">
              Sistema de Gestión de Jóvenes © {new Date().getFullYear()} by
              Jamomodev
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
