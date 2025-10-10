import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCodeIcon, XMarkIcon, ArrowsPointingOutIcon, UsersIcon } from '@heroicons/react/24/outline';
import { generateDailyQR, getCurrentQR, getQRStats } from '../services/api';
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
      }, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [qrData]);

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
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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

      {/* Modal Pantalla Completa */}
      <AnimatePresence>
        {showFullscreen && qrData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            onClick={() => setShowFullscreen(false)}
          >
            <button
              onClick={() => setShowFullscreen(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
            >
              <XMarkIcon className="w-8 h-8" />
            </button>

            <div className="text-center text-white">
              {/* Título */}
              <motion.h1
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-4xl font-bold mb-4"
              >
                Registra tu Asistencia
              </motion.h1>

              {/* QR Code Grande */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-6"
              >
                <img
                  src={qrData.qrImage}
                  alt="Código QR de Asistencia"
                  className="w-96 h-96 mx-auto border-4 border-white rounded-2xl shadow-2xl"
                />
              </motion.div>

              {/* Información */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <p className="text-xl">
                  {formatDate(qrData.qrCode.dailyDate)}
                </p>
                {stats && (
                  <motion.p
                    key={stats.attendanceCount} // Key para re-animar cuando cambie
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className="text-lg text-green-400 font-semibold"
                  >
                    {stats.attendanceCount} personas registradas
                  </motion.p>
                )}
                <p className="text-lg">
                  Expira en: <span className={`font-mono font-bold ${countdown === 'Expirado' ? 'text-red-400' : 'text-red-300'}`}>{countdown}</span>
                </p>
                <p className="text-gray-400 text-xs mt-4">
                  Presiona ESC o haz clic para salir
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default QRGenerator;