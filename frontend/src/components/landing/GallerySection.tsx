import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeRichTextHtml } from '../../utils/richText';
import ImageWithFallback from './ImageWithFallback';

interface GalleryMedia {
  _id: string;
  title: string;
  description?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'document';
  altText: string;
}

interface GallerySectionProps {
  title?: string;
  body?: string;
  galleryMedia: GalleryMedia[];
}

const AUTO_SCROLL_PX_PER_FRAME = 0.6;
const RESUME_DELAY_MS = 2500;

export default function GallerySection({
  title,
  body,
  galleryMedia,
}: GallerySectionProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  const total = galleryMedia.length;
  const hasLoop = total > 1;
  const loopGallery = hasLoop ? [...galleryMedia, ...galleryMedia] : galleryMedia;

  const pauseAutoScroll = useCallback((withResume: boolean) => {
    pausedRef.current = true;
    if (resumeTimerRef.current) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    if (withResume) {
      resumeTimerRef.current = window.setTimeout(() => {
        pausedRef.current = false;
      }, RESUME_DELAY_MS);
    }
  }, []);

  const resumeAutoScroll = useCallback(() => {
    if (resumeTimerRef.current) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    pausedRef.current = false;
  }, []);

  // Auto-scroll con requestAnimationFrame sobre un contenedor scrollable real,
  // así los gestos táctiles (iPhone/iPad) funcionan de forma nativa.
  useEffect(() => {
    const el = trackRef.current;
    if (!el || !hasLoop) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReducedMotion) {
      return;
    }

    let rafId = 0;
    const step = () => {
      if (!pausedRef.current && el.scrollWidth > el.clientWidth) {
        const half = el.scrollWidth / 2;
        let next = el.scrollLeft + AUTO_SCROLL_PX_PER_FRAME;
        if (next >= half) {
          next -= half;
        }
        el.scrollLeft = next;
      }
      rafId = window.requestAnimationFrame(step);
    };
    rafId = window.requestAnimationFrame(step);

    const onUserScroll = () => pauseAutoScroll(true);
    const onEnter = () => pauseAutoScroll(false);
    const onLeave = () => resumeAutoScroll();

    el.addEventListener('pointerdown', onUserScroll, { passive: true });
    el.addEventListener('touchstart', onUserScroll, { passive: true });
    el.addEventListener('wheel', onUserScroll, { passive: true });
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);

    return () => {
      window.cancelAnimationFrame(rafId);
      el.removeEventListener('pointerdown', onUserScroll);
      el.removeEventListener('touchstart', onUserScroll);
      el.removeEventListener('wheel', onUserScroll);
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      if (resumeTimerRef.current) {
        window.clearTimeout(resumeTimerRef.current);
      }
    };
  }, [hasLoop, pauseAutoScroll, resumeAutoScroll]);

  const showPrev = useCallback(() => {
    setSelectedIndex(prev =>
      prev === null ? prev : (prev - 1 + total) % total
    );
  }, [total]);

  const showNext = useCallback(() => {
    setSelectedIndex(prev => (prev === null ? prev : (prev + 1) % total));
  }, [total]);

  // Navegación con teclado dentro del lightbox.
  useEffect(() => {
    if (selectedIndex === null) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        showPrev();
      } else if (e.key === 'ArrowRight') {
        showNext();
      } else if (e.key === 'Escape') {
        setSelectedIndex(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIndex, showPrev, showNext]);

  if (!galleryMedia || galleryMedia.length === 0) {
    return (
      <section id="gallery" className="py-20 px-4 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            {title || 'Galería'}
          </h2>
          <div
            className="rich-content text-gray-500 dark:text-gray-400 mb-10"
            dangerouslySetInnerHTML={{
              __html: normalizeRichTextHtml(
                body ||
                  'Próximamente compartiremos momentos de nuestra comunidad.'
              ),
            }}
          />
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="aspect-square rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const selectedMedia =
    selectedIndex !== null ? galleryMedia[selectedIndex] : null;

  return (
    <section id="gallery" className="py-20 px-4 bg-gray-50 dark:bg-gray-800">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">
          {title || 'Galería'}
        </h2>
        {body && (
          <div
            className="rich-content max-w-3xl mx-auto text-center text-gray-600 dark:text-gray-400 mb-10"
            dangerouslySetInnerHTML={{ __html: normalizeRichTextHtml(body) }}
          />
        )}

        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800 z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-gray-50 to-transparent dark:from-gray-800 z-10" />

          <div
            ref={trackRef}
            className="gallery-scroll overflow-x-auto overflow-y-hidden rounded-2xl"
          >
            <div className="flex items-center gap-5 w-max py-2">
              {loopGallery.map((media, idx) => (
                <button
                  key={`${media._id}-${idx}`}
                  onClick={() => setSelectedIndex(idx % total)}
                  className="relative group overflow-hidden rounded-2xl w-[260px] sm:w-[280px] md:w-[300px] h-[340px] cursor-pointer border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all bg-white dark:bg-gray-900 flex-shrink-0"
                >
                  {media.mediaType === 'image' && (
                    <ImageWithFallback
                      src={media.mediaUrl}
                      alt={media.altText || media.title}
                      fallbackLabel={media.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  )}
                  {media.mediaType === 'video' && (
                    <video
                      src={media.mediaUrl}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                    />
                  )}
                  {media.mediaType === 'document' && (
                    <div className="w-full h-full bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 flex flex-col items-center justify-center text-red-600 dark:text-red-300">
                      <svg
                        className="w-14 h-14"
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
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M9 14h6M9 18h6"
                        />
                      </svg>
                      <p className="mt-2 font-semibold">PDF</p>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/15 group-hover:bg-black/30 transition-colors" />

                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-left">
                    <p className="text-white font-semibold line-clamp-2 text-sm">
                      {media.title}
                    </p>
                  </div>

                  {media.mediaType === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border border-white/40">
                        <svg
                          className="w-7 h-7 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M8 5v10l8-5-8-5z" />
                        </svg>
                      </span>
                    </div>
                  )}

                  {media.mediaType === 'document' && (
                    <div className="absolute inset-0 flex items-end justify-center pb-5">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black/60 text-white">
                        Ver documento
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {hasLoop && (
            <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-500 sm:hidden">
              Desliza para ver más →
            </p>
          )}
        </div>

        {/* Lightbox Modal */}
        {selectedMedia && selectedIndex !== null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
            onClick={() => setSelectedIndex(null)}
            onTouchStart={e => {
              touchStartXRef.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={e => {
              const start = touchStartXRef.current;
              const end = e.changedTouches[0]?.clientX ?? null;
              touchStartXRef.current = null;
              if (start === null || end === null) {
                return;
              }
              const delta = end - start;
              if (Math.abs(delta) > 50) {
                if (delta < 0) {
                  showNext();
                } else {
                  showPrev();
                }
              }
            }}
          >
            <div
              className="relative max-w-4xl w-full"
              onClick={e => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedIndex(null)}
                className="absolute -top-9 right-0 text-white hover:text-gray-300 transition"
                aria-label="Cerrar"
              >
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Media */}
              {selectedMedia.mediaType === 'image' ? (
                <img
                  src={selectedMedia.mediaUrl}
                  alt={selectedMedia.altText || selectedMedia.title}
                  className="w-full max-h-[80vh] object-contain rounded-lg select-none"
                />
              ) : selectedMedia.mediaType === 'video' ? (
                <video
                  src={selectedMedia.mediaUrl}
                  controls
                  className="w-full max-h-[80vh] rounded-lg"
                />
              ) : (
                <iframe
                  src={selectedMedia.mediaUrl}
                  title={selectedMedia.title}
                  className="w-full h-[70vh] rounded-lg border border-gray-700"
                />
              )}

              {/* Prev / Next */}
              {total > 1 && (
                <>
                  <button
                    onClick={showPrev}
                    className="absolute left-1 sm:-left-14 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition"
                    aria-label="Anterior"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={showNext}
                    className="absolute right-1 sm:-right-14 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition"
                    aria-label="Siguiente"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </>
              )}

              {/* Title + counter */}
              <div className="mt-4 text-center text-white">
                <p className="font-medium">{selectedMedia.title}</p>
                {total > 1 && (
                  <p className="text-sm text-white/60 mt-1">
                    {selectedIndex + 1} / {total}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .gallery-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
          -webkit-overflow-scrolling: touch;
        }
        .gallery-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
