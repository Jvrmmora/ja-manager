import { useEffect, useRef, useState } from 'react';
import { normalizeRichTextHtml } from '../../utils/richText';
import Reveal from './ui/Reveal';

interface AboutSectionProps {
  content: {
    aboutTitle?: string;
    aboutBody: string;
  };
}

interface AnimatedCounterProps {
  target: number;
  start: boolean;
  suffix?: string;
  durationMs?: number;
}

function AnimatedCounter({
  target,
  start,
  suffix = '',
  durationMs = 1100,
}: AnimatedCounterProps) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) {
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }

    let frame = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / durationMs, 1);
      const nextValue = Math.round(target * progress);
      setValue(nextValue);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [durationMs, start, target]);

  return (
    <>
      {value}
      {suffix}
    </>
  );
}

export default function AboutSection({ content }: AboutSectionProps) {
  const statsRef = useRef<HTMLDivElement | null>(null);
  const [startCounters, setStartCounters] = useState(false);

  useEffect(() => {
    const element = statsRef.current;

    if (!element) {
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStartCounters(true);
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setStartCounters(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="about"
      className="bg-cream dark:bg-ink-900 pt-24 pb-12 md:pt-32 md:pb-16"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-14 lg:grid-cols-2 lg:gap-24 lg:items-center">
        <Reveal className="flex flex-col gap-5">
          <span className="eyebrow text-brand-deep dark:text-brand-amber">
            Sobre nosotros
          </span>
          <h2 className="m-0 font-display text-5xl md:text-7xl font-semibold uppercase leading-none text-cocoa-900 dark:text-white">
            {content.aboutTitle || 'Quiénes Somos'}
          </h2>
          <div
            className="rich-content text-lg md:text-[22px] leading-relaxed text-cocoa-700 dark:text-white/75"
            dangerouslySetInnerHTML={{
              __html: normalizeRichTextHtml(content.aboutBody),
            }}
          />
        </Reveal>

        <div ref={statsRef} className="grid grid-cols-3 gap-3 sm:gap-4">
          {[
            { value: <AnimatedCounter target={3} start={startCounters} />, label: 'Reuniones Semanales', offset: '' },
            { value: <AnimatedCounter target={50} start={startCounters} suffix="+" />, label: 'Jóvenes Apasionados', offset: 'lg:-translate-y-6' },
          ].map((stat, i) => (
            <Reveal key={stat.label} delay={i * 0.1} className={stat.offset}>
              <div className="h-full rounded-3xl border border-sand-200 bg-white p-5 sm:p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_56px_-24px_rgba(220,51,64,0.45)] dark:border-white/10 dark:bg-ink-800">
                <p className="text-fire m-0 font-display text-5xl sm:text-7xl font-bold leading-none">
                  {stat.value}
                </p>
                <p className="m-0 mt-2 text-sm sm:text-[15px] font-medium leading-snug text-cocoa-600 dark:text-white/70">
                  {stat.label}
                </p>
              </div>
            </Reveal>
          ))}
          <Reveal delay={0.2}>
            <div className="h-full rounded-3xl bg-ink-950 p-5 sm:p-7 transition-all duration-300 hover:-translate-y-1.5 dark:border dark:border-white/10">
              <p className="m-0 font-display text-5xl sm:text-7xl font-bold leading-none text-brand-amber">
                ∞
              </p>
              <p className="m-0 mt-2 text-sm sm:text-[15px] font-medium leading-snug text-white/80">
                Impacto Potencial
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
