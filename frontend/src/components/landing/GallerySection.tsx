import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import ImageWithFallback from './ImageWithFallback';
import SectionHeader from './ui/SectionHeader';

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

const MAX_VISIBLE = 8;

// Mosaico: algunas piezas ocupan dos filas o dos columnas.
const tileSpan = (idx: number) => {
  const slot = idx % 6;
  if (slot === 0) return 'row-span-2';
  if (slot === 2 || slot === 3) return 'lg:col-span-2';
  return '';
};

export default function GallerySection({
  title,
  body,
  galleryMedia,
}: GallerySectionProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  const total = galleryMedia?.length ?? 0;
  const visible = showAll ? galleryMedia : galleryMedia?.slice(0, MAX_VISIBLE);

  const showPrev = useCallback(() => {
    setSelectedIndex(prev =>
      prev === null ? prev : (prev - 1 + total) % total
    );
  }, [total]);

  const showNext = useCallback(() => {
    setSelectedIndex(prev => (prev === null ? prev : (prev + 1) % total));
  }, [total]);

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
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [selectedIndex, showPrev, showNext]);

  if (!galleryMedia || total === 0) {
    return (
      <section id="gallery" className="bg-ink-950 py-24 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Momentos"
            title={title || 'Galería'}
            body={body || 'Próximamente compartiremos momentos de nuestra comunidad.'}
            tone="dark"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="aspect-[4/5] rounded-3xl border border-white/10 bg-ink-900 animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const selectedMedia =
    selectedIndex !== null ? galleryMedia[selectedIndex] : null;

  const renderTileMedia = (media: GalleryMedia) => {
    if (media.mediaType === 'image') {
      return (
        <ImageWithFallback
          src={media.mediaUrl}
          alt={media.altText || media.title}
          fallbackLabel={media.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          loading="lazy"
        />
      );
    }
    if (media.mediaType === 'video') {
      return (
        <>
          <video
            src={media.mediaUrl}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/25 backdrop-blur-sm border border-white/50">
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M8 5v10l8-5-8-5z" />
              </svg>
            </span>
          </span>
        </>
      );
    }
    return (
      <div className="w-full h-full bg-gradient-to-br from-brand-wine to-ink-900 flex flex-col items-center justify-center text-white/85">
        <svg
          className="w-12 h-12"
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
            d="M14 2v6h6M9 14h6M9 18h6"
          />
        </svg>
        <span className="mt-2 text-xs font-semibold">Documento</span>
      </div>
    );
  };

  return (
    <section id="gallery" className="bg-ink-950 py-24 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Momentos"
          title={title || 'Galería'}
          body={body || 'Momentos de nuestra comunidad.'}
          tone="dark"
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 auto-rows-[180px] sm:auto-rows-[220px] gap-3 sm:gap-4 [grid-auto-flow:dense]">
          {visible.map((media, idx) => (
            <button
              key={media._id}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-ink-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-amber/50 transition-shadow hover:shadow-[0_28px_56px_-24px_rgba(242,106,46,0.45)] ${tileSpan(idx)}`}
            >
              {renderTileMedia(media)}

              <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink-950/85 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />

              <span className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-ink-950/60 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </span>

              <span className="absolute inset-x-0 bottom-0 p-4 text-left">
                <span className="block text-sm font-semibold text-white line-clamp-2">
                  {media.title}
                </span>
              </span>
            </button>
          ))}
        </div>

        {total > MAX_VISIBLE && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={() => setShowAll(prev => !prev)}
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-6 text-sm font-semibold text-white transition-colors hover:border-brand-amber hover:text-brand-amber"
            >
              {showAll ? 'Ver menos' : `Ver todas (${total})`}
              <svg
                className={`h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Lightbox */}
        {selectedMedia && selectedIndex !== null && createPortal(
          <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-[#0C0609]/95 p-4 sm:p-6 backdrop-blur-sm"
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
            <button
              type="button"
              onClick={() => setSelectedIndex(null)}
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white hover:border-white/50 transition"
              aria-label="Cerrar"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            <div
              className="relative flex max-h-full w-full max-w-5xl flex-col items-center"
              onClick={e => e.stopPropagation()}
            >
              {selectedMedia.mediaType === 'image' ? (
                <motion.img
                  key={selectedMedia._id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  src={selectedMedia.mediaUrl}
                  alt={selectedMedia.altText || selectedMedia.title}
                  className="max-h-[78vh] w-auto max-w-full rounded-2xl object-contain select-none"
                />
              ) : selectedMedia.mediaType === 'video' ? (
                <video
                  src={selectedMedia.mediaUrl}
                  controls
                  autoPlay
                  className="max-h-[78vh] w-full rounded-2xl"
                />
              ) : (
                <iframe
                  src={selectedMedia.mediaUrl}
                  title={selectedMedia.title}
                  className="h-[78vh] w-full rounded-2xl border border-white/10 bg-white"
                />
              )}

              {total > 1 && (
                <>
                  <button
                    type="button"
                    onClick={showPrev}
                    className="absolute left-0 top-1/2 -translate-y-1/2 sm:-translate-x-14 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-ink-950/60 text-white hover:border-brand-amber hover:text-brand-amber transition"
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
                    type="button"
                    onClick={showNext}
                    className="absolute right-0 top-1/2 -translate-y-1/2 sm:translate-x-14 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-ink-950/60 text-white hover:border-brand-amber hover:text-brand-amber transition"
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

              <div className="mt-4 text-center text-white">
                <p className="font-display text-lg uppercase tracking-wide">{selectedMedia.title}</p>
                {total > 1 && (
                  <p className="mt-1 text-sm text-white/60">
                    {selectedIndex + 1} / {total}
                  </p>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </section>
  );
}
