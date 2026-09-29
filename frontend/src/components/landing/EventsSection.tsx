import { useState } from 'react';
import { normalizeRichTextHtml } from '../../utils/richText';
import ImageWithFallback from './ImageWithFallback';
import EventDetailModal from './EventDetailModal';
import Reveal from './ui/Reveal';
import SectionHeader from './ui/SectionHeader';

interface EventMedia {
  _id: string;
  title: string;
  description?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'document';
  altText: string;
}

interface EventsSectionProps {
  title?: string;
  body?: string;
  eventMedia: EventMedia[];
}

const MAX_VISIBLE_CARDS = 6;

export default function EventsSection({
  title,
  body,
  eventMedia,
}: EventsSectionProps) {
  const hasEvents = eventMedia && eventMedia.length > 0;
  const [selectedEvent, setSelectedEvent] = useState<EventMedia | null>(null);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const visibleEvents = showAllEvents
    ? eventMedia
    : eventMedia.slice(0, MAX_VISIBLE_CARDS);

  const renderThumb = (event: EventMedia) => {
    if (event.mediaType === 'video') {
      return (
        <video
          src={event.mediaUrl}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      );
    }
    if (event.mediaType === 'image') {
      return (
        <ImageWithFallback
          src={event.mediaUrl}
          alt={event.altText || event.title}
          fallbackLabel={event.title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
      );
    }
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/85">
        <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
        <span className="text-sm font-semibold">PDF</span>
      </div>
    );
  };

  return (
    <section id="events" className="bg-white dark:bg-ink-950 pb-24 md:pb-28 pt-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Eventos"
          title={title || 'Próximos encuentros'}
          body={
            body ||
            'Muy pronto podrás ver aquí retiros, campamentos y actividades destacadas del ministerio juvenil.'
          }
        />

        {!hasEvents ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map(item => (
              <div
                key={item}
                className="h-64 rounded-3xl border border-sand-200 bg-cream dark:border-white/10 dark:bg-ink-900 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:auto-rows-[250px]">
              {visibleEvents.map((event, index) => {
                const featured = index === 0 && visibleEvents.length > 1;
                return (
                  <Reveal
                    key={event._id}
                    delay={(index % 3) * 0.08}
                    className={featured ? 'md:col-span-2 md:row-span-2' : ''}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedEvent(event)}
                      className={`group relative block h-full w-full overflow-hidden text-left bg-gradient-to-br from-[#E7B48E] via-[#C0584E] to-brand-wine transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_56px_-24px_rgba(220,51,64,0.5)] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40 ${
                        featured ? 'min-h-[360px] rounded-[28px]' : 'min-h-[250px] rounded-3xl'
                      }`}
                    >
                      <div className="absolute inset-0">{renderThumb(event)}</div>
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink-950/20 to-ink-950/85" />
                      <div className={`absolute inset-x-0 bottom-0 flex flex-col gap-2 text-white ${featured ? 'p-7 md:p-10' : 'p-6'}`}>
                        {featured && (
                          <span className="self-start inline-flex h-8 items-center rounded-full bg-white px-3.5 text-[13px] font-bold text-brand-wine">
                            Destacado
                          </span>
                        )}
                        <h3 className={`m-0 font-display font-semibold uppercase leading-[1.05] ${featured ? 'text-3xl md:text-[44px]' : 'text-2xl'}`}>
                          {event.title}
                        </h3>
                        {featured && event.description && (
                          <div
                            className="rich-content max-w-xl text-[15px] text-white/80 line-clamp-2 [&_p]:my-0"
                            dangerouslySetInnerHTML={{
                              __html: normalizeRichTextHtml(event.description),
                            }}
                          />
                        )}
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#FCD3A8]">
                          Ver detalle
                          <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        </span>
                      </div>
                    </button>
                  </Reveal>
                );
              })}
            </div>

            {eventMedia.length > MAX_VISIBLE_CARDS && (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllEvents(prev => !prev)}
                  className="inline-flex h-12 items-center rounded-full border border-sand-300 px-6 text-sm font-semibold text-cocoa-900 transition-colors hover:bg-ink-950 hover:text-white dark:border-white/20 dark:text-white"
                >
                  {showAllEvents
                    ? 'Ver menos'
                    : `Ver más (${eventMedia.length - MAX_VISIBLE_CARDS})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </section>
  );
}
