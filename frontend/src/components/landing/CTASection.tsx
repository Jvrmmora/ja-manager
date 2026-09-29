import { useNavigate } from 'react-router-dom';
import { normalizeRichTextHtml } from '../../utils/richText';
import { normalizeWhatsAppUrl } from '../../utils/whatsapp';
import logo from '../../assets/logos/logo.png';
import Reveal from './ui/Reveal';

interface CTASectionProps {
  title?: string;
  body?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  whatsappUrl?: string;
  onOpenContact?: () => void;
}

export default function CTASection({
  title,
  body,
  primaryLabel,
  secondaryLabel,
  whatsappUrl,
  onOpenContact,
}: CTASectionProps) {
  const navigate = useNavigate();
  const finalWhatsAppUrl = normalizeWhatsAppUrl(whatsappUrl);

  return (
    <section className="px-4 sm:px-6 lg:px-8 bg-[linear-gradient(180deg,#FFF8F1_0%,#FFF8F1_50%,#140B10_50%,#140B10_100%)] dark:bg-[linear-gradient(180deg,#1E1218_0%,#1E1218_50%,#140B10_50%,#140B10_100%)]">
      <Reveal className="max-w-7xl mx-auto">
        <div className="bg-fire-bright relative overflow-hidden rounded-[32px] md:rounded-[40px] px-7 py-12 md:px-20 md:py-20 flex flex-col gap-6">
          <img
            src={logo}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-10 w-72 md:right-10 md:-top-6 md:w-[440px] opacity-[0.14] motion-safe:animate-float"
          />
          <div className="pointer-events-none absolute right-24 -top-32 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(249,162,59,.35)_0%,rgba(249,162,59,0)_65%)] motion-safe:animate-ember" />
          <h2 className="relative m-0 max-w-3xl font-display text-5xl md:text-7xl font-bold uppercase leading-[0.98] text-white">
            {title || 'Únete a Nuestro Movimiento'}
          </h2>
          <div
            className="rich-content rich-content-invert relative max-w-xl text-base md:text-lg !text-white/90"
            dangerouslySetInnerHTML={{
              __html: normalizeRichTextHtml(
                body ||
                  'Eres joven y tienes un corazón apasionado por Dios. Este es tu lugar. Únete a nosotros y sé parte de un movimiento que está cambiando el mundo.'
              ),
            }}
          />
          <div className="relative flex flex-col sm:flex-row flex-wrap gap-3.5 pt-2">
            <button
              onClick={() => navigate('/register')}
              className="inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-white px-8 text-base font-bold text-brand-wine transition-transform duration-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
            >
              {secondaryLabel || 'Registrarme Ahora'}
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
            <a
              href={finalWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline-light h-14 px-7 text-base border-white/55"
            >
              <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 448 512" aria-hidden="true">
                <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32C101.3 32 1.4 131.9 1.4 254.5c0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 69 27 106.1 27h.1c122.6 0 222.5-99.9 222.5-222.5c0-59.3-25.2-115-65.5-156.5zM223.9 438.6h-.1c-33.2 0-65.7-8.9-94-25.7l-6.7-4l-69.8 18.3l18.7-68.1l-4.3-7c-18.5-29.4-28.2-63.4-28.2-98.6c0-101.7 82.8-184.5 184.6-184.5c49.3 0 95.6 19.2 130.4 54.1c34.8 34.9 56.2 81.2 56.1 130.5c0 101.8-84.9 184.5-186.7 184.5zm101-138.2c-5.5-2.8-32.8-16.1-37.9-17.9c-5.1-1.9-8.8-2.8-12.5 2.8s-14.3 17.9-17.6 21.6c-3.2 3.7-6.5 4.2-12 1.4c-32.6-16.3-54-29.1-75.5-66c-5.7-9.8 5.7-9.1 16.3-30.3c1.8-3.7.9-6.9-.5-9.7c-1.4-2.8-12.5-30.1-17.1-41.3c-4.5-10.8-9.1-9.3-12.5-9.5c-3.2-.2-6.9-.2-10.6-.2s-9.7 1.4-14.8 6.9c-5.1 5.6-19.4 19-19.4 46.3c0 27.3 19.9 53.7 22.6 57.4c2.8 3.7 39.1 59.7 94.8 83.8c35.2 15.2 49 16.5 66.6 14c10.7-1.6 32.8-13.4 37.4-26.3c4.6-12.9 4.6-23.9 3.2-26.3c-1.3-2.5-5-3.9-10.5-6.6z" />
              </svg>
              {primaryLabel || 'Contactar por WhatsApp'}
            </a>
            {onOpenContact && (
              <button
                onClick={onOpenContact}
                className="btn-outline-light h-14 px-7 text-base border-white/55"
              >
                Contáctanos
              </button>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
