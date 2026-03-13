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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-gray-900 dark:via-blue-950 dark:to-gray-900">
        <div className="text-center px-4">
          <div className="relative mb-6 inline-block">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl animate-pulse" />
            <img
              src={logo}
              alt="Jóvenes Modelia Bogotá"
              className="w-24 h-24 object-contain relative z-10 drop-shadow-2xl"
            />
          </div>
          <h1 className="text-white text-2xl font-bold mb-1">
            Jóvenes Modelia Bogotá
          </h1>
          <p className="text-blue-200 text-sm mb-8">Encendidos por Cristo</p>
          <div className="flex justify-center">
            <LoadingSpinner size="lg" className="text-white/80" />
          </div>
        </div>
      </div>
    </div>
  );
}
