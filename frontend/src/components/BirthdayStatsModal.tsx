import React, { useState, useEffect } from 'react';
import { getAuthToken } from '../services/api';

interface BirthdayStats {
  emailsSentToday: number;
  totalPointsClaimedThisMonth: number;
  transactionsCount: number;
  upcomingBirthdays: Array<{
    youngId: string;
    fullName: string;
    birthday: string;
    nextBirthday: string;
    daysUntil: number;
    profileImage?: string;
  }>;
}

interface BirthdayStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BirthdayStatsModal: React.FC<BirthdayStatsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [stats, setStats] = useState<BirthdayStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/birthday/stats`,
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al obtener estadísticas');
      }

      const data = await response.json();
      setStats(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-700 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="material-symbols-rounded text-3xl">cake</span>
                Estadísticas de Cumpleaños
              </h2>
              <p className="text-white/80 mt-1">
                Resumen de envíos y reclamaciones
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-white/90 transition-colors p-2 bg-white/20 rounded-full"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200 flex items-center gap-2">
                <span className="material-symbols-rounded">error</span>
                {error}
              </p>
            </div>
          ) : stats ? (
            <>
              {/* Cards de estadísticas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Correos enviados hoy */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 rounded-lg p-5 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="material-symbols-rounded text-4xl text-blue-600 dark:text-blue-400">
                      mail
                    </span>
                    <span className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                      {stats.emailsSentToday}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                    Correos Enviados Hoy
                  </h3>
                </div>

                {/* Puntos reclamados este mes */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/40 dark:to-purple-800/40 rounded-lg p-5 border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="material-symbols-rounded text-4xl text-purple-600 dark:text-purple-400">
                      stars
                    </span>
                    <span className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                      {stats.totalPointsClaimedThisMonth}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-200">
                    Puntos Reclamados (Mes)
                  </h3>
                </div>

                {/* Reclamaciones este mes */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/40 rounded-lg p-5 border border-green-200 dark:border-green-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="material-symbols-rounded text-4xl text-green-600 dark:text-green-400">
                      redeem
                    </span>
                    <span className="text-3xl font-bold text-green-700 dark:text-green-300">
                      {stats.transactionsCount}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-green-800 dark:text-green-200">
                    Reclamaciones (Mes)
                  </h3>
                </div>
              </div>

              {/* Próximos cumpleaños */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-5 border border-purple-200 dark:border-purple-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-rounded">event</span>
                  Próximos Cumpleaños
                </h3>

                {stats.upcomingBirthdays.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No hay cumpleaños próximos registrados
                  </p>
                ) : (
                  <div className="space-y-3">
                    {stats.upcomingBirthdays.map(birthday => (
                      <div
                        key={birthday.youngId}
                        className="bg-white dark:bg-gray-700 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center overflow-hidden">
                            {birthday.profileImage ? (
                              <img
                                src={birthday.profileImage}
                                alt={birthday.fullName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="material-symbols-rounded text-white text-2xl">
                                person
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {birthday.fullName}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(birthday.birthday)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div
                            className={`
                            inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium
                            ${
                              birthday.daysUntil === 0
                                ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'
                                : birthday.daysUntil <= 7
                                  ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200'
                                  : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                            }
                          `}
                          >
                            {birthday.daysUntil === 0 ? (
                              <>
                                <span className="material-symbols-rounded text-base">
                                  celebration
                                </span>
                                ¡Hoy!
                              </>
                            ) : birthday.daysUntil === 1 ? (
                              <>
                                <span className="material-symbols-rounded text-base">
                                  schedule
                                </span>
                                Mañana
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-rounded text-base">
                                  schedule
                                </span>
                                {birthday.daysUntil} días
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t dark:border-gray-600 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default BirthdayStatsModal;
