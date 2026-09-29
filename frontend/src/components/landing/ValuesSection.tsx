import { normalizeRichTextHtml } from '../../utils/richText';
import Reveal from './ui/Reveal';
import SectionHeader from './ui/SectionHeader';

interface Value {
  title: string;
  description: string;
}

interface ValuesSectionProps {
  values: Value[];
}

const DEFAULT_VALUES: Value[] = [
  {
    title: 'Fe',
    description: 'Confianza en Dios y en su propósito para nuestras vidas',
  },
  {
    title: 'Comunidad',
    description: 'Somos más fuertes juntos, apoyándonos mutuamente',
  },
  {
    title: 'Crecimiento',
    description: 'Evolucionar espiritualmente cada día',
  },
  {
    title: 'Servicio',
    description: 'Servir a otros con amor y dedicación',
  },
  {
    title: 'Transformación',
    description: 'Cambiar el mundo a través de acciones cristianas',
  },
];

export default function ValuesSection({ values }: ValuesSectionProps) {
  const displayValues = values && values.length > 0 ? values : DEFAULT_VALUES;
  const columns =
    displayValues.length % 4 === 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3';

  return (
    <section
      id="values"
      className="relative overflow-hidden bg-ink-950 py-24 md:py-28"
    >
      <div className="pointer-events-none absolute -right-52 -top-64 h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle,rgba(220,51,64,.22)_0%,rgba(20,11,16,0)_65%)] motion-safe:animate-ember-slow" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Lo que nos mueve" title="Nuestros Valores" tone="dark" />
        <div className={`grid gap-4 sm:grid-cols-2 md:gap-5 ${columns}`}>
          {displayValues.map((value, index) => (
            <Reveal key={`${value.title}-${index}`} delay={(index % 4) * 0.08}>
              <article className="group flex h-full min-h-[240px] flex-col justify-between gap-8 rounded-3xl border border-white/[0.08] bg-ink-900 p-7 md:p-8 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-amber/45 hover:shadow-[0_28px_56px_-24px_rgba(220,51,64,0.55)]">
                <span className="text-fire font-display text-6xl font-bold leading-none">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="flex flex-col gap-2.5">
                  <h3 className="m-0 font-display text-[28px] font-semibold uppercase text-white">
                    {value.title}
                  </h3>
                  <div
                    className="rich-content rich-content-invert text-[15px] leading-relaxed [&_p]:my-0"
                    dangerouslySetInnerHTML={{
                      __html: normalizeRichTextHtml(value.description),
                    }}
                  />
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
