import React, { useState, useEffect } from 'react';
import { pointsService } from '../services/pointsService';
import type { IPointsBreakdown, IPointsTransaction, IYoung } from '../types';

interface PointsBreakdownModalProps {
  young: IYoung;
  isOpen: boolean;
  onClose: () => void;
}

const PointsBreakdownModal: React.FC<PointsBreakdownModalProps> = ({
  young,
  isOpen,
  onClose,
}) => {
  const [breakdown, setBreakdown] = useState<IPointsBreakdown | null>(null);
  const [transactions, setTransactions] = useState<IPointsTransaction[]>([]);
  const [position, setPosition] = useState<{
    rank: number;
    totalParticipants: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && young.id) {
      loadData();
    }
  }, [isOpen, young.id]);

  const loadData = async () => {
    if (!young.id) return;

    try {
      setLoading(true);
      const [breakdownData, historyData, positionData] = await Promise.all([
        pointsService.getBreakdown(young.id),
        pointsService.getHistory(young.id, { limit: 10 }),
        pointsService.getPosition(young.id).catch(() => null),
      ]);

      setBreakdown(breakdownData);
      setTransactions(historyData.transactions);
      setPosition(positionData);
    } catch (error) {
      console.error('Error loading points data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ATTENDANCE':
        return 'event_available';
      case 'ACTIVITY':
        return 'sports_score';
      case 'REFERRER_BONUS':
        return 'person_add';
      case 'REFERRED_BONUS':
        return 'how_to_reg';
      default:
        return 'star';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'ATTENDANCE':
        return 'Asistencia';
      case 'ACTIVITY':
        return 'Actividad';
      case 'REFERRER_BONUS':
        return 'Referido';
      case 'REFERRED_BONUS':
        return 'Bono Referido';
      default:
        return type;
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            {/* Foto del joven */}
            {young.profileImage ? (
              <img
                src={young.profileImage}
                alt={young.fullName}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                {young.fullName.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {young.fullName}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Desglose de Puntos
              </p>
            </div>
          </div>

          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <span className="material-symbols-rounded text-gray-500 dark:text-gray-400">
              close
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : breakdown ? (
            <>
              {/* Puntos totales y ranking */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Total de puntos */}
                <div className="bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="material-symbols-rounded text-3xl">
                      star
                    </span>
                    <span className="text-sm font-medium opacity-90">
                      Puntos Totales
                    </span>
                  </div>
                  <div className="text-4xl font-bold">{breakdown.total}</div>
                  <div className="text-sm opacity-90 mt-1">
                    {breakdown.transactionCount} transacciones
                  </div>
                </div>

                {/* Ranking */}
                {position && (
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="material-symbols-rounded text-3xl">
                        military_tech
                      </span>
                      <span className="text-sm font-medium opacity-90">
                        Posición
                      </span>
                    </div>
                    <div className="text-4xl font-bold">#{position.rank}</div>
                    <div className="text-sm opacity-90 mt-1">
                      de {position.totalParticipants} participantes
                    </div>
                  </div>
                )}
              </div>

              {/* Desglose por tipo */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Desglose por Tipo
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mb-1">
                      <span className="material-symbols-rounded text-sm">
                        event_available
                      </span>
                      <span className="text-sm">Asistencias</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {breakdown.byType.ATTENDANCE}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mb-1">
                      <span className="material-symbols-rounded text-sm">
                        sports_score
                      </span>
                      <span className="text-sm">Actividades</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {breakdown.byType.ACTIVITY}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mb-1">
                      <span className="material-symbols-rounded text-sm">
                        person_add
                      </span>
                      <span className="text-sm">Referidos</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {breakdown.byType.REFERRER_BONUS}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mb-1">
                      <span className="material-symbols-rounded text-sm">
                        how_to_reg
                      </span>
                      <span className="text-sm">Bono Referido</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {breakdown.byType.REFERRED_BONUS}
                    </div>
                  </div>
                </div>
              </div>

              {/* Transacciones recientes */}
              {transactions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Transacciones Recientes
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-100 dark:bg-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
                            Fecha
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
                            Tipo
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
                            Puntos
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {transactions.map(transaction => (
                          <tr key={transaction.id}>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                              {formatDate(transaction.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-rounded text-sm text-gray-500 dark:text-gray-400">
                                  {getTypeIcon(transaction.type)}
                                </span>
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {getTypeName(transaction.type)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                +{transaction.points}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Temporada actual */}
              {breakdown.season && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <span className="material-symbols-rounded text-lg">
                      calendar_month
                    </span>
                    <div>
                      <div className="font-semibold">
                        {breakdown.season.name}
                      </div>
                      <div className="text-xs opacity-75">
                        {formatDate(breakdown.season.startDate)} -{' '}
                        {formatDate(breakdown.season.endDate)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No hay datos de puntos disponibles
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PointsBreakdownModal;
