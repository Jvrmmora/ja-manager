import React from 'react';
import type { PublicForm } from '../../../types/forms';
import {
  buildMapsUrl,
  formatCost,
  formatEventDate,
  formatEventTime,
} from '../../../utils/forms/eventFormat';
import { normalizeRichTextHtml } from '../../../utils/richText';
import PointsBadge from './PointsBadge';

interface EventHeroProps {
  form: PublicForm;
  /** Aviso bajo el título (cerrado, cupo lleno, vista previa…). */
  notice?: React.ReactNode;
}

const Chip: React.FC<{ icon: React.ReactNode; children: React.ReactNode; href?: string | null }> = ({
  icon,
  children,
  href,
}) => {
  const content = (
    <>
      <span className="text-brand-amber" aria-hidden="true">
        {icon}
      </span>
      <span>{children}</span>
    </>
  );
  const cls =
    'inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-2 text-[14px] font-medium text-white/90';
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${cls} transition-colors hover:border-brand-amber/60 hover:bg-white/10`}>
      {content}
      <svg className="h-3.5 w-3.5 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  ) : (
    <span className={cls}>{content}</span>
  );
};

const Icon = ({ d }: { d: string }) => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

/**
 * Cabecera del evento: portada, título y lo esencial (cuándo, dónde, cuánto)
 * en chips grandes, legibles de un vistazo en el celular.
 */
const EventHero: React.FC<EventHeroProps> = ({ form, notice }) => {
  const { event } = form;
  const cost = formatCost(event.cost);
  const description = normalizeRichTextHtml(form.description);

  return (
    <header className="relative overflow-hidden bg-ink-950 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(242,106,46,.30)_0%,rgba(138,28,69,.16)_40%,rgba(20,11,16,0)_68%)] motion-safe:animate-ember" />

      <div className="relative mx-auto max-w-2xl">
        {form.coverImage && (
          <img
            src={form.coverImage}
            alt=""
            className="mb-6 h-auto max-h-[70vh] w-full rounded-[24px] object-contain shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)]"
          />
        )}

        <p className="eyebrow m-0 text-brand-amber">Evento · Jóvenes Modelia</p>
        <h1 className="mt-2 font-display text-[40px] font-bold uppercase leading-[0.95] sm:text-6xl">
          <span className="text-fire">{form.title}</span>
        </h1>

        <div className="mt-5 flex flex-wrap gap-2">
          {event.startsAt && (
            <Chip icon={<Icon d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />}>
              {formatEventDate(event.startsAt)}
            </Chip>
          )}
          {event.startsAt && (
            <Chip icon={<Icon d="M12 6v6l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z" />}>
              {formatEventTime(event.startsAt)}
              {event.endsAt ? ` – ${formatEventTime(event.endsAt)}` : ''}
            </Chip>
          )}
          {event.location && (
            <Chip
              href={buildMapsUrl(event)}
              icon={<Icon d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />}
            >
              {event.location}
            </Chip>
          )}
          {cost && (
            <Chip icon={<Icon d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />}>
              {cost}
              {event.costNote ? ` · ${event.costNote}` : ''}
            </Chip>
          )}
          {form.spotsLeft !== null && form.spotsLeft > 0 && (
            <Chip icon={<Icon d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />}>
              {form.spotsLeft === 1 ? 'Queda 1 cupo' : `Quedan ${form.spotsLeft} cupos`}
            </Chip>
          )}
        </div>

        {form.settings.pointsReward > 0 && (
          <div className="mt-4">
            <PointsBadge points={form.settings.pointsReward} />
          </div>
        )}

        {description && (
          <div
            className="rich-content rich-content-invert mt-6 text-[15px] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        )}

        {notice && <div className="mt-6">{notice}</div>}
      </div>
    </header>
  );
};

export default EventHero;
