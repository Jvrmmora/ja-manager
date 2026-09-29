import { useState } from 'react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { normalizeRichTextHtml } from '../../utils/richText';
import Dialog from './ui/Dialog';
import Reveal from './ui/Reveal';
import SectionHeader from './ui/SectionHeader';

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

const isPdfUrl = (url: string) => /\.pdf(\?|#|$)/i.test(url);

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
  const [blockedVideos, setBlockedVideos] = useState<Record<string, boolean>>({});
  const visibleResources = showAllResources
    ? resourcesMedia
    : resourcesMedia.slice(0, MAX_VISIBLE_CARDS);

  return (
    <section id="resources" className="bg-cream dark:bg-ink-900 py-24 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Recursos"
          title={title || 'Recursos para crecer'}
          body={
            body ||
            'Aquí encontrarás contenidos para aprender, compartir y fortalecer tu caminar con Dios.'
          }
        />

        {resourcesMedia.length === 0 ? (
          <div className="max-w-3xl mx-auto rounded-3xl border border-dashed border-sand-300 p-10 text-center bg-white dark:border-white/15 dark:bg-ink-800">
            <p className="text-cocoa-500 dark:text-white/70">
              Estamos preparando materiales útiles para ti.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleResources.map((item, index) => (
                <Reveal key={item._id} delay={(index % 3) * 0.08}>
                <article
                  className="group h-full flex flex-col rounded-3xl overflow-hidden border border-sand-200 bg-white transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_56px_-24px_rgba(78,15,58,0.4)] dark:border-white/10 dark:bg-ink-800"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedResource(item)}
                    className="w-full text-left"
                  >
                    <div className="h-52 bg-sand-50 dark:bg-ink-900 flex items-center justify-center overflow-hidden">
                      {item.mediaType === 'image' && (
                        <img
                          src={item.mediaUrl}
                          alt={item.altText || item.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                        />
                      )}
                      {item.mediaType === 'video' &&
                        (isYouTubeUrl(item.mediaUrl) ||
                        isVimeoUrl(item.mediaUrl) ? (
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
                          <video
                            src={item.mediaUrl}
                            className="w-full h-full object-cover"
                            muted
                            preload="metadata"
                          />
                        ))}
                      {item.mediaType === 'document' && (
                        <div className="w-full h-full relative bg-sand-100 dark:bg-ink-900">
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
                                className="w-12 h-12 mx-auto text-brand-ember"
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
                          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-ink-950/60 to-transparent">
                            <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white text-cocoa-900">
                              {isPdfUrl(item.mediaUrl)
                                ? 'Vista previa PDF'
                                : 'Documento'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>

                  <div className="flex flex-grow flex-col p-6">
                    <p className="text-xs uppercase tracking-[0.12em] text-brand-deep dark:text-brand-amber font-bold mb-1.5">
                      {getResourceTypeLabel(item)}
                    </p>
                    <h3 className="m-0 font-display text-xl font-semibold uppercase text-cocoa-900 dark:text-white">
                      {item.title}
                    </h3>
                    {item.description && (
                      <div
                        className="mt-2 rich-content text-sm text-cocoa-500 dark:text-white/65 line-clamp-3 break-words [&_a]:break-words [&_p]:my-0"
                        dangerouslySetInnerHTML={{
                          __html: normalizeRichTextHtml(item.description),
                        }}
                      />
                    )}
                    <a
                      href={item.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto self-start pt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-deep hover:text-brand-wine dark:text-brand-amber"
                    >
                      <ArrowTopRightOnSquareIcon
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                      Abrir recurso
                    </a>
                  </div>
                </article>
                </Reveal>
              ))}
            </div>

            {resourcesMedia.length > MAX_VISIBLE_CARDS && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllResources(prev => !prev)}
                  className="inline-flex h-12 items-center rounded-full border border-sand-300 px-6 text-sm font-semibold text-cocoa-900 transition-colors hover:bg-ink-950 hover:text-white dark:border-white/20 dark:text-white"
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

      <Dialog
        open={Boolean(selectedResource)}
        onClose={() => setSelectedResource(null)}
        title={selectedResource?.title || ''}
      >
        {selectedResource && (
          <>
            {selectedResource.description && (
              <div
                className="rich-content rich-content-invert mb-4 text-sm break-words"
                dangerouslySetInnerHTML={{
                  __html: normalizeRichTextHtml(selectedResource.description),
                }}
              />
            )}

            {selectedResource.mediaType === 'image' && (
              <img
                src={selectedResource.mediaUrl}
                alt={selectedResource.altText || selectedResource.title}
                className="w-full max-h-[70vh] object-contain rounded-2xl"
              />
            )}

            {selectedResource.mediaType === 'video' &&
              (isYouTubeUrl(selectedResource.mediaUrl) ||
              isVimeoUrl(selectedResource.mediaUrl) ? (
                <iframe
                  src={toEmbeddableUrl(selectedResource.mediaUrl)}
                  title={selectedResource.title}
                  className="w-full h-[70vh] rounded-2xl border border-white/10"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={selectedResource.mediaUrl}
                  controls
                  className="w-full max-h-[70vh] rounded-2xl"
                />
              ))}

            {selectedResource.mediaType === 'document' && (
              <iframe
                src={`${selectedResource.mediaUrl}${selectedResource.mediaUrl.includes('#') ? '&' : '#'}view=FitH`}
                title={selectedResource.title}
                className="w-full h-[70vh] rounded-2xl border border-white/10 bg-white"
              />
            )}
          </>
        )}
      </Dialog>
    </section>
  );
}
