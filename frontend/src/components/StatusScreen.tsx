import React from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import logo from '../assets/logos/logo.png';

interface StatusScreenProps {
  /** Texto grande con degradado de fuego ("404", "¡Ups!"). Sin él se muestra el logo. */
  code?: string;
  eyebrow: string;
  title: string;
  description: React.ReactNode;
  /** Botones (usa statusPrimaryBtn / statusSecondaryBtn). */
  actions: React.ReactNode;
  verse?: { text: string; reference: string };
}

export const statusPrimaryBtn = 'btn-fire h-12 px-6 text-[15px]';
export const statusSecondaryBtn =
  'inline-flex h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-sand-300 px-6 text-[15px] font-semibold text-cocoa-700 transition-colors hover:border-cocoa-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/25 dark:border-white/20 dark:text-white dark:hover:border-white/50';

/**
 * Pantalla completa para estados sin contenido: 404, errores inesperados o
 * vistas que no pudieron cargar. Misma barra superior y estilo que el login.
 */
const StatusScreen: React.FC<StatusScreenProps> = ({
  code,
  eyebrow,
  title,
  description,
  actions,
  verse,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-cream dark:bg-ink-950">
      <div className="z-10 flex-shrink-0 border-b border-sand-200 bg-white dark:border-white/10 dark:bg-ink-950">
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

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-14 sm:px-6">
        {/* Capa externa centra; la interna anima (animate-ember usa transform) */}
        <div className="pointer-events-none absolute left-1/2 top-[38%] h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2">
          <div className="h-full w-full rounded-full bg-[radial-gradient(circle,rgba(242,106,46,.22)_0%,rgba(138,28,69,.10)_42%,rgba(255,248,241,0)_68%)] motion-safe:animate-ember dark:bg-[radial-gradient(circle,rgba(242,106,46,.34)_0%,rgba(138,28,69,.18)_40%,rgba(20,11,16,0)_68%)]" />
        </div>

        <div className="relative flex w-full max-w-xl flex-col items-center text-center">
          <span className="font-display text-[13px] uppercase tracking-[0.24em] text-brand-deep dark:text-brand-amber">
            {eyebrow}
          </span>

          {code ? (
            <span
              className="text-fire mt-2 select-none font-display text-[112px] font-bold leading-[0.9] sm:text-[168px]"
              aria-hidden="true"
            >
              {code}
            </span>
          ) : (
            <span className="mt-5 flex h-28 w-28 items-center justify-center rounded-[32px] border border-sand-200 bg-white shadow-[0_24px_60px_-28px_rgba(242,106,46,0.7)] dark:border-white/10 dark:bg-white/[0.06]">
              <img src={logo} alt="" className="h-16 w-16 object-contain motion-safe:animate-float" />
            </span>
          )}

          <h1 className="m-0 mt-4 font-display text-[32px] font-bold uppercase leading-none text-cocoa-900 sm:text-[42px] dark:text-white">
            {title}
          </h1>
          <div className="mt-3 max-w-md text-[15px] leading-relaxed text-cocoa-500 dark:text-white/65">
            {description}
          </div>

          <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row">
            {actions}
          </div>

          {verse && (
            <figure className="m-0 mt-12 flex max-w-sm flex-col items-center gap-2">
              <blockquote className="m-0 text-sm italic leading-relaxed text-cocoa-500 dark:text-white/60">
                “{verse.text}”
              </blockquote>
              <figcaption className="font-display text-xs uppercase tracking-[0.16em] text-brand-deep dark:text-brand-amber">
                {verse.reference}
              </figcaption>
            </figure>
          )}
        </div>
      </main>
    </div>
  );
};

export default StatusScreen;
