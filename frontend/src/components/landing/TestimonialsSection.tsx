import { useState, useEffect, useRef } from 'react';
import { normalizeRichTextHtml } from '../../utils/richText';

interface TestimonialMedia {
  _id: string;
  title: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'document';
  altText?: string;
}

interface TestimonialsSectionProps {
  title?: string;
  body?: string;
  testimonialMedia: TestimonialMedia[];
}


const getYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*?[?&]v=([A-Za-z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([A-Za-z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtube-nocookie\.com\/embed\/([A-Za-z0-9_-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
};

const isYouTubeUrl = (url: string) => !!getYouTubeVideoId(url);

const isVimeoUrl = (url: string) => /vimeo\.com\//i.test(url);

const toEmbeddableUrl = (url: string): string => {
  const videoId = getYouTubeVideoId(url);
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
  }

  if (isVimeoUrl(url)) {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    return match?.[1] ? `https://player.vimeo.com/video/${match[1]}` : url;
  }

  return url;
};

export default function TestimonialsSection({
  title,
  body,
  testimonialMedia,
}: TestimonialsSectionProps) {
  const testimonials = testimonialMedia || [];
  const hasTestimonials = testimonials.length > 0;

  const [startIndex, setStartIndex] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(3);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const dragStartX = useRef<number | null>(null);
  const dragDelta = useRef(0);

  useEffect(() => {
    const updateItems = () => {
      const w = window.innerWidth;
      if (w < 768) setItemsPerPage(1);
      else if (w < 1024) setItemsPerPage(2);
      else setItemsPerPage(3);
    };
    updateItems();
    window.addEventListener('resize', updateItems);
    return () => window.removeEventListener('resize', updateItems);
  }, []);

  // Keep startIndex within bounds when itemsPerPage or testimonials change
  useEffect(() => {
    setStartIndex(s => Math.min(s, Math.max(0, testimonials.length - itemsPerPage)));
  }, [itemsPerPage, testimonials.length]);

  const maxStart = Math.max(0, testimonials.length - itemsPerPage);
  const goPrev = () => setStartIndex(s => Math.max(0, s - 1));
  const goNext = () => setStartIndex(s => Math.min(maxStart, s + 1));

  // Pointer / touch handlers for swipe + pixel-perfect transform to avoid cutoff
  useEffect(() => {
    const wrapper = trackRef.current?.parentElement as HTMLElement | null;
    if (!wrapper || !trackRef.current) return;

    let gapPx = 0;
    try {
      const styles = getComputedStyle(trackRef.current);
      gapPx = parseFloat(styles.columnGap || styles.gap || '0') || 0;
    } catch (err) {
      // ignore failures reading computed styles
    }

    const updateTransform = () => {
      const wrapperWidth = wrapper.clientWidth;
      const totalGap = gapPx * Math.max(0, itemsPerPage - 1);
      const slideWidth = (wrapperWidth - totalGap) / itemsPerPage;

      // set each slide width in px so transform in px matches
      Array.from(trackRef.current!.children).forEach((child: Element) => {
        (child as HTMLElement).style.width = `${slideWidth}px`;
      });

      const offset = startIndex * (slideWidth + gapPx);
      trackRef.current!.style.transform = `translateX(-${offset}px)`;
    };

    updateTransform();

    const onPointerDown = (e: PointerEvent) => {
      pointerIdRef.current = e.pointerId;
      (e.target as Element).setPointerCapture?.(e.pointerId);
      dragStartX.current = e.clientX;
      dragDelta.current = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (dragStartX.current == null) return;
      dragDelta.current = e.clientX - (dragStartX.current || 0);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (dragStartX.current == null) return;
      const delta = dragDelta.current;
      const threshold = Math.min(120, window.innerWidth * 0.08);
      if (delta > threshold) goPrev();
      else if (delta < -threshold) goNext();
      try {
        (e.target as Element).releasePointerCapture?.(pointerIdRef.current || 0);
      } catch (err) {
        // ignore pointer capture release errors
      }
      dragStartX.current = null;
      dragDelta.current = 0;
      pointerIdRef.current = null;
    };

    wrapper.addEventListener('pointerdown', onPointerDown as any);
    window.addEventListener('pointermove', onPointerMove as any);
    window.addEventListener('pointerup', onPointerUp as any);
    window.addEventListener('resize', updateTransform);

    return () => {
      wrapper.removeEventListener('pointerdown', onPointerDown as any);
      window.removeEventListener('pointermove', onPointerMove as any);
      window.removeEventListener('pointerup', onPointerUp as any);
      window.removeEventListener('resize', updateTransform);
    };
  }, [startIndex, itemsPerPage, goNext, goPrev]);

  return (
    <section id="testimonials" className="py-20 px-4 bg-gray-50 dark:bg-gray-800">
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
            <p className="text-gray-600 dark:text-gray-300">Estamos preparando testimonios reales de nuestra comunidad.</p>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={goPrev}
              disabled={startIndex === 0}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg disabled:opacity-40"
              aria-label="Anterior"
            >
              <span className="text-2xl">‹</span>
            </button>

            <div className="overflow-hidden">
              <div
                ref={trackRef}
                className="flex gap-6 transition-transform duration-300"
              >
                {testimonials.map(item => (
                  <article
                    key={item._id}
                    className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg transition-shadow"
                    style={{ flex: '0 0 auto', boxSizing: 'border-box' }}
                  >
                    <div className="h-52">
                      {item.mediaType === 'video' ? (
                        isYouTubeUrl(item.mediaUrl) || isVimeoUrl(item.mediaUrl) ? (
                          <iframe
                            src={toEmbeddableUrl(item.mediaUrl)}
                            title={item.title}
                            className="w-full h-full"
                            loading="lazy"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <video src={item.mediaUrl} controls className="w-full h-full object-cover" />
                        )
                      ) : item.mediaType === 'image' ? (
                        <img src={item.mediaUrl} alt={item.altText || item.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 flex flex-col items-center justify-center text-red-600 dark:text-red-300">
                          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V8l-5-6z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 2v6h6" />
                          </svg>
                          <span className="mt-2 text-sm font-semibold">PDF</span>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <p className="text-sm uppercase tracking-wide text-blue-600 dark:text-blue-400 font-semibold">Testimonio</p>
                      <h3 className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{item.title}</h3>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <button
              onClick={goNext}
              disabled={startIndex >= maxStart}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg disabled:opacity-40"
              aria-label="Siguiente"
            >
              <span className="text-2xl">›</span>
            </button>
            {/* pagination dots */}
            <div className="mt-6 flex items-center justify-center gap-2">
              {Array.from({ length: Math.max(1, maxStart + 1) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStartIndex(i)}
                  className={`w-2.5 h-2.5 rounded-full transition ${i === startIndex ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                  aria-label={`Página ${i + 1}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
