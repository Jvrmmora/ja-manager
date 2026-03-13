import { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
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

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('about');
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
    }
    setIsMenuOpen(false);
  };

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

      setActiveSection(prev =>
        prev === currentSection ? prev : currentSection
      );
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm border-b border-gray-200/80 dark:border-gray-700/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo + Brand */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <img
              src={logo}
              alt="JA Modelia Bogotá"
              className="h-9 w-9 object-contain flex-shrink-0"
            />
            <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base leading-snug">
              Jóvenes Modelia Bogotá
            </span>
          </button>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className={`px-3.5 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                  activeSection === id
                    ? 'text-blue-700 dark:text-blue-300 bg-gradient-to-b from-blue-50 to-blue-100/70 dark:from-blue-900/35 dark:to-blue-800/30 ring-1 ring-blue-200/80 dark:ring-blue-700/70 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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

            <button
              onClick={() => navigate('/login')}
              className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
            >
              Ingresar
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 space-y-1">
          {NAV_ITEMS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollToSection(id)}
              className={`block w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activeSection === id
                  ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-200/70 dark:ring-blue-700/60'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {label}
            </button>
          ))}
          <div className="pt-2 pb-1 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => navigate('/login')}
              className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Ingresar
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
