import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../../ThemeToggle';
import { authService } from '../../../services/auth';
import logo from '../../../assets/logos/logo.png';

interface AdminFormsHeaderProps {
  backTo: string;
  backLabel: string;
  right?: React.ReactNode;
}

/** Los jóvenes no administran formularios: los mandamos a su panel. */
export const useAdminOnly = () => {
  const navigate = useNavigate();
  useEffect(() => {
    if (authService.getUserInfo()?.role_name === 'Young role') navigate('/dashboard', { replace: true });
  }, [navigate]);
};

/** Encabezado de las páginas de formularios del admin (mismo estilo que /admin). */
const AdminFormsHeader: React.FC<AdminFormsHeaderProps> = ({ backTo, backLabel, right }) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-sand-200 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-ink-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(backTo)}
            aria-label={backLabel}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-sand-300 text-cocoa-600 transition-colors hover:border-cocoa-400 dark:border-white/15 dark:text-white/80"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
          </button>
          <img src={logo} alt="" className="hidden h-9 w-9 object-contain sm:block" />
          <span className="hidden h-6 items-center rounded-full bg-ink-950 px-2.5 font-display text-[11px] tracking-[0.18em] text-brand-amber sm:inline-flex dark:bg-white/10">
            FORMULARIOS
          </span>
        </div>
        <div className="flex items-center gap-2">
          {right}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default AdminFormsHeader;
