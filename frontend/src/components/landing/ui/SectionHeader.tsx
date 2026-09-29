import { normalizeRichTextHtml } from '../../../utils/richText';
import Reveal from './Reveal';

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  body?: string | undefined;
  tone?: 'light' | 'dark';
  align?: 'left' | 'center';
}

export default function SectionHeader({
  eyebrow,
  title,
  body,
  tone = 'light',
  align = 'left',
}: SectionHeaderProps) {
  const dark = tone === 'dark';
  const centered = align === 'center';

  return (
    <Reveal
      className={`mb-12 md:mb-14 flex flex-col gap-4 ${
        centered ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between md:gap-10'
      }`}
    >
      <div className={`flex flex-col gap-4 ${centered ? 'items-center' : ''}`}>
        <span
          className={`eyebrow ${dark ? 'text-brand-amber' : 'text-brand-deep dark:text-brand-amber'}`}
        >
          {eyebrow}
        </span>
        <h2
          className={`font-display text-4xl md:text-6xl font-semibold uppercase leading-none ${
            dark ? 'text-white' : 'text-cocoa-900 dark:text-white'
          }`}
        >
          {title}
        </h2>
      </div>
      {body && (
        <div
          className={`rich-content max-w-md text-base md:text-lg leading-relaxed ${
            dark ? 'rich-content-invert' : 'text-cocoa-500 dark:text-white/70'
          }`}
          dangerouslySetInnerHTML={{ __html: normalizeRichTextHtml(body) }}
        />
      )}
    </Reveal>
  );
}
