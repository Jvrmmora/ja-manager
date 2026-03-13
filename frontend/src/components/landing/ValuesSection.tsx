import { normalizeRichTextHtml } from '../../utils/richText';

interface Value {
  title: string;
  description: string;
}

interface ValuesSectionProps {
  values: Value[];
}

const iconClass = 'w-7 h-7';

const FaithIcon = () => (
  <svg
    className={iconClass}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M8.5 8h7" />
  </svg>
);

const CommunityIcon = () => (
  <svg
    className={iconClass}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 11a3 3 0 100-6 3 3 0 000 6zm10 0a3 3 0 100-6 3 3 0 000 6zM2.5 20a4.5 4.5 0 019 0M12.5 20a4.5 4.5 0 019 0"
    />
  </svg>
);

const GrowthIcon = () => (
  <svg
    className={iconClass}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 19h16M6 16l4-4 3 3 5-6"
    />
  </svg>
);

const ServiceIcon = () => (
  <svg
    className={iconClass}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 21s-7-4.35-7-10a4 4 0 017-2.65A4 4 0 0119 11c0 5.65-7 10-7 10z"
    />
  </svg>
);

const TransformationIcon = () => (
  <svg
    className={iconClass}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3l2.7 5.47L21 9.4l-4.5 4.39L17.56 20 12 17.07 6.44 20l1.06-6.21L3 9.4l6.3-.93L12 3z"
    />
  </svg>
);

const ExcellenceIcon = () => (
  <svg
    className={iconClass}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3l2.7 5.47L21 9.4l-4.5 4.39L17.56 20 12 17.07 6.44 20l1.06-6.21L3 9.4l6.3-.93L12 3z"
    />
  </svg>
);

const getValueIcon = (title: string) => {
  const normalized = title.toLowerCase();

  if (normalized.includes('fe') || normalized.includes('cristo')) {
    return <FaithIcon />;
  }
  if (normalized.includes('comunidad') || normalized.includes('joven')) {
    return <CommunityIcon />;
  }
  if (normalized.includes('crecimiento')) {
    return <GrowthIcon />;
  }
  if (normalized.includes('servicio') || normalized.includes('amor')) {
    return <ServiceIcon />;
  }
  if (normalized.includes('transforma')) {
    return <TransformationIcon />;
  }

  return <ExcellenceIcon />;
};

export default function ValuesSection({ values }: ValuesSectionProps) {
  const displayValues =
    values && values.length > 0
      ? values
      : [
          {
            title: 'Fe',
            description:
              'Confianza en Dios y en su propósito para nuestras vidas',
          },
          {
            title: 'Comunidad',
            description: 'Somos más fuertes juntos, apoyándonos mutuamente',
          },
          {
            title: 'Crecimiento',
            description: 'Evolucionar espiritualmente cada día',
          },
          {
            title: 'Servicio',
            description: 'Servir a otros con amor y dedicación',
          },
          {
            title: 'Transformación',
            description: 'Cambiar el mundo a través de acciones cristianas',
          },
        ];

  return (
    <section id="values" className="py-20 px-4 bg-gray-50 dark:bg-gray-800">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">
          Nuestros Valores
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayValues.map((value, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-lg transition"
            >
              <div className="mb-4 text-blue-600 dark:text-blue-400">
                {getValueIcon(value.title)}
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                {value.title}
              </h3>
              <div
                className="rich-content text-gray-700 dark:text-gray-300"
                dangerouslySetInnerHTML={{
                  __html: normalizeRichTextHtml(value.description),
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
