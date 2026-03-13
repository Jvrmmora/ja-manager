interface LocationSectionProps {
  content: {
    addressLabel: string;
    mapEmbedUrl: string;
    mapsDirectionsUrl: string;
  };
}

export default function LocationSection({ content }: LocationSectionProps) {
  return (
    <section id="location" className="py-20 px-4 bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">
          Ubicación
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Map */}
          <div className="h-96 rounded-lg overflow-hidden shadow-lg">
            {content.mapEmbedUrl ? (
              <iframe
                title="Ubicación Jóvenes Modelia"
                width="100%"
                height="100%"
                src={content.mapEmbedUrl}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            ) : (
              <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                <p className="text-gray-600 dark:text-gray-400">
                  Mapa no disponible
                </p>
              </div>
            )}
          </div>

          {/* Address Info */}
          <div className="flex flex-col justify-center">
            <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
              Nos encuentras en:
            </h3>

            <div className="bg-blue-50 dark:bg-blue-900 p-6 rounded-lg mb-6">
              <p className="text-lg text-gray-800 dark:text-gray-200 font-semibold">
                {content.addressLabel}
              </p>
            </div>

            {/* Directions Button */}
            {content.mapsDirectionsUrl && (
              <a
                href={content.mapsDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition w-full"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                Cómo llegar
              </a>
            )}

            {/* Hours */}
            <div className="mt-8">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                Nuestras reuniones:
              </h4>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 21s-7-4.35-7-10a7 7 0 1114 0c0 5.65-7 10-7 10z"
                    />
                    <circle cx="12" cy="11" r="2.5" strokeWidth={2} />
                  </svg>
                  <span>Grupo Pequeño - Entre Semana</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 21s-7-4.35-7-10a7 7 0 1114 0c0 5.65-7 10-7 10z"
                    />
                    <circle cx="12" cy="11" r="2.5" strokeWidth={2} />
                  </svg>
                  <span>Escuela Sabática - Sábado Mañana</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 21s-7-4.35-7-10a7 7 0 1114 0c0 5.65-7 10-7 10z"
                    />
                    <circle cx="12" cy="11" r="2.5" strokeWidth={2} />
                  </svg>
                  <span>Culto Joven - Sábado por la noche</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
