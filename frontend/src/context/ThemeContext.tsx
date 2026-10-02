import React, { createContext, useContext, useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import type { ReactNode } from 'react';

type Theme = 'light' | 'dark';
// 'auto' = seguir la hora del día del cliente; 'light'/'dark' = elección manual.
type ThemeMode = 'auto' | 'light' | 'dark';

/** Punto (en px de viewport) desde donde nace la revelación circular. */
export interface ThemeToggleOrigin {
  x: number;
  y: number;
}

const REVEAL_DURATION_MS = 500;

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  toggleTheme: (origin?: ThemeToggleOrigin) => void;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

// Horario diurno: 07:00 – 18:59 => claro. El resto => oscuro.
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 19;

const resolveAutoTheme = (): Theme => {
  const hour = new Date().getHours();
  return hour >= DAY_START_HOUR && hour < DAY_END_HOUR ? 'light' : 'dark';
};

const getInitialMode = (): ThemeMode => {
  try {
    const savedMode = localStorage.getItem('themeMode') as ThemeMode | null;
    if (savedMode === 'auto' || savedMode === 'light' || savedMode === 'dark') {
      return savedMode;
    }

    // Migración: si existía una elección previa en 'theme', respetarla como manual.
    const legacyTheme = localStorage.getItem('theme') as Theme | null;
    if (legacyTheme === 'light' || legacyTheme === 'dark') {
      return legacyTheme;
    }
  } catch {
    // localStorage no disponible (modo privado, etc.)
  }

  // Sin preferencia previa: automático por hora del día.
  return 'auto';
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getInitialMode);
  const [theme, setTheme] = useState<Theme>(() =>
    getInitialMode() === 'auto'
      ? resolveAutoTheme()
      : (getInitialMode() as Theme)
  );

  // Aplicar el tema efectivo al <html> y persistir la preferencia.
  useEffect(() => {
    try {
      localStorage.setItem('themeMode', themeMode);
      // Mantener 'theme' sincronizado por compatibilidad con lecturas antiguas.
      localStorage.setItem('theme', theme);
    } catch {
      // ignorar
    }

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, themeMode]);

  // En modo automático, re-evaluar el tema según avanza el día del cliente.
  useEffect(() => {
    if (themeMode !== 'auto') {
      return;
    }

    const syncAuto = () => setTheme(resolveAutoTheme());
    syncAuto();

    const interval = window.setInterval(syncAuto, 10 * 60 * 1000); // cada 10 min
    const onVisibility = () => {
      if (!document.hidden) {
        syncAuto();
      }
    };
    window.addEventListener('focus', syncAuto);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', syncAuto);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [themeMode]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    if (mode !== 'auto') {
      setTheme(mode);
    } else {
      setTheme(resolveAutoTheme());
    }
  };

  // El toggle fija una elección manual opuesta al tema visible actual. Con
  // `origin` (centro del botón pulsado) el cambio se anima en toda la página.
  const toggleTheme = (origin?: ThemeToggleOrigin) => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';

    const canAnimate =
      typeof origin?.x === 'number' &&
      typeof document.startViewTransition === 'function' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!origin || !canAnimate) {
      setThemeMode(next);
      return;
    }

    // Radio hasta la esquina más lejana: garantiza que el círculo cubra todo.
    const endRadius = Math.hypot(
      Math.max(origin.x, window.innerWidth - origin.x),
      Math.max(origin.y, window.innerHeight - origin.y)
    );

    const transition = document.startViewTransition(() => {
      // La clase se aplica ya mismo: el snapshot "nuevo" se toma al terminar
      // este callback y el efecto que sincroniza <html> corre después.
      document.documentElement.classList.toggle('dark', next === 'dark');
      flushSync(() => setThemeMode(next));
    });

    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${origin.x}px ${origin.y}px)`,
              `circle(${endRadius}px at ${origin.x}px ${origin.y}px)`,
            ],
          },
          {
            duration: REVEAL_DURATION_MS,
            easing: 'ease-in-out',
            pseudoElement: '::view-transition-new(root)',
          }
        );
      })
      .catch(() => {
        // transición omitida/cancelada: el tema ya cambió igualmente
      });
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider
      value={{ theme, themeMode, toggleTheme, setThemeMode, isDark }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
