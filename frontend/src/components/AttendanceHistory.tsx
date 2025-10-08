import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircleIcon, XCircleIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import { getMyAttendanceHistory } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import LoadingSpinner from './LoadingSpinner';

interface AttendanceHistoryProps {
  className?: string;
  compact?: boolean; // Para mostrar una versión más compacta
}

const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({
  className = '',
  compact = false
}) => {
  const { isDark } = useTheme();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadHistory();
  }, [currentPage]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const historyData = await getMyAttendanceHistory(currentPage, compact ? 5 : 10);
      setData(historyData);
    } catch (error: any) {
      setError(error.message || 'Error al cargar el historial');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <LoadingSpinner />
        <p className={`mt-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Cargando historial...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <XCircleIcon className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
        <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-500'}`}>{error}</p>
        <button
          onClick={loadHistory}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className={`${className}`}>
      <div className={`rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CalendarIcon className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Mi Historial de Asistencias
            </h2>
          </div>
          
          {!compact && data.stats && (
            <div className={`text-right text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <p>Total: {data.stats.totalAttendances}</p>
              <p>Este mes: {data.stats.thisMonthAttendances}</p>
            </div>
          )}
        </div>

        {/* Estado de hoy */}
        {data.stats && (
          <div className={`mb-6 p-4 rounded-lg border-2 ${
            data.stats.hasAttendanceToday
              ? isDark ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'
              : isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              {data.stats.hasAttendanceToday ? (
                <CheckCircleIcon className={`w-6 h-6 ${isDark ? 'text-green-400' : 'text-green-500'}`} />
              ) : (
                <ClockIcon className={`w-6 h-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              )}
              <div>
                <p className={`font-medium ${
                  data.stats.hasAttendanceToday
                    ? isDark ? 'text-green-400' : 'text-green-600'
                    : isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {data.stats.hasAttendanceToday ? 'Asistencia registrada hoy' : '⏳ Sin asistencia registrada hoy'}
                </p>
                {data.stats.todayAttendance && (
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Registrada a las {formatTime(data.stats.todayAttendance.scannedAt)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lista de asistencias */}
        {data.attendances && data.attendances.length > 0 ? (
          <div className="space-y-3">
            {data.attendances.map((attendance: any, index: number) => (
              <motion.div
                key={attendance._id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-500'}`} />
                  <div>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {formatDate(attendance.attendanceDate)}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Presente
                    </p>
                  </div>
                </div>
                
                <div className={`text-right text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <p>{formatTime(attendance.scannedAt)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CalendarIcon className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              No tienes asistencias registradas aún
            </p>
          </div>
        )}

        {/* Paginación */}
        {!compact && data.pagination && data.pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={!data.pagination.hasPreviousPage}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                data.pagination.hasPreviousPage
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Anterior
            </button>
            
            <span className={`px-3 py-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Página {data.pagination.currentPage} de {data.pagination.totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={!data.pagination.hasNextPage}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                data.pagination.hasNextPage
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Siguiente
            </button>
          </div>
        )}

        {/* Estadísticas resumidas para vista compacta */}
        {compact && data.stats && (
          <div className={`mt-4 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className={`text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-500'}`}>
                  {data.stats.totalAttendances}
                </p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total asistencias
                </p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-500'}`}>
                  {data.stats.thisMonthAttendances}
                </p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Este mes
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceHistory;