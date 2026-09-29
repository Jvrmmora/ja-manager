import { useState, useEffect, useRef } from 'react';
import { normalizeRichTextHtml } from '../../utils/richText';
import ImageWithFallback from './ImageWithFallback';
import Reveal from './ui/Reveal';

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
  try {
    const parsed = new URL(url.trim());
    const hostname = parsed.hostname.toLowerCase();

    if (hostname.includes('youtu.be')) {
      return parsed.pathname.replace(/^\/+/, '').split('/')[0] || null;
    }

    if (hostname.includes('youtube.com')) {
      const videoId = parsed.searchParams.get('v');
      if (videoId) return videoId;

      const pathParts = parsed.pathname.split('/').filter(Boolean);
      const segment = pathParts[0];
      if ((segment === 'shorts' || segment === 'live' || segment === 'embed') && pathParts[1]) {
        return pathParts[1];
      }
    }

    if (hostname.includes('youtube-nocookie.com')) {
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'embed' && pathParts[1]) {
        return pathParts[1];
      }
    }
  } catch {
    // ignore invalid URL format
  }

  return null;
};

const isYouTubeUrl = (url: string) => !!getYouTubeVideoId(url);

const isVimeoUrl = (url: string) => /vimeo\.com\//i.test(url);

const toEmbeddableUrl = (url: string): string => {
  const videoId = getYouTubeVideoId(url);
  if (videoId) {
    try {
      const parsed = new URL(url.trim());
      const params = new URLSearchParams();

      ['si', 'start', 't', 'end', 'list', 'index', 'autoplay', 'mute', 'loop', 'playsinline', 'origin']
        .forEach(key => {
          const value = parsed.searchParams.get(key);
          if (value) params.set(key, value);
        });

      params.set('rel', '0');
      params.set('modestbranding', '1');

      const query = params.toString();
      return `https://www.youtube.com/embed/${videoId}${query ? `?${query}` : ''}`;
    } catch {
      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
    }
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
  const [blockedVideos, setBlockedVideos] = useState<Record<string, boolean>>({});
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
    <section id="testimonials" className="bg-ink-950 px-4 sm:px-6 lg:px-8 py-24 md:py-28">
      <div className="relative max-w-7xl mx-auto overflow-hidden rounded-[32px] md:rounded-[36px] border border-white/[0.08] bg-ink-900 px-5 py-12 sm:px-10 md:px-14 md:py-16">
        <div className="pointer-events-none absolute -left-52 -top-52 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(242,106,46,.22)_0%,rgba(30,18,24,0)_65%)] motion-safe:animate-ember" />
        <span className="text-fire pointer-events-none absolute right-8 top-2 font-display text-[180px] leading-none opacity-80 select-none" aria-hidden="true">
          “
        </span>

        <div className="relative mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Reveal className="flex max-w-2xl flex-col gap-4">
            <span className="eyebrow text-brand-amber">Testimonios</span>
            <h2 className="m-0 font-display text-4xl md:text-6xl font-semibold uppercase leading-none text-white">
              {title || 'Historias que inspiran'}
            </h2>
            <div
              className="rich-content rich-content-invert text-base md:text-lg"
              dangerouslySetInnerHTML={{
                __html: normalizeRichTextHtml(
                  body ||
                    'Muy pronto compartiremos testimonios de jóvenes que han encontrado amistad, propósito y crecimiento espiritual en Modelia.'
                ),
              }}
            />
          </Reveal>
          {hasTestimonials && maxStart > 0 && (
            <div className="flex gap-2.5">
              <button
                onClick={goPrev}
                disabled={startIndex === 0}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-white/50 disabled:opacity-35"
                aria-label="Anterior"
              >
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <button
                onClick={goNext}
                disabled={startIndex >= maxStart}
                className="bg-fire flex h-12 w-12 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-35"
                aria-label="Siguiente"
              >
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          )}
        </div>

        {!hasTestimonials ? (
          <div className="relative rounded-3xl border border-dashed border-white/15 p-10 text-center">
            <p className="text-white/70">Estamos preparando testimonios reales de nuestra comunidad.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="overflow-hidden">
              <div
                ref={trackRef}
                className="flex gap-6 transition-transform duration-300"
              >
                {testimonials.map(item => (
                  <article
                    key={item._id}
                    className="rounded-3xl overflow-hidden border border-white/10 bg-ink-950 transition-colors hover:border-brand-amber/40"
                    style={{ flex: '0 0 auto', boxSizing: 'border-box' }}
                  >
                    <div className="h-56 bg-ink-800">
                      {item.mediaType === 'video' ? (
                        isYouTubeUrl(item.mediaUrl) || isVimeoUrl(item.mediaUrl) ? (
                          blockedVideos[item._id] ? (
                            <div className="w-full h-full bg-ink-950 flex items-center justify-center text-center px-4">
                              <div>
                                <p className="text-white text-sm font-semibold">No se pudo reproducir este video</p>
                                <a
                                  href={item.mediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block mt-3 text-sm font-medium text-brand-amber underline"
                                >
                                  Abrir en YouTube
                                </a>
                              </div>
                            </div>
                          ) : (
                            <iframe
                              src={toEmbeddableUrl(item.mediaUrl)}
                              title={item.title}
                              className="w-full h-full"
                              loading="lazy"
                              referrerPolicy="strict-origin-when-cross-origin"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                              onError={() =>
                                setBlockedVideos(prev => ({ ...prev, [item._id]: true }))
                              }
                            />
                          )
                        ) : (
                          <video src={item.mediaUrl} controls className="w-full h-full object-cover" />
                        )
                      ) : item.mediaType === 'image' ? (
                        <ImageWithFallback src={item.mediaUrl} alt={item.altText || item.title} fallbackLabel={item.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-brand-wine to-ink-900 flex flex-col items-center justify-center text-white/85">
                          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V8l-5-6z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 2v6h6" />
                          </svg>
                          <span className="mt-2 text-sm font-semibold">PDF</span>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-brand-amber">Testimonio</p>
                      <h3 className="m-0 mt-2 font-display text-xl font-semibold uppercase text-white">{item.title}</h3>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {/* pagination dots */}
            <div className="mt-8 flex items-center justify-center gap-2">
              {Array.from({ length: Math.max(1, maxStart + 1) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStartIndex(i)}
                  className={`h-2 rounded-full transition-all ${i === startIndex ? 'w-7 bg-brand-orange' : 'w-2 bg-white/30 hover:bg-white/50'}`}
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
