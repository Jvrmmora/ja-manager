import { useState } from 'react';

interface GalleryMedia {
  _id: string;
  title: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  altText: string;
}

interface GallerySectionProps {
  galleryMedia: GalleryMedia[];
}

export default function GallerySection({ galleryMedia }: GallerySectionProps) {
  const [selectedImage, setSelectedImage] = useState<GalleryMedia | null>(null);

  if (!galleryMedia || galleryMedia.length === 0) {
    return (
      <section id="gallery" className="py-20 px-4 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            Galería
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-10">
            Próximamente compartiremos momentos de nuestra comunidad.
          </p>
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
          Galería
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {galleryMedia.map(media => (
            <button
              key={media._id}
              onClick={() => setSelectedImage(media)}
              className="relative group overflow-hidden rounded-lg aspect-square cursor-pointer"
            >
              <img
                src={media.mediaUrl}
                alt={media.altText || media.title}
                className="w-full h-full object-cover group-hover:scale-110 transition transform"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition"></div>
              {media.mediaType === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-white opacity-70 group-hover:opacity-100 transition"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2 10.5a1.5 1.5 0 113 0v-6a1.5 1.5 0 01-3 0v6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 20h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 11H12V5.5a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.256 13.37a2 2 0 01-1.25.632v-.99a.75.75 0 00-.75.75v.5zM4 8.25V8a1 1 0 011-1h1a.75.75 0 00.75-.75V6h1v1.25a.75.75 0 01-.75.75H5a1 1 0 01-1-1v.25z" />
                  </svg>
                </div>
              )}
            </button>
          ))}
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
              ) : (
                <video
                  src={selectedImage.mediaUrl}
                  controls
                  className="w-full rounded-lg"
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
    </section>
  );
}
