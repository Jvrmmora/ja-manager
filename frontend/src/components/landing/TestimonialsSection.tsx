interface TestimonialMedia {
  _id: string;
  title: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  altText: string;
}

interface TestimonialsSectionProps {
  title?: string;
  body?: string;
  testimonialMedia: TestimonialMedia[];
}

export default function TestimonialsSection({
  title,
  body,
  testimonialMedia,
}: TestimonialsSectionProps) {
  const hasTestimonials = testimonialMedia && testimonialMedia.length > 0;

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
          className="max-w-2xl mx-auto text-center text-gray-600 dark:text-gray-400 mb-12"
          dangerouslySetInnerHTML={{
            __html:
              body ||
              'Muy pronto compartiremos testimonios de jóvenes que han encontrado amistad, propósito y crecimiento espiritual en Modelia.',
          }}
        />

        {!hasTestimonials ? (
          <div className="max-w-3xl mx-auto rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center bg-white/70 dark:bg-gray-900/30">
            <p className="text-gray-600 dark:text-gray-300">
              Estamos preparando testimonios reales de nuestra comunidad.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonialMedia.map(item => (
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
                  ) : (
                    <img
                      src={item.mediaUrl}
                      alt={item.altText || item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
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
        )}
      </div>
    </section>
  );
}
