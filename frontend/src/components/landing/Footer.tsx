import { useEffect, useMemo, useState } from 'react';
import { normalizeWhatsAppUrl } from '../../utils/whatsapp';
import PrivacyPolicyModal from '../privacy/PrivacyPolicyModal';
import logo from '../../assets/logos/logo.png';

interface FooterProps {
  addressLabel?: string;
  social?: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    whatsapp?: string;
  };
  visitorYear?: number;
  visitorNumber?: number | null;
  uniqueVisitorsCount?: number;
  onOpenContact?: () => void;
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
  onOpenContact,
}: FooterProps) {
  const currentYear = new Date().getFullYear();
  const [showPolicy, setShowPolicy] = useState(false);
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
    {
      name: 'WhatsApp',
      href: social?.whatsapp ? normalizeWhatsAppUrl(social.whatsapp) : null,
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 448 512">
          <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32C101.3 32 1.4 131.9 1.4 254.5c0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 69 27 106.1 27h.1c122.6 0 222.5-99.9 222.5-222.5c0-59.3-25.2-115-65.5-156.5zM223.9 438.6h-.1c-33.2 0-65.7-8.9-94-25.7l-6.7-4l-69.8 18.3l18.7-68.1l-4.3-7c-18.5-29.4-28.2-63.4-28.2-98.6c0-101.7 82.8-184.5 184.6-184.5c49.3 0 95.6 19.2 130.4 54.1c34.8 34.9 56.2 81.2 56.1 130.5c0 101.8-84.9 184.5-186.7 184.5zm101-138.2c-5.5-2.8-32.8-16.1-37.9-17.9c-5.1-1.9-8.8-2.8-12.5 2.8s-14.3 17.9-17.6 21.6c-3.2 3.7-6.5 4.2-12 1.4c-32.6-16.3-54-29.1-75.5-66c-5.7-9.8 5.7-9.1 16.3-30.3c1.8-3.7.9-6.9-.5-9.7c-1.4-2.8-12.5-30.1-17.1-41.3c-4.5-10.8-9.1-9.3-12.5-9.5c-3.2-.2-6.9-.2-10.6-.2s-9.7 1.4-14.8 6.9c-5.1 5.6-19.4 19-19.4 46.3c0 27.3 19.9 53.7 22.6 57.4c2.8 3.7 39.1 59.7 94.8 83.8c35.2 15.2 49 16.5 66.6 14c10.7-1.6 32.8-13.4 37.4-26.3c4.6-12.9 4.6-23.9 3.2-26.3c-1.3-2.5-5-3.9-10.5-6.6z" />
        </svg>
      ),
    },
  ];

  return (
    <footer className="relative overflow-hidden bg-ink-950 text-white/70">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(138,28,69,.25)_0%,rgba(20,11,16,0)_65%)]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-20">
        <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] gap-10 md:gap-12">
          <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
            <span className="flex items-center gap-3">
              <img src={logo} alt="Jóvenes Modelia" className="h-12 w-12 object-contain" />
              <span className="font-display text-2xl font-semibold tracking-[0.04em] text-white">
                JÓVENES MODELIA
              </span>
            </span>
            <p className="max-w-sm text-[15px] leading-relaxed">
              Un movimiento de jóvenes apasionados por servir a Dios y
              transformar el mundo.
            </p>
          </div>

          <div className="flex flex-col gap-3 text-[15px]">
            <h3 className="eyebrow text-[13px] text-brand-amber">Explora</h3>
            {quickLinks.map(link => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="text-left hover:text-white transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 text-[15px]">
            <h3 className="eyebrow text-[13px] text-brand-amber">Ubicación</h3>
            <p className="flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-amber" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {addressLabel || 'Cra. 72C #23d-44, Bogota'}
            </p>
            {onOpenContact && (
              <button
                onClick={onOpenContact}
                className="text-left font-semibold text-white hover:text-brand-amber transition-colors"
              >
                Contáctanos →
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 text-[15px]">
            <h3 className="eyebrow text-[13px] text-brand-amber">Síguenos</h3>
            <div className="flex flex-wrap gap-2.5">
              {socialLinks
                .filter(link => Boolean(link.href))
                .map(link => (
                  <a
                    key={link.name}
                    href={link.href || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white/80 hover:border-brand-amber hover:text-brand-amber transition-colors"
                    aria-label={link.name}
                  >
                    {link.icon}
                  </a>
                ))}
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col-reverse gap-4 border-t border-white/10 py-7 text-[13px] text-white/50 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
            <span>
              &copy; {currentYear} Jóvenes Adventistas Modelia Bogotá. Todos
              los derechos reservados.
            </span>
            <button
              type="button"
              onClick={() => setShowPolicy(true)}
              className="text-left hover:text-white underline-offset-2 hover:underline transition-colors"
            >
              Política de Privacidad
            </button>
          </div>
          {displayVisitCountValue > 0 && (
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-amber" />
              Visitas actuales: {formattedAnimatedCount || '0'}
            </span>
          )}
        </div>
      </div>

      <PrivacyPolicyModal
        open={showPolicy}
        onClose={() => setShowPolicy(false)}
      />
    </footer>
  );
}
