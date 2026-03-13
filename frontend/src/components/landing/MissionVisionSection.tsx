interface MissionVisionSectionProps {
  content: {
    missionTitle?: string;
    missionText: string;
    visionTitle?: string;
    visionText: string;
  };
}

export default function MissionVisionSection({
  content,
}: MissionVisionSectionProps) {
  return (
    <section id="mission" className="py-20 px-4 bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">
          Nuestra Misión y Visión
        </h2>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Mission Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 p-8 rounded-lg border-l-4 border-blue-600">
            <h3 className="text-2xl font-bold mb-4 text-blue-900 dark:text-blue-100">
              {content.missionTitle || 'Misión'}
            </h3>
            <div
              className="text-lg text-gray-700 dark:text-gray-300"
              dangerouslySetInnerHTML={{ __html: content.missionText || '' }}
            />
          </div>

          {/* Vision Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900 dark:to-emerald-800 p-8 rounded-lg border-l-4 border-emerald-600">
            <h3 className="text-2xl font-bold mb-4 text-emerald-900 dark:text-emerald-100">
              {content.visionTitle || 'Visión'}
            </h3>
            <div
              className="text-lg text-gray-700 dark:text-gray-300"
              dangerouslySetInnerHTML={{ __html: content.visionText || '' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
