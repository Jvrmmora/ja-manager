import { useEffect, useMemo, useState } from 'react';

interface FooterProps {
  addressLabel?: string;
  social?: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
  };
  visitorYear?: number;
  visitorNumber?: number | null;
  uniqueVisitorsCount?: number;
}

const quickLinks = [
  { id: 'about', label: 'Quiénes Somos' },
  { id: 'meetings', label: 'Reuniones' },
  { id: 'location', label: 'Contacto' },
];

const getValidUrl = (url?: string) => {
  if (!url || url === '#') {
    return null;
  }
  return url;
};

const formatVisitorNumber = (value?: number | null): string | null => {
  if (!value || value < 1) {
    return null;
  }

  return new Intl.NumberFormat('es-CO').format(value);
};

export default function Footer({
  addressLabel,
  social,
  visitorNumber,
  uniqueVisitorsCount,
}: FooterProps) {
  const currentYear = new Date().getFullYear();
  const displayVisitCountValue =
    (typeof uniqueVisitorsCount === 'number' && uniqueVisitorsCount > 0
      ? uniqueVisitorsCount
      : null) ||
    (typeof visitorNumber === 'number' && visitorNumber > 0
      ? visitorNumber
      : 0);
  const [animatedCount, setAnimatedCount] = useState(0);

  useEffect(() => {
    if (!displayVisitCountValue) {
      return;
    }

    const duration = 900;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(displayVisitCountValue * eased);
      setAnimatedCount(nextValue);

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    const rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [displayVisitCountValue]);

  const formattedAnimatedCount = useMemo(
    () => formatVisitorNumber(animatedCount),
    [animatedCount]
  );

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const socialLinks = [
    {
      name: 'Instagram',
      href: getValidUrl(social?.instagram),
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.266.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.226 1.660-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 100-8 4 4 0 000 8zm4.965-10.322a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z" />
        </svg>
      ),
    },
    {
      name: 'Facebook',
      href: getValidUrl(social?.facebook),
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      name: 'YouTube',
      href: getValidUrl(social?.youtube),
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* About */}
          <div>
            <h3 className="text-white font-bold mb-4">Jóvenes Modelia</h3>
            <p className="text-sm text-gray-400">
              Un movimiento de jóvenes apasionados por servir a Dios y
              transformar el mundo.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold mb-4">Enlaces</h3>
            <ul className="text-sm space-y-2">
              {quickLinks.map(link => (
                <li key={link.id}>
                  <button
                    onClick={() => scrollToSection(link.id)}
                    className="hover:text-blue-400 transition"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-bold mb-4">Ubicación</h3>
            <p className="text-sm text-gray-400 inline-flex items-center gap-2">
              <svg
                className="w-4 h-4 text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
              {addressLabel || 'Cra. 72C #23d-44, Bogota'}
            </p>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-white font-bold mb-4">Síguenos</h3>
            <div className="flex gap-4">
              {socialLinks
                .filter(link => Boolean(link.href))
                .map(link => (
                  <a
                    key={link.name}
                    href={link.href || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-400 transition"
                    aria-label={link.name}
                  >
                    {link.icon}
                  </a>
                ))}
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-gray-700 my-8"></div>

        {displayVisitCountValue > 0 && (
          <div className="mb-8 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-white/[0.04] px-4 py-2 text-sm text-blue-100/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm">
              <svg
                className="h-4 w-4 text-blue-300/80"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.458 12C3.732 7.943 7.522 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.478 0-8.268-2.943-9.542-7z"
                />
                <circle cx="12" cy="12" r="3" />
              </svg>

              <p className="tracking-wide">
                Visitas actuales: {formattedAnimatedCount || '0'}
              </p>
            </div>
          </div>
        )}

        {/* Copyright */}
        <div className="text-center text-sm text-gray-400">
          <p>
            &copy; {currentYear} Jóvenes Adventistas Modelia Bogotá. Todos los
            derechos reservados.
          </p>
          <p className="mt-2">"Encendidos por Cristo"</p>
        </div>
      </div>
    </footer>
  );
}
