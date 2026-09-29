import Reveal from './ui/Reveal';

interface LocationSectionProps {
  content: {
    addressLabel: string;
    mapEmbedUrl: string;
    mapsDirectionsUrl: string;
  };
}

const extractIframeSrc = (value: string) => {
  const match = value.match(/src=["']([^"']+)["']/i);
  return match?.[1]?.trim() || '';
};

const getMapEmbedSrc = (value: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  if (trimmedValue.startsWith('<iframe')) {
    return extractIframeSrc(trimmedValue);
  }

  return trimmedValue;
};

export default function LocationSection({ content }: LocationSectionProps) {
  const mapEmbedSrc = getMapEmbedSrc(content.mapEmbedUrl);

  return (
    <section id="location" className="bg-cream dark:bg-ink-900 py-24 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-12 lg:grid-cols-[7fr_5fr] lg:gap-16 lg:items-center">
        <Reveal className="relative h-[420px] md:h-[520px] overflow-hidden rounded-[32px] border border-sand-300 bg-sand-100 shadow-[0_30px_60px_-30px_rgba(78,15,58,0.35)] dark:border-white/10 dark:bg-ink-800">
          {mapEmbedSrc ? (
            <iframe
              title="Ubicación Jóvenes Modelia"
              width="100%"
              height="100%"
              src={mapEmbedSrc}
              className="h-full w-full border-0"
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <p className="text-cocoa-500 dark:text-white/60">Mapa no disponible</p>
            </div>
          )}

          <div className="absolute inset-x-4 bottom-4 md:inset-x-7 md:bottom-7 flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-[0_16px_40px_-16px_rgba(20,11,16,0.35)] sm:flex-row sm:items-center sm:justify-between dark:bg-ink-950">
            <span className="flex items-center gap-3.5">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-sand-100 text-brand-ember dark:bg-brand-orange/15 dark:text-brand-amber">
                <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <span className="flex flex-col">
                <span className="text-[13px] text-cocoa-500 dark:text-white/55">Nos encuentras en</span>
                <span className="text-base md:text-lg font-semibold text-cocoa-900 dark:text-white">
                  {content.addressLabel}
                </span>
              </span>
            </span>
            {content.mapsDirectionsUrl && (
              <a
                href={content.mapsDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-fire h-12 px-6 text-[15px] flex-shrink-0"
              >
                Cómo llegar
              </a>
            )}
          </div>
        </Reveal>

        <Reveal delay={0.1} className="flex flex-col gap-5">
          <span className="eyebrow text-brand-deep dark:text-brand-amber">Ubicación</span>
          <h2 className="m-0 font-display text-5xl md:text-6xl font-semibold uppercase leading-none text-cocoa-900 dark:text-white">
            Te esperamos
          </h2>
          <h3 className="m-0 mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-cocoa-500 dark:text-white/60">
            Nuestras reuniones:
          </h3>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {[
              ['Grupo Pequeño', 'Entre Semana'],
              ['Escuela Sabática', 'Sábado Mañana'],
              ['Culto Joven', 'Sábado por la tarde'],
            ].map(([name, when]) => (
              <li
                key={name}
                className="flex items-center justify-between gap-4 rounded-2xl border border-sand-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-ink-800"
              >
                <span className="font-semibold text-cocoa-900 dark:text-white">{name}</span>
                <span className="text-sm font-medium text-brand-deep dark:text-brand-amber">{when}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
