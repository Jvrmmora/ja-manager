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

export default function ResourcesSection({
  title,
  body,
  resourcesMedia,
}: ResourcesSectionProps) {
  const [selectedResource, setSelectedResource] =
    useState<ResourceMedia | null>(null);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resourcesMedia.map(item => (
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
                    {item.mediaType === 'video' && (
                      <video
                        src={item.mediaUrl}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                      />
                    )}
                    {item.mediaType === 'document' && (
                      <div className="text-center px-6">
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
                        <p className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                          PDF
                        </p>
                      </div>
                    )}
                  </div>
                </button>

                <div className="p-5">
                  <p className="text-xs uppercase tracking-wide text-blue-600 dark:text-blue-400 font-semibold mb-1">
                    {item.mediaType === 'document'
                      ? 'Documento'
                      : item.mediaType}
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

            {selectedResource.mediaType === 'video' && (
              <video
                src={selectedResource.mediaUrl}
                controls
                className="w-full max-h-[70vh] rounded-lg"
              />
            )}

            {selectedResource.mediaType === 'document' && (
              <iframe
                src={selectedResource.mediaUrl}
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
