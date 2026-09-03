import { useEffect, useState } from 'react';
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

export default function Navbar({ onOpenContact }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('about');
  const [userInfo, setUserInfo] = useState(() => authService.getUserInfo());
  const navigate = useNavigate();

  const isAuthenticated = authService.isAuthenticated() && !!userInfo;
  const homePath =
    userInfo?.role_name === 'Young role' ? '/dashboard' : '/admin';

  useEffect(() => {
    const refreshUser = () => setUserInfo(authService.getUserInfo());
    window.addEventListener('userInfoUpdated', refreshUser);
    window.addEventListener('storage', refreshUser);
    return () => {
      window.removeEventListener('userInfoUpdated', refreshUser);
      window.removeEventListener('storage', refreshUser);
    };
  }, []);

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

  const profileButton = (fullWidth = false) => (
    <button
      onClick={() => {
        navigate(homePath);
        setIsMenuOpen(false);
      }}
      className={`inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
        fullWidth ? 'w-full justify-center px-4 py-2.5' : 'pl-1.5 pr-3 py-1.5'
      }`}
      aria-label="Ir a mi panel"
    >
      <span className="h-8 w-8 flex-shrink-0 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
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
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate max-w-[120px]">
        {getFirstName(userInfo?.fullName)}
      </span>
    </button>
  );

  return (
    <nav className="sticky top-0 z-50 bg-white/98 dark:bg-gray-900/98 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-700/60 shadow-[0_2px_15px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_15px_rgba(0,0,0,0.3)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-2">
          {/* Logo + Brand */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 hover:opacity-90 transition-opacity duration-200 flex-shrink-0 min-w-0"
          >
            <img
              src={logo}
              alt="JA Modelia Bogotá"
              className="h-10 w-10 object-contain flex-shrink-0"
            />
            <span className="font-bold text-gray-900 dark:text-white text-base hidden sm:inline lg:hidden xl:inline leading-tight truncate">
              Jóvenes Modelia Bogotá
            </span>
          </button>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-0.5">
            {NAV_ITEMS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeSection === id
                    ? 'text-blue-700 dark:text-blue-300 bg-gradient-to-b from-blue-50 to-blue-100/50 dark:from-blue-900/40 dark:to-blue-800/20 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {onOpenContact && (
              <button
                onClick={onOpenContact}
                className="hidden lg:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-lg transition-all transform hover:scale-105 shadow-md hover:shadow-lg"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Contacto
              </button>
            )}

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
              aria-label="Cambiar tema"
            >
              {theme === 'dark' ? (
                <svg
                  className="w-5 h-5 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            {isAuthenticated ? (
              <div className="hidden sm:block">{profileButton()}</div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Ingresar
              </button>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
              aria-label="Abrir menú"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-3 space-y-1">
          {NAV_ITEMS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollToSection(id)}
              className={`block w-full text-left px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                activeSection === id
                  ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-200/70 dark:ring-blue-700/60'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {label}
            </button>
          ))}
          <div className="pt-2 pb-1 border-t border-gray-100 dark:border-gray-800 space-y-2">
            {onOpenContact && (
              <button
                onClick={() => {
                  onOpenContact();
                  setIsMenuOpen(false);
                }}
                className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-lg transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Contacto
              </button>
            )}
            {isAuthenticated ? (
              profileButton(true)
            ) : (
              <button
                onClick={() => {
                  navigate('/login');
                  setIsMenuOpen(false);
                }}
                className="w-full px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Ingresar
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
