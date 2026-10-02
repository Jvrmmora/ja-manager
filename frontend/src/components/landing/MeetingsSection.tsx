import { useState } from 'react';
import ImageWithFallback from './ImageWithFallback';
import Reveal from './ui/Reveal';
import SectionHeader from './ui/SectionHeader';
import MeetingHoverMedia from './MeetingHoverMedia';
import grupoPequenoPoster from '../../assets/meetings/grupo-pequeno.webp';
import grupoPequenoVideo from '../../assets/meetings/grupo-pequeno-hover.mp4';
import cultoJovenPoster from '../../assets/meetings/culto-joven.webp';
import cultoJovenVideo from '../../assets/meetings/culto-joven-hover.mp4';
import clubesModeliaPoster from '../../assets/meetings/clubes-modelia.webp';
import clubesModeliaVideo from '../../assets/meetings/clubes-modelia-hover.mp4';

interface Meeting {
  _id: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl?: string;
  schedule: {
    day: string;
    time: string;
  };
  modality: 'virtual' | 'presencial' | 'híbrido';
  meetingLink?: string;
}

interface MeetingsSectionProps {
  meetings: Meeting[];
}

const MAX_VISIBLE_CARDS = 6;

// Reuniones con efecto hover (el logo se enciende). Se enlazan por título
// normalizado hasta que el CMS permita subir el clip por reunión.
const HOVER_MEDIA: Record<string, { poster: string; video: string }> = {
  'grupo pequeno': { poster: grupoPequenoPoster, video: grupoPequenoVideo },
  'culto joven': { poster: cultoJovenPoster, video: cultoJovenVideo },
  'clubes modelia': {
    poster: clubesModeliaPoster,
    video: clubesModeliaVideo,
  },
};

const hoverMediaKey = (title: string) =>
  title.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

const modalityBadge = (modality: string) => {
  switch (modality) {
    case 'virtual':
      return 'bg-white text-brand-wine';
    case 'híbrido':
      return 'bg-brand-amber text-ink-950';
    default:
      return 'bg-ink-950/80 text-white';
  }
};

const chipClass =
  'inline-flex h-[30px] items-center gap-1.5 rounded-full bg-sand-100 px-3 text-[13px] font-semibold text-[#9A3412] dark:bg-brand-orange/15 dark:text-brand-amber';

export default function MeetingsSection({ meetings }: MeetingsSectionProps) {
  const hasMeetings = meetings && meetings.length > 0;
  const [showAllMeetings, setShowAllMeetings] = useState(false);
  const visibleMeetings = showAllMeetings
    ? meetings
    : meetings.slice(0, MAX_VISIBLE_CARDS);

  return (
    <section id="meetings" className="bg-white dark:bg-ink-950 py-24 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Cada semana"
          title="Nuestras Reuniones"
          body="Espacios especiales para crecer juntos."
        />

        {!hasMeetings ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-80 rounded-3xl border border-sand-200 bg-cream dark:border-white/10 dark:bg-ink-900 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleMeetings.map((meeting, index) => {
                const hoverMedia = HOVER_MEDIA[hoverMediaKey(meeting.title)];
                const modalityLabel =
                  meeting.modality.charAt(0).toUpperCase() +
                  meeting.modality.slice(1);
                const badgeClass = `inline-flex h-[30px] items-center rounded-full px-3 text-xs font-bold ${modalityBadge(meeting.modality)}`;

                return (
                  <Reveal key={meeting._id} delay={(index % 3) * 0.1}>
                    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-sand-200 bg-cream transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_56px_-24px_rgba(220,51,64,0.45)] dark:border-white/10 dark:bg-ink-900">
                      {hoverMedia ? (
                        <MeetingHoverMedia
                          poster={hoverMedia.poster}
                          video={hoverMedia.video}
                          alt={meeting.title}
                        />
                      ) : (
                        <div className="relative h-52 overflow-hidden bg-gradient-to-br from-[#F7C9A3] via-[#E48A6B] to-brand-wine">
                          {meeting.imageUrl && (
                            <ImageWithFallback
                              src={meeting.imageUrl}
                              alt={meeting.title}
                              fallbackLabel={meeting.title}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              loading="lazy"
                            />
                          )}
                          <span
                            className={`absolute left-4 top-4 ${badgeClass}`}
                          >
                            {modalityLabel}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-grow flex-col gap-3.5 p-6 md:p-7">
                        <div className="flex flex-wrap gap-2">
                          <span className={chipClass}>
                            <svg
                              className="h-3.5 w-3.5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <rect x="3" y="4" width="18" height="18" rx="2" />
                              <path d="M16 2v4M8 2v4M3 10h18" />
                            </svg>
                            {meeting.schedule.day}
                          </span>
                          <span className={chipClass}>
                            <svg
                              className="h-3.5 w-3.5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <path d="M12 6v6l4 2" />
                            </svg>
                            {meeting.schedule.time}
                          </span>
                          {/* Con el póster animado el badge no va encima: taparía el texto del diseño */}
                          {hoverMedia && (
                            <span className={badgeClass}>{modalityLabel}</span>
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          <h3 className="m-0 font-display text-2xl font-semibold uppercase text-cocoa-900 dark:text-white">
                            {meeting.title}
                          </h3>
                          {meeting.subtitle && (
                            <p className="m-0 text-sm font-semibold text-brand-deep dark:text-brand-amber">
                              {meeting.subtitle}
                            </p>
                          )}
                        </div>

                        {meeting.description && (
                          <p className="m-0 text-[15px] leading-relaxed text-cocoa-500 dark:text-white/65 line-clamp-3">
                            {meeting.description}
                          </p>
                        )}

                        {meeting.meetingLink && (
                          <a
                            href={meeting.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-auto inline-flex items-center gap-2 self-start pt-2 text-[15px] font-semibold text-brand-deep hover:text-brand-wine dark:text-brand-amber"
                          >
                            Unirse a la reunión
                            <svg
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2.2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M5 12h14M13 6l6 6-6 6" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>

            {meetings.length > MAX_VISIBLE_CARDS && (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllMeetings(prev => !prev)}
                  className="inline-flex h-12 items-center rounded-full border border-sand-300 px-6 text-sm font-semibold text-cocoa-900 transition-colors hover:bg-ink-950 hover:text-white dark:border-white/20 dark:text-white"
                >
                  {showAllMeetings
                    ? 'Ver menos'
                    : `Ver más (${meetings.length - MAX_VISIBLE_CARDS})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
