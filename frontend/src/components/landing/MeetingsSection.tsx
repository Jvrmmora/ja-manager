interface Meeting {
  _id: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
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

export default function MeetingsSection({ meetings }: MeetingsSectionProps) {
  if (!meetings || meetings.length === 0) {
    return (
      <section id="meetings" className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            Nuestras Reuniones
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-10">
            Próximamente encontrarás aquí info sobre nuestros encuentros
            semanales.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="rounded-xl bg-gray-100 dark:bg-gray-800 h-56 animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const getModalityBadgeColor = (modality: string) => {
    switch (modality) {
      case 'virtual':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100';
      case 'presencial':
        return 'bg-orange-100 dark:bg-orange-900 text-orange-900 dark:text-orange-100';
      case 'híbrido':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100';
    }
  };

  return (
    <section id="meetings" className="py-20 px-4 bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">
          Nuestras Reuniones Semanales
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-12">
          Espacios especiales para crecer juntos
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meetings.map(meeting => (
            <div
              key={meeting._id}
              className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition transform hover:scale-105"
            >
              {/* Image */}
              {meeting.imageUrl && (
                <img
                  src={meeting.imageUrl}
                  alt={meeting.title}
                  className="w-full h-48 object-cover"
                  loading="lazy"
                />
              )}

              {/* Content */}
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                  {meeting.title}
                </h3>

                <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-3">
                  {meeting.subtitle}
                </p>

                <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
                  {meeting.description}
                </p>

                {/* Schedule & Modality */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00-.293.707l-2.828 2.829a1 1 0 101.415 1.415L9 10.414V6z" />
                    </svg>
                    <span className="text-sm">
                      {meeting.schedule.day} • {meeting.schedule.time}
                    </span>
                  </div>

                  <div>
                    <span
                      className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${getModalityBadgeColor(
                        meeting.modality
                      )}`}
                    >
                      {meeting.modality.charAt(0).toUpperCase() +
                        meeting.modality.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Join Button */}
                {meeting.meetingLink && (
                  <a
                    href={meeting.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full block text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition"
                  >
                    Unirse
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
