import { useState } from 'react';
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

export default function GallerySection({
  title,
  body,
  galleryMedia,
}: GallerySectionProps) {
  const [selectedImage, setSelectedImage] = useState<GalleryMedia | null>(null);
  const loopGallery =
    galleryMedia.length > 1 ? [...galleryMedia, ...galleryMedia] : galleryMedia;
  const animationDurationSeconds = Math.max(galleryMedia.length * 6, 26);

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

          <div className="overflow-hidden rounded-2xl">
            <div
              className="gallery-loop-track flex items-center gap-5 w-max py-2"
              style={{
                animationDuration: `${animationDurationSeconds}s`,
              }}
            >
              {loopGallery.map((media, idx) => (
                <button
                  key={`${media._id}-${idx}`}
                  onClick={() => setSelectedImage(media)}
                  className="relative group overflow-hidden rounded-2xl w-[260px] sm:w-[280px] md:w-[300px] h-[340px] cursor-pointer border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all bg-white dark:bg-gray-900"
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
        </div>

        {/* Lightbox Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-4xl w-full">
              {/* Close button */}
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-8 right-0 text-white hover:text-gray-300 transition"
                aria-label="Close"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Image/Video */}
              {selectedImage.mediaType === 'image' ? (
                <img
                  src={selectedImage.mediaUrl}
                  alt={selectedImage.altText || selectedImage.title}
                  className="w-full rounded-lg"
                  loading="lazy"
                />
              ) : selectedImage.mediaType === 'video' ? (
                <video
                  src={selectedImage.mediaUrl}
                  controls
                  className="w-full rounded-lg"
                />
              ) : (
                <iframe
                  src={selectedImage.mediaUrl}
                  title={selectedImage.title}
                  className="w-full h-[70vh] rounded-lg border border-gray-700"
                />
              )}

              {/* Title */}
              <p className="text-center text-white mt-4">
                {selectedImage.title}
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .gallery-loop-track {
          animation-name: galleryLoop;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform;
        }

        .gallery-loop-track:hover {
          animation-play-state: paused;
        }

        @keyframes galleryLoop {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .gallery-loop-track {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
