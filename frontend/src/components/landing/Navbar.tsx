import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';
import logo from '../../assets/logos/logo.png';

const NAV_ITEMS = [
  { id: 'about', label: 'Quiénes Somos' },
  { id: 'meetings', label: 'Reuniones' },
  { id: 'events', label: 'Eventos' },
  { id: 'gallery', label: 'Galería' },
  { id: 'resources', label: 'Recursos' },
  { id: 'testimonials', label: 'Testimonios' },
  { id: 'location', label: 'Ubicación' },
];

interface NavbarProps {
  onOpenContact?: () => void;
  // Sin hero oscuro debajo, la barra debe ser sólida desde el inicio.
  overHero?: boolean;
}

const getFirstName = (fullName?: string) => {
  if (!fullName) {
    return 'Mi cuenta';
  }
  return fullName.trim().split(/\s+/)[0];
};

const getInitials = (fullName?: string) => {
  if (!fullName) {
    return 'U';
  }
  return fullName
    .trim()
    .split(/\s+/)
    .map(part => part.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

const ThemeIcon = ({ dark }: { dark: boolean }) =>
  dark ? (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  ) : (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );

const Wordmark = () => (
  <span className="flex flex-col leading-none text-left">
    <span className="font-display text-[11px] tracking-[0.28em] text-white/65">
      JÓVENES
    </span>
    <span className="font-display text-xl font-semibold tracking-[0.04em] text-white">
      MODELIA
    </span>
  </span>
);

export default function Navbar({ onOpenContact, overHero = true }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('about');
  const [userInfo, setUserInfo] = useState(() => authService.getUserInfo());
  const navigate = useNavigate();

  const isAuthenticated = authService.isAuthenticated() && !!userInfo;
  const homePath =
    userInfo?.role_name === 'Young role' ? '/dashboard' : '/admin';
  const solid = isScrolled || !overHero;

  useEffect(() => {
    const refreshUser = () => setUserInfo(authService.getUserInfo());
    window.addEventListener('userInfoUpdated', refreshUser);
    window.addEventListener('storage', refreshUser);
    return () => {
      window.removeEventListener('userInfoUpdated', refreshUser);
      window.removeEventListener('storage', refreshUser);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [isMenuOpen]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
      window.history.replaceState(null, '', `#${id}`);
    }
    setIsMenuOpen(false);
  };

  // Deep-link: si la URL trae un hash al cargar, ir a esa sección.
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash || !NAV_ITEMS.some(item => item.id === hash)) {
      return;
    }
    const timer = window.setTimeout(() => {
      const element = document.getElementById(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'auto' });
        setActiveSection(hash);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const sections = NAV_ITEMS.map(item =>
      document.getElementById(item.id)
    ).filter(Boolean) as HTMLElement[];

    if (sections.length === 0) {
      return;
    }

    const updateActiveSection = () => {
      const scrollAnchor = window.scrollY + window.innerHeight * 0.35;
      let currentSection = sections[0].id;

      for (const section of sections) {
        if (scrollAnchor >= section.offsetTop - 120) {
          currentSection = section.id;
        }
      }

      setActiveSection(prev => {
        if (prev === currentSection) {
          return prev;
        }
        // Reflejar la sección visible en la URL para poder compartir el enlace.
        // Evitamos ensuciar la URL con la primera sección cuando aún estamos arriba.
        if (window.scrollY > 4 || currentSection !== sections[0].id) {
          window.history.replaceState(null, '', `#${currentSection}`);
        } else {
          window.history.replaceState(
            null,
            '',
            window.location.pathname + window.location.search
          );
        }
        return currentSection;
      });
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, []);

  const avatar = (
    <span className="h-8 w-8 flex-shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-brand-amber to-brand-wine flex items-center justify-center">
      {userInfo?.profileImage ? (
        <img
          src={userInfo.profileImage}
          alt={userInfo.fullName || 'Perfil'}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-white font-semibold text-xs">
          {getInitials(userInfo?.fullName)}
        </span>
      )}
    </span>
  );

  // Sobre el hero ningún enlace se marca como activo.
  const showActive = isScrolled;

  return (
    <>
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300 ${
          solid
            ? 'bg-ink-950/85 backdrop-blur-md border-b border-white/10 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-[72px] lg:h-[84px] gap-3">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-3 flex-shrink-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
              aria-label="Ir al inicio"
            >
              <img
                src={logo}
                alt="Jóvenes Modelia Bogotá"
                className="h-10 w-10 lg:h-11 lg:w-11 object-contain flex-shrink-0"
              />
              <Wordmark />
            </button>

            <div className="hidden lg:flex items-center gap-1 xl:gap-2">
              {NAV_ITEMS.map(({ id, label }) => {
                const active = showActive && activeSection === id;
                return (
                  <button
                    key={id}
                    onClick={() => scrollToSection(id)}
                    className={`relative px-2.5 py-2 text-sm font-medium transition-colors ${
                      active ? 'text-white' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {label}
                    {active && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute left-2.5 right-2.5 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-brand-amber to-brand-red"
                      />
                    )}
                  </button>
                );
              })}
              {onOpenContact && (
                <button
                  onClick={onOpenContact}
                  className="px-2.5 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
                >
                  Contacto
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={toggleTheme}
                className="hidden sm:flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition-colors"
                aria-label="Cambiar tema"
              >
                <ThemeIcon dark={theme === 'dark'} />
              </button>

              {isAuthenticated ? (
                <button
                  onClick={() => navigate(homePath)}
                  className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/20 pl-1.5 pr-3.5 py-1.5 text-sm font-semibold text-white hover:border-white/40 transition-colors"
                  aria-label="Ir a mi panel"
                >
                  {avatar}
                  <span className="truncate max-w-[120px]">
                    {getFirstName(userInfo?.fullName)}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="hidden sm:inline-flex px-2 text-sm font-semibold text-white/75 hover:text-white transition-colors"
                >
                  Ingresar
                </button>
              )}

              <button
                onClick={() => navigate('/register')}
                className="btn-fire h-11 px-5 text-sm"
              >
                Únete
              </button>

              <button
                onClick={() => setIsMenuOpen(true)}
                className="lg:hidden flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white"
                aria-label="Abrir menú"
                aria-expanded={isMenuOpen}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                  <path d="M4 7h16M4 12h16M10 17h10" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            key="mobile-menu"
            className="fixed inset-0 z-[60] lg:hidden bg-ink-950 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
          >
            <div className="pointer-events-none absolute -right-64 -bottom-48 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(220,51,64,.35)_0%,rgba(20,11,16,0)_65%)]" />
            <div className="relative flex min-h-full flex-col px-6">
              <div className="flex h-[72px] items-center justify-between">
                <span className="flex items-center gap-3">
                  <img src={logo} alt="" className="h-10 w-10 object-contain" />
                  <Wordmark />
                </span>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white"
                  aria-label="Cerrar menú"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              <motion.ul
                className="flex flex-col gap-1 pt-6"
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
              >
                {NAV_ITEMS.map(({ id, label }) => (
                  <motion.li
                    key={id}
                    variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } }}
                  >
                    <button
                      onClick={() => scrollToSection(id)}
                      className={`flex items-center gap-3 font-display text-[32px] font-semibold uppercase leading-[1.15] transition-colors ${
                        activeSection === id ? 'text-brand-amber' : 'text-white hover:text-brand-amber'
                      }`}
                    >
                      {label}
                      {activeSection === id && (
                        <span className="h-2 w-2 rounded-full bg-brand-amber" />
                      )}
                    </button>
                  </motion.li>
                ))}
              </motion.ul>

              <motion.div
                className="mt-auto flex flex-col gap-3 py-8"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
              >
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate('/register');
                  }}
                  className="btn-fire h-14 text-base"
                >
                  Únete a nosotros
                </button>
                <div className="grid grid-cols-2 gap-2.5">
                  {isAuthenticated ? (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate(homePath);
                      }}
                      className="btn-outline-light h-12 text-[15px]"
                    >
                      {avatar}
                      <span className="truncate">{getFirstName(userInfo?.fullName)}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate('/login');
                      }}
                      className="btn-outline-light h-12 text-[15px]"
                    >
                      Ingresar
                    </button>
                  )}
                  {onOpenContact ? (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenContact();
                      }}
                      className="btn-outline-light h-12 text-[15px]"
                    >
                      Contacto
                    </button>
                  ) : null}
                </div>
                <button
                  onClick={toggleTheme}
                  className="btn-outline-light h-12 text-[15px]"
                >
                  <ThemeIcon dark={theme === 'dark'} />
                  {theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
