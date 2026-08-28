import { useState } from 'react';
import { normalizeRichTextHtml } from '../../utils/richText';

interface ResourceMedia {
  _id: string;
  title: string;
  description?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'document';
  altText: string;
}

interface ResourcesSectionProps {
  title?: string;
  body?: string;
  resourcesMedia: ResourceMedia[];
}

const MAX_VISIBLE_CARDS = 6;

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

const isPdfUrl = (url: string) => /\.pdf(\?|#|$)/i.test(url);

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

const getResourceTypeLabel = (item: ResourceMedia): string => {
  if (item.mediaType === 'image') return 'Imagen';
  if (item.mediaType === 'video') {
    if (isYouTubeUrl(item.mediaUrl)) return 'Video · YouTube';
    if (isVimeoUrl(item.mediaUrl)) return 'Video · Vimeo';
    return 'Video';
  }
  return isPdfUrl(item.mediaUrl) ? 'PDF' : 'Documento';
};

export default function ResourcesSection({
  title,
  body,
  resourcesMedia,
}: ResourcesSectionProps) {
  const [selectedResource, setSelectedResource] =
    useState<ResourceMedia | null>(null);
  const [showAllResources, setShowAllResources] = useState(false);
  const visibleResources = showAllResources
    ? resourcesMedia
    : resourcesMedia.slice(0, MAX_VISIBLE_CARDS);

  return (
    <section id="resources" className="py-20 px-4 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">
          {title || 'Recursos para crecer'}
        </h2>
        <div
          className="rich-content max-w-3xl mx-auto text-center text-gray-600 dark:text-gray-400 mb-12"
          dangerouslySetInnerHTML={{
            __html: normalizeRichTextHtml(
              body ||
                'Aquí encontrarás contenidos para aprender, compartir y fortalecer tu caminar con Dios.'
            ),
          }}
        />

        {resourcesMedia.length === 0 ? (
          <div className="max-w-3xl mx-auto rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center bg-gray-50 dark:bg-gray-800">
            <p className="text-gray-600 dark:text-gray-300">
              Estamos preparando materiales útiles para ti.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleResources.map(item => (
                <article
                  key={item._id}
                  className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg transition-shadow"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedResource(item)}
                    className="w-full text-left"
                  >
                    <div className="h-52 bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                      {item.mediaType === 'image' && (
                        <img
                          src={item.mediaUrl}
                          alt={item.altText || item.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                      {item.mediaType === 'video' &&
                        (isYouTubeUrl(item.mediaUrl) ||
                        isVimeoUrl(item.mediaUrl) ? (
                          <iframe
                            src={toEmbeddableUrl(item.mediaUrl)}
                            title={item.title}
                            className="w-full h-full"
                            loading="lazy"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <video
                            src={item.mediaUrl}
                            className="w-full h-full object-cover"
                            muted
                            preload="metadata"
                          />
                        ))}
                      {item.mediaType === 'document' && (
                        <div className="w-full h-full relative bg-gray-200 dark:bg-gray-700">
                          {isPdfUrl(item.mediaUrl) ? (
                            <iframe
                              src={`${item.mediaUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1`}
                              title={item.title}
                              className="w-full h-full pointer-events-none"
                              loading="lazy"
                            />
                          ) : (
                            <div className="text-center px-6 h-full flex items-center justify-center">
                              <svg
                                className="w-12 h-12 mx-auto text-red-500"
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
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/90 text-gray-900">
                              {isPdfUrl(item.mediaUrl)
                                ? 'Vista previa PDF'
                                : 'Documento'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>

                  <div className="p-5">
                    <p className="text-xs uppercase tracking-wide text-blue-600 dark:text-blue-400 font-semibold mb-1">
                      {getResourceTypeLabel(item)}
                    </p>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                        {item.description}
                      </p>
                    )}
                    <a
                      href={item.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex mt-4 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Abrir recurso
                    </a>
                  </div>
                </article>
              ))}
            </div>

            {resourcesMedia.length > MAX_VISIBLE_CARDS && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllResources(prev => !prev)}
                  className="inline-flex items-center px-5 py-2.5 rounded-lg border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-semibold text-sm transition"
                >
                  {showAllResources
                    ? 'Ver menos'
                    : `Ver más (${resourcesMedia.length - MAX_VISIBLE_CARDS})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedResource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedResource(null)}
        >
          <div
            className="relative bg-white dark:bg-gray-900 rounded-xl max-w-5xl w-full p-4"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedResource(null)}
              className="absolute top-2 right-2 p-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
            >
              Cerrar
            </button>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pr-16">
              {selectedResource.title}
            </h3>

            {selectedResource.mediaType === 'image' && (
              <img
                src={selectedResource.mediaUrl}
                alt={selectedResource.altText || selectedResource.title}
                className="w-full max-h-[70vh] object-contain rounded-lg"
              />
            )}

            {selectedResource.mediaType === 'video' &&
              (isYouTubeUrl(selectedResource.mediaUrl) ||
              isVimeoUrl(selectedResource.mediaUrl) ? (
                <iframe
                  src={toEmbeddableUrl(selectedResource.mediaUrl)}
                  title={selectedResource.title}
                  className="w-full h-[70vh] rounded-lg border border-gray-200 dark:border-gray-700"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={selectedResource.mediaUrl}
                  controls
                  className="w-full max-h-[70vh] rounded-lg"
                />
              ))}

            {selectedResource.mediaType === 'document' && (
              <iframe
                src={`${selectedResource.mediaUrl}${selectedResource.mediaUrl.includes('#') ? '&' : '#'}view=FitH`}
                title={selectedResource.title}
                className="w-full h-[70vh] rounded-lg border border-gray-200 dark:border-gray-700"
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
