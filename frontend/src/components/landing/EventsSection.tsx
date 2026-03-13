import { useState } from 'react';
import { normalizeRichTextHtml } from '../../utils/richText';

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

  return (
    <section
      id="events"
      className="py-20 px-4 bg-gradient-to-b from-white to-slate-50 dark:from-gray-900 dark:to-gray-800"
    >
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">
          {title || 'Próximos encuentros'}
        </h2>
        <div
          className="rich-content max-w-2xl mx-auto text-center text-gray-600 dark:text-gray-400 mb-12"
          dangerouslySetInnerHTML={{
            __html: normalizeRichTextHtml(
              body ||
                'Muy pronto podrás ver aquí retiros, campamentos y actividades destacadas del ministerio juvenil.'
            ),
          }}
        />

        {!hasEvents ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(item => (
              <div
                key={item}
                className="h-64 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleEvents.map(event => (
                <article
                  key={event._id}
                  className="group overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm hover:shadow-xl transition-all"
                >
                  <div className="h-56 overflow-hidden">
                    {event.mediaType === 'video' ? (
                      <video
                        src={event.mediaUrl}
                        controls
                        className="w-full h-full object-cover"
                      />
                    ) : event.mediaType === 'image' ? (
                      <img
                        src={event.mediaUrl}
                        alt={event.altText || event.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 flex flex-col items-center justify-center text-red-600 dark:text-red-300">
                        <svg
                          className="w-10 h-10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d="M14 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V8l-5-6z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d="M14 2v6h6"
                          />
                        </svg>
                        <span className="mt-2 text-sm font-semibold">PDF</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {event.title}
                    </h3>
                    {event.description && (
                      <div
                        className="rich-content mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2"
                        dangerouslySetInnerHTML={{
                          __html: normalizeRichTextHtml(event.description),
                        }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedEvent(event)}
                      className="mt-2 inline-flex text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Ver detalle
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {eventMedia.length > MAX_VISIBLE_CARDS && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllEvents(prev => !prev)}
                  className="inline-flex items-center px-5 py-2.5 rounded-lg border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-semibold text-sm transition"
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

      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="relative bg-white dark:bg-gray-900 rounded-xl max-w-5xl w-full p-4"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              className="absolute top-2 right-2 p-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
            >
              Cerrar
            </button>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pr-16">
              {selectedEvent.title}
            </h3>

            {selectedEvent.mediaType === 'image' && (
              <img
                src={selectedEvent.mediaUrl}
                alt={selectedEvent.altText || selectedEvent.title}
                className="w-full max-h-[65vh] object-contain rounded-lg"
              />
            )}

            {selectedEvent.mediaType === 'video' && (
              <video
                src={selectedEvent.mediaUrl}
                controls
                className="w-full max-h-[65vh] rounded-lg"
              />
            )}

            {selectedEvent.mediaType === 'document' && (
              <iframe
                src={selectedEvent.mediaUrl}
                title={selectedEvent.title}
                className="w-full h-[65vh] rounded-lg border border-gray-200 dark:border-gray-700"
              />
            )}

            {selectedEvent.description && (
              <div
                className="rich-content mt-5 text-sm text-gray-700 dark:text-gray-300"
                dangerouslySetInnerHTML={{
                  __html: normalizeRichTextHtml(selectedEvent.description),
                }}
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
