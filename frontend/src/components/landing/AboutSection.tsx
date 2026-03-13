import { useEffect, useRef, useState } from 'react';
import { normalizeRichTextHtml } from '../../utils/richText';

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
      className="py-20 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900"
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">
          {content.aboutTitle || 'Quiénes Somos'}
        </h2>

        <div className="prose dark:prose-invert max-w-none">
          <div
            className="rich-content text-lg text-gray-700 dark:text-gray-300 leading-relaxed text-center"
            dangerouslySetInnerHTML={{
              __html: normalizeRichTextHtml(content.aboutBody),
            }}
          />
        </div>

        {/* Stats or highlights */}
        <div ref={statsRef} className="mt-12 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              <AnimatedCounter target={3} start={startCounters} />
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Reuniones Semanales
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              <AnimatedCounter target={50} start={startCounters} suffix="+" />
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Jóvenes Apasionados
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 animate-[pulse_3s_ease-in-out_infinite]">
              ∞
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Impacto Potencial
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
