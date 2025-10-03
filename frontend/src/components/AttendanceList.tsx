import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UsersIcon, ClockIcon, CheckCircleIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { getTodayAttendances } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import LoadingSpinner from './LoadingSpinner';

interface AttendanceListProps {
  className?: string;
  refreshTrigger?: number; // Para refrescar desde componente padre
}

const AttendanceList: React.FC<AttendanceListProps> = ({
  className = '',
  refreshTrigger = 0
}) => {
  const { isDark } = useTheme();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAttendances();
  }, [refreshTrigger]);

  useEffect(() => {
    // Auto-refresh cada 30 segundos
    const interval = setInterval(() => {
      loadAttendances();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadAttendances = async () => {
    try {
      setError(null);
      const attendanceData = await getTodayAttendances();
      setData(attendanceData);
    } catch (error: any) {
      setError(error.message || 'Error al cargar asistencias');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const exportToCSV = () => {
    if (!data?.attendances) return;

    const headers = ['Nombre', 'Placa', 'Grupo', 'Hora de Registro', 'Email'];
    const rows = data.attendances.map((attendance: any) => [
      attendance.youngId.fullName,
      attendance.youngId.placa || 'Sin placa',
      attendance.youngId.group || 'Sin grupo',
      formatTime(attendance.scannedAt),
      attendance.youngId.email || 'Sin email'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: string[]) => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `asistencias_${data.date}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <LoadingSpinner />
        <p className={`mt-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Cargando asistencias...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className={`p-4 rounded-lg ${isDark ? 'bg-red-900/20' : 'bg-red-50'} border ${isDark ? 'border-red-800' : 'border-red-200'}`}>
          <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
          <button
            onClick={loadAttendances}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Reintentar
          </button>
        </div>
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
            <UsersIcon className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
            <div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Asistencias del Día
              </h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {formatDate(data.date)}
              </p>
            </div>
          </div>
          
          {data.attendances.length > 0 && (
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              Exportar CSV
            </button>
          )}
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={`p-4 rounded-lg ${isDark ? 'bg-green-900/20' : 'bg-green-50'} border ${isDark ? 'border-green-800' : 'border-green-200'}`}>
            <div className="flex items-center gap-3">
              <CheckCircleIcon className={`w-8 h-8 ${isDark ? 'text-green-400' : 'text-green-500'}`} />
              <div>
                <p className={`text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                  {data.stats.totalPresent}
                </p>
                <p className={`text-sm ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                  Presentes
                </p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-lg ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'} border ${isDark ? 'border-blue-800' : 'border-blue-200'}`}>
            <div className="flex items-center gap-3">
              <UsersIcon className={`w-8 h-8 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
              <div>
                <p className={`text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  {data.stats.totalYoung}
                </p>
                <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                  Total Jóvenes
                </p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-lg ${isDark ? 'bg-purple-900/20' : 'bg-purple-50'} border ${isDark ? 'border-purple-800' : 'border-purple-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full ${isDark ? 'bg-purple-400' : 'bg-purple-500'} flex items-center justify-center text-white font-bold`}>
                %
              </div>
              <div>
                <p className={`text-2xl font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                  {data.stats.attendancePercentage}%
                </p>
                <p className={`text-sm ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                  Asistencia
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de asistencias */}
        {data.attendances.length > 0 ? (
          <div className="space-y-3">
            <div className={`flex items-center gap-2 mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <ClockIcon className="w-4 h-4" />
              <span className="text-sm">Actualizado automáticamente cada 30 segundos</span>
            </div>

            {data.attendances
              .sort((a: any, b: any) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
              .map((attendance: any, index: number) => (
              <motion.div
                key={attendance._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                } hover:shadow-md transition-all`}
              >
                <div className="flex items-center gap-4">
                  <CheckCircleIcon className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-500'}`} />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {attendance.youngId.fullName}
                      </p>
                      {attendance.youngId.placa && (
                        <span className={`px-2 py-1 text-xs rounded-full ${isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                          {attendance.youngId.placa}
                        </span>
                      )}
                      {attendance.youngId.group && (
                        <span className={`px-2 py-1 text-xs rounded-full ${isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                          Grupo {attendance.youngId.group}
                        </span>
                      )}
                    </div>
                    {attendance.youngId.email && (
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {attendance.youngId.email}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className={`text-right ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <p className="font-medium">{formatTime(attendance.scannedAt)}</p>
                  <p className="text-xs">Registrado</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <UsersIcon className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              No hay asistencias registradas aún
            </p>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-2`}>
              Las asistencias aparecerán aquí cuando los jóvenes escaneen el código QR
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceList;