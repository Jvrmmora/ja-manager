import { normalizeRichTextHtml } from '../../utils/richText';

interface AboutSectionProps {
  content: {
    aboutTitle?: string;
    aboutBody: string;
  };
}

export default function AboutSection({ content }: AboutSectionProps) {
  return (
    <section
      id="about"
      className="py-20 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900"
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">
          {content.aboutTitle || 'Quiénes Somos'}
        </h2>

        <div className="prose dark:prose-invert max-w-none">
          <div
            className="rich-content text-lg text-gray-700 dark:text-gray-300 leading-relaxed text-center"
            dangerouslySetInnerHTML={{
              __html: normalizeRichTextHtml(content.aboutBody),
            }}
          />
        </div>

        {/* Stats or highlights */}
        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              3
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Reuniones Semanales
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              50+
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Jóvenes Apasionados
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              ∞
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Impacto Potencial
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
