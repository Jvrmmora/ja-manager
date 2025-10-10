import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCodeIcon, XMarkIcon, ArrowsPointingOutIcon, UsersIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { generateDailyQR, getCurrentQR, getQRStats, getTodayAttendances } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import LoadingSpinner from './LoadingSpinner';

interface QRGeneratorProps {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

const QRGenerator: React.FC<QRGeneratorProps> = ({
  onSuccess,
  onError
}) => {
  const { isDark } = useTheme();
  const [qrData, setQrData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [liveAttendances, setLiveAttendances] = useState<any[]>([]);
  const [lastAttendanceCount, setLastAttendanceCount] = useState(0);

  // Hook para el contador regresivo
  useEffect(() => {
    if (!qrData?.qrCode?.expiresAt) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const expireTime = new Date(qrData.qrCode.expiresAt).getTime();
      const timeLeft = expireTime - now;

      if (timeLeft <= 0) {
        setCountdown('Expirado');
        return;
      }

      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      setCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    // Actualizar inmediatamente
    updateCountdown();

    // Actualizar cada segundo
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [qrData?.qrCode?.expiresAt]);

  useEffect(() => {
    // Cargar QR existente al montar el componente
    loadCurrentQR();
  }, []);

  useEffect(() => {
    // Actualizar estadísticas cada 10 segundos si hay un QR activo
    let interval: ReturnType<typeof setInterval>;
    if (qrData) {
      interval = setInterval(() => {
        loadStats();
        // Si está en pantalla completa, cargar asistencias también
        if (showFullscreen) {
          loadLiveAttendances();
        }
      }, 3000); // Cada 3 segundos para tiempo real
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [qrData, showFullscreen]);

  // Cargar asistencias en tiempo real cuando se abre pantalla completa
  useEffect(() => {
    if (showFullscreen) {
      loadLiveAttendances();
    }
  }, [showFullscreen]);

  // Manejar tecla Escape para cerrar modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showFullscreen) {
        setShowFullscreen(false);
      }
    };

    if (showFullscreen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showFullscreen]);

  // Limpiar datos cuando se cierra el modal
  useEffect(() => {
    if (!showFullscreen) {
      setLiveAttendances([]);
      setLastAttendanceCount(0);
    }
  }, [showFullscreen]);

  const loadLiveAttendances = async () => {
    try {
      const attendanceData = await getTodayAttendances();
      const newAttendances = attendanceData.attendances || [];
      
      // Detectar nuevas asistencias
      if (newAttendances.length > lastAttendanceCount) {
        // Obtener solo las nuevas asistencias
        const newestAttendances = newAttendances.slice(lastAttendanceCount);
        
        // Agregar nuevas asistencias una por una con delay
        newestAttendances.forEach((attendance: any, index: number) => {
          setTimeout(() => {
            setLiveAttendances(prev => {
              // Evitar duplicados
              const exists = prev.some(a => a._id === attendance._id);
              if (!exists) {
                return [attendance, ...prev]; // Agregar al inicio
              }
              return prev;
            });
          }, index * 500); // 500ms entre cada nueva asistencia
        });
        
        setLastAttendanceCount(newAttendances.length);
      } else if (liveAttendances.length === 0) {
        // Primera carga
        setLiveAttendances(newAttendances.reverse()); // Mostrar más recientes primero
        setLastAttendanceCount(newAttendances.length);
      }
    } catch (error) {
      console.error('Error cargando asistencias en vivo:', error);
    }
  };

  const loadCurrentQR = async () => {
    try {
      setIsLoading(true);
      const data = await getCurrentQR();
      setQrData(data);
      await loadStats();
    } catch (error: any) {
      // No hay QR activo, no es un error crítico
      console.log('No hay QR activo:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await getQRStats();
      setStats(statsData);
    } catch (error: any) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const handleGenerateQR = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      
      const data = await generateDailyQR();
      setQrData(data);
      await loadStats();

      if (onSuccess) {
        onSuccess(data);
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Error al generar código QR';
      setError(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setIsGenerating(false);
    }
  };

    const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpired = () => {
    if (!qrData?.qrCode?.expiresAt) return false;
    return new Date(qrData.qrCode.expiresAt) <= new Date();
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <LoadingSpinner />
        <p className={`mt-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Cargando información del QR...
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={`rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
        <div className="text-center">
          <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Código QR de Asistencia
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {!qrData || isExpired() ? (
            <div className="py-8">
              <QrCodeIcon className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {isExpired() ? 'El código QR ha expirado' : 'No hay código QR activo para el día de hoy'}
              </p>
              <motion.button
                onClick={handleGenerateQR}
                disabled={isGenerating}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors font-semibold flex items-center gap-2 mx-auto"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isGenerating ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Generando...
                  </>
                ) : (
                  <>
                    <QrCodeIcon className="w-5 h-5" />
                    Generar QR del {formatDate(new Date().toISOString())}
                  </>
                )}
              </motion.button>
            </div>
          ) : (
            <div>
              {/* Información del QR */}
              <div className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <strong>Fecha:</strong> {formatDate(qrData.qrCode.dailyDate)}
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <strong>Generado:</strong> {formatTime(qrData.qrCode.generatedAt)}
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <strong>Expira:</strong> <span className={countdown === 'Expirado' ? 'text-red-500 font-semibold' : 'text-red-600 font-mono font-semibold'}>{countdown}</span>
                </p>
              </div>

              {/* QR Code */}
              <div className="mb-4">
                <img
                  src={qrData.qrImage}
                  alt="Código QR de Asistencia"
                  className="w-64 h-64 mx-auto border-2 border-gray-200 rounded-lg"
                />
              </div>

              {/* Estadísticas */}
              {stats && (
                <div className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-green-900/20' : 'bg-green-50'} border ${isDark ? 'border-green-800' : 'border-green-200'}`}>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <UsersIcon className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                    <span className={`font-semibold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                      {stats.attendanceCount} asistencias registradas
                    </span>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                    Actualizado automáticamente cada 10 segundos
                  </p>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-3 justify-center">
                <motion.button
                  onClick={() => setShowFullscreen(true)}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium flex items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowsPointingOutIcon className="w-4 h-4" />
                  Ampliar para Proyector
                </motion.button>

                <motion.button
                  onClick={handleGenerateQR}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors font-medium flex items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isGenerating ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Regenerando...
                    </>
                  ) : (
                    <>
                      <QrCodeIcon className="w-4 h-4" />
                      Regenerar QR
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Pantalla Completa con Vista Dividida */}
      <AnimatePresence>
        {showFullscreen && qrData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gray-900"
            style={{ zIndex: 9999 }}
          >
            <div className="h-full flex">
              {/* Panel Izquierdo - QR Code */}
              <div className="w-1/2 flex flex-col items-center justify-center bg-gray-900 text-white p-8">
                <button
                  onClick={() => setShowFullscreen(false)}
                  className="absolute top-6 left-6 text-white hover:text-gray-300 transition-colors z-10 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-800"
                >
                  <XMarkIcon className="w-6 h-6" />
                  Cerrar
                </button>

                {/* Título */}
                <motion.h1
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-5xl font-bold mb-6 text-center"
                >
                  Registra tu Asistencia
                </motion.h1>

                {/* QR Code */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-8"
                >
                  <img
                    src={qrData.qrImage}
                    alt="Código QR de Asistencia"
                    className="w-80 h-80 border-8 border-white rounded-3xl shadow-2xl"
                  />
                </motion.div>

                {/* Información del QR */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-center space-y-3"
                >
                  <p className="text-2xl font-medium">
                    {formatDate(qrData.qrCode.dailyDate)}
                  </p>
                  
                  {stats && (
                    <motion.div
                      key={stats.attendanceCount}
                      initial={{ scale: 1.2, color: '#10B981' }}
                      animate={{ scale: 1, color: '#059669' }}
                      className="flex items-center justify-center gap-3 text-xl"
                    >
                      <UsersIcon className="w-6 h-6" />
                      <span className="font-bold">
                        {stats.attendanceCount} personas registradas
                      </span>
                    </motion.div>
                  )}
                  
                  <p className="text-xl">
                    Expira en: <span className={`font-mono font-bold text-2xl ${countdown === 'Expirado' ? 'text-red-400' : 'text-orange-400'}`}>{countdown}</span>
                  </p>
                </motion.div>
              </div>

              {/* Panel Derecho - Asistentes en Tiempo Real */}
              <div className="w-1/2 bg-gray-800 flex flex-col">
                {/* Header del panel */}
                <div className="bg-gray-700 px-6 py-4 border-b border-gray-600">
                  <div className="flex items-center gap-3">
                    <CheckCircleIcon className="w-6 h-6 text-green-400" />
                    <h2 className="text-xl font-bold text-white">
                      Asistentes Registrados
                    </h2>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">
                    Actualizándose en tiempo real
                  </p>
                </div>

                {/* Lista de asistentes */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <AnimatePresence>
                    {liveAttendances.map((attendance, index) => (
                      <motion.div
                        key={attendance._id}
                        initial={{ x: 300, opacity: 0, scale: 0.8 }}
                        animate={{ x: 0, opacity: 1, scale: 1 }}
                        exit={{ x: -300, opacity: 0, scale: 0.8 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 200,
                          damping: 20,
                          delay: index * 0.1 
                        }}
                        className="bg-gray-700 rounded-xl p-4 border border-gray-600 hover:border-green-400 transition-all duration-300"
                      >
                        <div className="flex items-center gap-4">
                          {/* Avatar con animación de entrada */}
                          <motion.div
                            initial={{ rotate: -180, scale: 0 }}
                            animate={{ rotate: 0, scale: 1 }}
                            transition={{ delay: index * 0.1 + 0.2 }}
                            className="relative"
                          >
                            <div className="w-14 h-14 rounded-full overflow-hidden border-3 border-green-500 shadow-lg">
                              {attendance.youngId.profileImage ? (
                                <img
                                  src={attendance.youngId.profileImage}
                                  alt={attendance.youngId.fullName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            
                            {/* Badge de confirmación */}
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: index * 0.1 + 0.4 }}
                              className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-gray-700"
                            >
                              <CheckCircleIcon className="w-4 h-4 text-white" />
                            </motion.div>
                          </motion.div>
                          
                          {/* Información del asistente */}
                          <div className="flex-1">
                            <motion.h3
                              initial={{ y: 10, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: index * 0.1 + 0.3 }}
                              className="text-white font-semibold text-lg truncate"
                            >
                              {attendance.youngId.fullName}
                            </motion.h3>
                            
                            <motion.div
                              initial={{ y: 10, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: index * 0.1 + 0.4 }}
                              className="flex items-center gap-2 mt-1 text-green-400"
                            >
                              <ClockIcon className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {formatTime(attendance.scannedAt)}
                              </span>
                            </motion.div>
                          </div>

                          {/* Animación de pulso para nuevos registros */}
                          {index < 3 && (
                            <motion.div
                              animate={{ 
                                scale: [1, 1.2, 1],
                                opacity: [0.5, 1, 0.5]
                              }}
                              transition={{ 
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                              className="w-3 h-3 bg-green-400 rounded-full"
                            />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Mensaje cuando no hay asistentes */}
                  {liveAttendances.length === 0 && (
                    <div className="text-center py-12">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-gray-400"
                      >
                        <UsersIcon className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                        <p className="text-lg">Esperando primeros registros...</p>
                        <p className="text-sm mt-2">Los asistentes aparecerán aquí en tiempo real</p>
                      </motion.div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default QRGenerator;