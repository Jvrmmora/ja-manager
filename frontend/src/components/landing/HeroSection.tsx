import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from 'framer-motion';
import { normalizeWhatsAppUrl } from '../../utils/whatsapp';
import HeroFlame from './HeroFlame';

interface HeroSectionProps {
  content: {
    heroTitle: string;
    heroSubtitle: string;
    heroDescription: string;
    heroVerse?: string;
    heroVerseText?: string;
    heroVerseCitation?: string;
  };
  heroMedia?: {
    mediaUrl: string;
    altText: string;
    mediaType?: 'image' | 'video' | 'document';
  };
  whatsappUrl?: string;
}

const isServer = typeof window === 'undefined';

const splitVerse = (content: HeroSectionProps['content']) => {
  if (content.heroVerseText) {
    return { text: content.heroVerseText, citation: content.heroVerseCitation };
  }
  if (!content.heroVerse) return null;
  const idx = content.heroVerse.lastIndexOf(' - ');
  if (idx === -1) return { text: content.heroVerse, citation: undefined };
  return {
    text: content.heroVerse.slice(0, idx),
    citation: content.heroVerse.slice(idx + 3),
  };
};

// La última palabra del título va con el degradado de marca.
const splitLastWord = (text: string) => {
  const trimmed = text.trim();
  const idx = trimmed.lastIndexOf(' ');
  if (idx === -1) return { head: '', last: trimmed };
  return { head: trimmed.slice(0, idx), last: trimmed.slice(idx + 1) };
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.2, 0.7, 0.2, 1] } },
};
const stagger: Variants = {
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

export default function HeroSection({
  content,
  heroMedia,
  whatsappUrl,
}: HeroSectionProps) {
  const navigate = useNavigate();
  const finalWhatsAppUrl = normalizeWhatsAppUrl(whatsappUrl);
  const reduceMotion = useReducedMotion();
  const animate = !isServer && !reduceMotion;
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const mediaY = useTransform(scrollYProgress, [0, 1], [0, animate ? 80 : 0]);

  const verse = splitVerse(content);
  const { head, last } = splitLastWord(content.heroSubtitle || '');
  const hasMedia = Boolean(heroMedia?.mediaUrl);

  const containerProps = animate
    ? {
        initial: 'hidden',
        animate: 'show',
        variants: stagger,
      }
    : {};
  const itemProps = animate ? { variants: fadeUp } : {};

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="relative overflow-hidden bg-ink-950 pt-[72px] lg:pt-[84px]"
    >
      <div className="pointer-events-none absolute left-1/3 -top-72 h-[900px] w-[900px] rounded-full bg-[radial-gradient(circle,rgba(242,106,46,.36)_0%,rgba(220,51,64,.15)_38%,rgba(20,11,16,0)_68%)] motion-safe:animate-ember" />
      <div className="pointer-events-none absolute -left-64 top-1/2 h-[760px] w-[760px] rounded-full bg-[radial-gradient(circle,rgba(138,28,69,.45)_0%,rgba(78,15,58,.18)_42%,rgba(20,11,16,0)_70%)] motion-safe:animate-ember-slow" />

      <div
        className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24 md:pt-16 lg:pb-32 grid items-center gap-12 lg:gap-16 ${
          hasMedia ? 'lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]' : ''
        }`}
      >
        <motion.div className="relative isolate flex flex-col gap-7" {...containerProps}>
          {/* Llama detrás de los botones: nace en la base de la columna de texto */}
          <HeroFlame className="-z-10 -bottom-28 left-1/2 -translate-x-1/2 md:-bottom-16 md:left-[26%]" />
          <h1 className="m-0 flex flex-col gap-5">
            <motion.span
              {...itemProps}
              className="self-start inline-flex items-center gap-2.5 h-9 px-4 rounded-full border border-white/15 bg-white/[0.04] text-[13px] font-medium tracking-wide text-white/85"
            >
              <span className="h-2 w-2 rounded-full bg-brand-amber motion-safe:animate-dot-pulse" />
              {content.heroTitle}
            </motion.span>
            <motion.span
              {...itemProps}
              className="font-display font-bold uppercase text-white leading-[0.92] tracking-[-0.01em] text-[56px] sm:text-7xl lg:text-[104px] xl:text-[120px]"
            >
              {head && <>{head} </>}
              <span className="text-fire">{last}</span>
            </motion.span>
          </h1>

          {content.heroDescription && (
            <motion.p
              {...itemProps}
              className="m-0 max-w-xl text-lg md:text-xl leading-relaxed text-white/75"
            >
              {content.heroDescription}
            </motion.p>
          )}

          {verse && (
            <motion.figure
              {...itemProps}
              className="m-0 max-w-xl flex gap-4 rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-5 backdrop-blur-sm"
            >
              <span className="text-fire font-display text-6xl leading-[0.8]" aria-hidden="true">
                “
              </span>
              <span className="flex flex-col gap-2">
                <blockquote className="m-0 text-base md:text-[17px] italic leading-relaxed text-white/90">
                  {verse.text}
                </blockquote>
                {verse.citation && (
                  <figcaption className="font-display text-[13px] uppercase tracking-[0.16em] text-brand-amber">
                    {verse.citation}
                  </figcaption>
                )}
              </span>
            </motion.figure>
          )}

          <motion.div {...itemProps} className="flex flex-col sm:flex-row gap-3.5 pt-1">
            <button
              onClick={() => navigate('/register')}
              className="btn-fire h-14 px-8 text-base"
            >
              Únete a nosotros
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
            <a
              href={finalWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline-light h-14 bg-ink-950/55 px-7 text-base backdrop-blur-sm"
            >
              <svg className="w-[18px] h-[18px] text-green-400" fill="currentColor" viewBox="0 0 448 512" aria-hidden="true">
                <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32 101.3 32 1.4 131.9 1.4 254.5c0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 69 27 106.1 27h.1c122.6 0 222.5-99.9 222.5-222.5 0-59.3-25.2-115-65.5-156.5zM223.9 438.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3 18.7-68.1-4.3-7c-18.5-29.4-28.2-63.4-28.2-98.6 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.5-186.8 184.5zm101-138.2c-5.5-2.8-32.8-16.1-37.9-17.9-5.1-1.9-8.8-2.8-12.5 2.8s-14.3 17.9-17.6 21.6c-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7s-12.5-30.1-17.1-41.3c-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2s-9.7 1.4-14.8 6.9c-5.1 5.6-19.4 19-19.4 46.3s19.9 53.7 22.6 57.4c2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 14 10.7-1.6 32.8-13.4 37.4-26.3s4.6-23.9 3.2-26.3c-1.3-2.5-5-3.9-10.5-6.6z" />
              </svg>
              Escríbenos por WhatsApp
            </a>
          </motion.div>
        </motion.div>

        {hasMedia && heroMedia && (
          <motion.div
            className="relative h-[320px] sm:h-[440px] lg:h-[600px]"
            {...(animate
              ? {
                  initial: { opacity: 0, y: 30 },
                  animate: { opacity: 1, y: 0 },
                  transition: { duration: 1, delay: 0.3, ease: [0.2, 0.7, 0.2, 1] },
                }
              : {})}
          >
            <div className="absolute inset-0 overflow-hidden rounded-[32px] border border-white/10 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)]">
              <motion.div className="absolute -inset-y-10 inset-x-0" style={{ y: mediaY }}>
                {heroMedia.mediaType === 'video' ? (
                  <video
                    key={heroMedia.mediaUrl}
                    className="h-full w-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    aria-hidden="true"
                  >
                    <source src={heroMedia.mediaUrl} />
                  </video>
                ) : (
                  <img
                    src={heroMedia.mediaUrl}
                    alt={heroMedia.altText || content.heroTitle}
                    className="h-full w-full object-cover"
                  />
                )}
              </motion.div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-950/60" />
            </div>
            <span className="absolute right-5 top-5 inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-ink-950/75 px-4 text-[13px] font-medium text-white backdrop-blur-sm">
              <span className="font-display text-lg text-brand-amber">3</span>
              reuniones semanales
            </span>
          </motion.div>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2.5 md:flex" aria-hidden="true">
        <div className="flex h-[42px] w-[26px] justify-center rounded-[14px] border-2 border-white/35 pt-2">
          <div className="h-2 w-[3px] rounded-sm bg-brand-amber motion-safe:animate-scroll-wheel" />
        </div>
        <span className="font-display text-[11px] tracking-[0.3em] text-white/45">
          DESLIZA
        </span>
      </div>
    </section>
  );
}
