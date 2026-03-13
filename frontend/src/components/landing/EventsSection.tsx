import { normalizeRichTextHtml } from '../../utils/richText';

interface EventMedia {
  _id: string;
  title: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  altText: string;
}

interface EventsSectionProps {
  title?: string;
  body?: string;
  eventMedia: EventMedia[];
}

export default function EventsSection({
  title,
  body,
  eventMedia,
}: EventsSectionProps) {
  const hasEvents = eventMedia && eventMedia.length > 0;

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventMedia.map(event => (
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
                  ) : (
                    <img
                      src={event.mediaUrl}
                      alt={event.altText || event.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {event.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    Encuentro especial para compartir, crecer y servir juntos.
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
