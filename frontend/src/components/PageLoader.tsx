import { useTheme } from '../context/ThemeContext';
import LoadingSpinner from './LoadingSpinner';
import logo from '../assets/logos/logo.png';

/**
 * Branded full-screen loading splash.
 * Use this as the Suspense fallback and any top-level loading state,
 * so every route gets the same professional loading experience.
 */
export default function PageLoader() {
  const { theme } = useTheme();

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="relative overflow-hidden min-h-screen flex items-center justify-center bg-ink-950">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(242,106,46,.28)_0%,rgba(138,28,69,.14)_40%,rgba(20,11,16,0)_68%)] motion-safe:animate-pulse" />
        <div className="relative text-center px-4">
          <div className="relative mb-6 inline-block">
            <div className="absolute inset-0 bg-brand-orange/30 rounded-full blur-2xl motion-safe:animate-pulse" />
            <img
              src={logo}
              alt="Jóvenes Modelia Bogotá"
              className="w-24 h-24 object-contain relative z-10 drop-shadow-2xl"
            />
          </div>
          <h1 className="font-display uppercase tracking-wide text-white text-3xl font-semibold mb-1">
            Jóvenes Modelia Bogotá
          </h1>
          <p className="text-brand-amber text-sm mb-8">Encendidos por Cristo</p>
          <div className="flex justify-center">
            <LoadingSpinner size="lg" className="text-white/80" />
          </div>
        </div>
      </div>
    </div>
  );
}
