import { useState } from 'react';
import ImageWithFallback from './ImageWithFallback';

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

const modalityBadge = (modality: string) => {
  switch (modality) {
    case 'virtual':
      return 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200';
    case 'híbrido':
      return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200';
    default:
      return 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200';
  }
};

export default function MeetingsSection({ meetings }: MeetingsSectionProps) {
  const hasMeetings = meetings && meetings.length > 0;
  const [showAllMeetings, setShowAllMeetings] = useState(false);
  const visibleMeetings = showAllMeetings
    ? meetings
    : meetings.slice(0, MAX_VISIBLE_CARDS);

  return (
    <section
      id="meetings"
      className="py-20 px-4 bg-gradient-to-b from-white to-slate-50 dark:from-gray-900 dark:to-gray-800"
    >
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">
          Nuestras Reuniones Semanales
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-12">
          Espacios especiales para crecer juntos
        </p>

        {!hasMeetings ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-64 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleMeetings.map(meeting => (
                <article
                  key={meeting._id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm hover:shadow-xl transition-all"
                >
                  {/* Image */}
                  {meeting.imageUrl && (
                    <div className="h-56 overflow-hidden">
                      <ImageWithFallback
                        src={meeting.imageUrl}
                        alt={meeting.title}
                        fallbackLabel={meeting.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex flex-grow flex-col p-5">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {meeting.title}
                    </h3>

                    <p className="min-h-[1.25rem] text-sm text-blue-600 dark:text-blue-400 font-semibold mt-1">
                      {meeting.subtitle}
                    </p>

                    <p className="mt-2 min-h-[2.5rem] text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {meeting.description}
                    </p>

                    {/* Footer pinned to the bottom so it lines up across cards */}
                    <div className="mt-auto space-y-3 pt-4">
                      {/* Schedule */}
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                        <svg
                          className="w-4 h-4 shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                          />
                        </svg>
                        <span>
                          {meeting.schedule.day} • {meeting.schedule.time}
                        </span>
                      </div>

                      {/* Modality badge */}
                      <div>
                        <span
                          className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${modalityBadge(meeting.modality)}`}
                        >
                          {meeting.modality.charAt(0).toUpperCase() +
                            meeting.modality.slice(1)}
                        </span>
                      </div>

                      {/* Join link */}
                      {meeting.meetingLink && (
                        <a
                          href={meeting.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Unirse
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {meetings.length > MAX_VISIBLE_CARDS && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllMeetings(prev => !prev)}
                  className="inline-flex items-center px-5 py-2.5 rounded-lg border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-semibold text-sm transition"
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
