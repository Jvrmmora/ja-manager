import { normalizeRichTextHtml } from '../../utils/richText';
import Reveal from './ui/Reveal';

interface MissionVisionSectionProps {
  content: {
    missionTitle?: string;
    missionText: string;
    visionTitle?: string;
    visionText: string;
  };
}

const cards = [
  {
    key: 'mission',
    iconBg: 'bg-sand-100 text-brand-ember dark:bg-brand-orange/15 dark:text-brand-amber',
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </>
    ),
  },
  {
    key: 'vision',
    iconBg: 'bg-[#F6E1E8] text-brand-wine dark:bg-brand-wine/25 dark:text-[#F4A3C0]',
    icon: (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  },
] as const;

export default function MissionVisionSection({
  content,
}: MissionVisionSectionProps) {
  const data = {
    mission: { title: content.missionTitle || 'Misión', text: content.missionText },
    vision: { title: content.visionTitle || 'Visión', text: content.visionText },
  };

  return (
    <section
      id="mission"
      className="bg-cream dark:bg-ink-900 pt-8 pb-24 md:pb-32"
    >
      <h2 className="sr-only">Nuestra Misión y Visión</h2>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-5 md:grid-cols-2 md:gap-6">
        {cards.map((card, i) => (
          <Reveal key={card.key} delay={i * 0.12}>
            <article className="border-fire h-full rounded-[28px] p-8 md:p-11 flex flex-col sm:flex-row gap-6 sm:gap-7 items-start transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_56px_-24px_rgba(220,51,64,0.45)]">
              <span className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[18px] ${card.iconBg}`}>
                <svg className="h-[30px] w-[30px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {card.icon}
                </svg>
              </span>
              <div className="flex flex-col gap-3">
                <h3 className="m-0 font-display text-3xl md:text-[34px] font-semibold uppercase text-cocoa-900 dark:text-white">
                  {data[card.key].title}
                </h3>
                <div
                  className="rich-content text-lg md:text-xl leading-relaxed text-cocoa-700 dark:text-white/75"
                  dangerouslySetInnerHTML={{
                    __html: normalizeRichTextHtml(data[card.key].text),
                  }}
                />
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
