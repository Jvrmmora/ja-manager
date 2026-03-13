import { useState } from 'react';
import { normalizeRichTextHtml } from '../../utils/richText';

interface TestimonialMedia {
  _id: string;
  title: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'document';
  altText: string;
}

interface TestimonialsSectionProps {
  title?: string;
  body?: string;
  testimonialMedia: TestimonialMedia[];
}

const MAX_VISIBLE_CARDS = 6;

export default function TestimonialsSection({
  title,
  body,
  testimonialMedia,
}: TestimonialsSectionProps) {
  const hasTestimonials = testimonialMedia && testimonialMedia.length > 0;
  const [showAllTestimonials, setShowAllTestimonials] = useState(false);
  const visibleTestimonials = showAllTestimonials
    ? testimonialMedia
    : testimonialMedia.slice(0, MAX_VISIBLE_CARDS);

  return (
    <section
      id="testimonials"
      className="py-20 px-4 bg-gray-50 dark:bg-gray-800"
    >
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">
          {title || 'Historias que inspiran'}
        </h2>
        <div
          className="rich-content max-w-2xl mx-auto text-center text-gray-600 dark:text-gray-400 mb-12"
          dangerouslySetInnerHTML={{
            __html: normalizeRichTextHtml(
              body ||
                'Muy pronto compartiremos testimonios de jóvenes que han encontrado amistad, propósito y crecimiento espiritual en Modelia.'
            ),
          }}
        />

        {!hasTestimonials ? (
          <div className="max-w-3xl mx-auto rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center bg-white/70 dark:bg-gray-900/30">
            <p className="text-gray-600 dark:text-gray-300">
              Estamos preparando testimonios reales de nuestra comunidad.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleTestimonials.map(item => (
                <article
                  key={item._id}
                  className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="h-52">
                    {item.mediaType === 'video' ? (
                      <video
                        src={item.mediaUrl}
                        controls
                        className="w-full h-full object-cover"
                      />
                    ) : item.mediaType === 'image' ? (
                      <img
                        src={item.mediaUrl}
                        alt={item.altText || item.title}
                        className="w-full h-full object-cover"
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
                    <p className="text-sm uppercase tracking-wide text-blue-600 dark:text-blue-400 font-semibold">
                      Testimonio
                    </p>
                    <h3 className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
                      {item.title}
                    </h3>
                  </div>
                </article>
              ))}
            </div>

            {testimonialMedia.length > MAX_VISIBLE_CARDS && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllTestimonials(prev => !prev)}
                  className="inline-flex items-center px-5 py-2.5 rounded-lg border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-semibold text-sm transition"
                >
                  {showAllTestimonials
                    ? 'Ver menos'
                    : `Ver más (${testimonialMedia.length - MAX_VISIBLE_CARDS})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
