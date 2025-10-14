import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UsersIcon, ClockIcon, CheckCircleIcon, DocumentArrowDownIcon, CalendarDaysIcon, ArrowsPointingOutIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { getTodayAttendances, getAttendancesByDate } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import LoadingSpinner from './LoadingSpinner';
import { getCurrentDateColombia, formatDisplayDate, formatDisplayTime } from '../utils/dateUtils';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenData, setFullscreenData] = useState<any>(null); // Datos estáticos para pantalla completa
  const [selectedDate, setSelectedDate] = useState(() => {
    // Fecha actual en formato YYYY-MM-DD
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  useEffect(() => {
    loadAttendances();
  }, [refreshTrigger, selectedDate]);

  useEffect(() => {
    // Auto-refresh cada 30 segundos solo si es la fecha actual o está vacía Y no está en pantalla completa
    const today = getCurrentDateColombia();
    if ((!selectedDate || selectedDate === today) && !isFullscreen) {
      const interval = setInterval(() => {
        loadAttendances();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [selectedDate, isFullscreen]);

  // Efecto para limpiar datos de pantalla completa cuando se cierra
  useEffect(() => {
    if (!isFullscreen) {
      setFullscreenData(null);
    }
  }, [isFullscreen]);

  // Manejar tecla Escape para cerrar modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        setFullscreenData(null);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isFullscreen]);

  const loadAttendances = async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      // Si selectedDate está vacío, usar fecha actual
      const today = new Date().toISOString().split('T')[0];
      const dateToUse = selectedDate || today;
      
      // Si selectedDate estaba vacío, actualizarlo a la fecha actual
      if (!selectedDate) {
        setSelectedDate(today);
      }
      
      // Si es fecha actual, usar getTodayAttendances, sino usar getAttendancesByDate
      let attendanceData;
      
      if (dateToUse === today) {
        attendanceData = await getTodayAttendances();
      } else {
        attendanceData = await getAttendancesByDate(dateToUse);
      }
      
      // Solo actualizar datos si no estamos en pantalla completa
      if (!isFullscreen) {
        setData(attendanceData);
      }
    } catch (error: any) {
      if (!isFullscreen) {
        setError(error.message || 'Error al cargar asistencias');
      }
    } finally {
      if (!isFullscreen) {
        setIsLoading(false);
      }
    }
  };

  const formatTime = (dateString: string) => {
    return formatDisplayTime(dateString);
  };

  const formatDate = (dateString: string) => {
    return formatDisplayDate(dateString);
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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
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
          
          <div className="flex items-center gap-3">
            {/* Botón de pantalla completa */}
            {data.attendances.length > 0 && (
              <button
                onClick={() => {
                  // Capturar datos estáticos al abrir pantalla completa
                  setFullscreenData(JSON.parse(JSON.stringify(data)));
                  setIsFullscreen(true);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors font-medium ${
                  isDark 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                title="Ver en pantalla completa"
              >
                <ArrowsPointingOutIcon className="w-4 h-4" />
                Pantalla Completa
              </button>
            )}
            
            {/* Selector de fecha */}
            <div className="flex items-center gap-2">
              <CalendarDaysIcon className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  // Si la fecha está vacía, usar fecha actual
                  if (!newDate) {
                    const today = new Date().toISOString().split('T')[0];
                    setSelectedDate(today);
                  } else {
                    setSelectedDate(newDate);
                  }
                }}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-400' 
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              />
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
              <span className="text-sm">
                {(!selectedDate || selectedDate === getCurrentDateColombia()) 
                  ? 'Actualizado automáticamente cada 30 segundos'
                  : `Mostrando asistencias del ${formatDate(selectedDate)}`
                }
              </span>
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
                  {/* Foto de perfil */}
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-green-500">
                      {attendance.youngId.profileImage ? (
                        <img
                          src={attendance.youngId.profileImage}
                          alt={attendance.youngId.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${
                          isDark ? 'bg-gray-600' : 'bg-gray-200'
                        }`}>
                          <svg className={`w-6 h-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {/* Indicador de presente */}
                    <div className="absolute -bottom-1 -right-1">
                      <CheckCircleIcon className="w-5 h-5 text-green-500 bg-white rounded-full" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {attendance.youngId.fullName}
                      </p>
                    </div>
                    {attendance.youngId.email && (
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
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

      {/* Modal de Pantalla Completa */}
      <AnimatePresence>
        {isFullscreen && fullscreenData && fullscreenData.attendances && fullscreenData.attendances.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gray-900"
            style={{ zIndex: 9999 }}
            onClick={(e) => {
              // Cerrar si se hace clic en el backdrop
              if (e.target === e.currentTarget) {
                setIsFullscreen(false);
                setFullscreenData(null);
              }
            }}
          >
            {/* Header de pantalla completa */}
            <div className="flex items-center justify-between p-6 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center gap-4">
                <UsersIcon className="w-8 h-8 text-blue-400" />
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Lista de Asistencia
                  </h2>
                  <p className="text-gray-400">
                    {formatDate(fullscreenData.date)} • {fullscreenData.attendances.length} asistentes
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setIsFullscreen(false);
                  setFullscreenData(null);
                }}
                className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
                Cerrar
              </button>
            </div>

            {/* Lista en pantalla completa */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {fullscreenData.attendances
                    .sort((a: any, b: any) => new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime()) // Ordenar por orden de llegada
                    .map((attendance: any, index: number) => (
                    <motion.div
                      key={attendance._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        {/* Foto de perfil */}
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-green-500">
                            {attendance.youngId.profileImage ? (
                              <img
                                src={attendance.youngId.profileImage}
                                alt={attendance.youngId.fullName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-600">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          {/* Número de orden */}
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            {index + 1}
                          </div>
                        </div>
                        
                        {/* Información del asistente - Solo nombre y hora */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold text-lg truncate">
                            {attendance.youngId.fullName}
                          </h3>
                          
                          {/* Hora de registro */}
                          <div className="flex items-center gap-2 mt-2 text-green-400">
                            <ClockIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              {formatTime(attendance.scannedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AttendanceList;