import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QrScanner from 'qr-scanner';
import { XMarkIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { scanQRAndRegisterAttendance } from '../services/api';
import AttendanceModal from './AttendanceModal';
import { useTheme } from '../context/ThemeContext';

interface QRScannerSimpleProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: any) => void;
}

const QRScannerSimple: React.FC<QRScannerSimpleProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const { isDark } = useTheme();

  // Estados del modal
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<{
    success: boolean;
    message: string;
    subtitle?: string;
    date?: string;
  } | null>(null);

  // Detectar móvil
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  // Cleanup function
  const cleanup = () => {
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }
    
    if (scannerRef.current) {
      try {
        scannerRef.current.destroy();
      } catch (error) {
        console.warn('Error cleaning up scanner:', error);
      }
      scannerRef.current = null;
    }
    
    setIsScanning(false);
    setIsInitializing(false);
  };

  // Efecto principal
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setPermissionState('prompt');
      // Delay para asegurar que el modal y video estén renderizados
      initTimeoutRef.current = setTimeout(() => {
        initializeCamera();
      }, 200);
    } else {
      cleanup();
    }

    return cleanup;
  }, [isOpen]);

  // Inicializar cámara
  const initializeCamera = async () => {
    if (!videoRef.current) {
      console.error('Video element not found');
      setError('Error: Elemento de video no encontrado');
      return;
    }

    try {
      setIsInitializing(true);
      setError(null);

      console.log('🎥 Iniciando inicialización de cámara...');

      // Verificar soporte básico
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta acceso a la cámara');
      }

      // Verificar cámaras disponibles
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        throw new Error('No se encontró ninguna cámara en el dispositivo');
      }

      console.log('📷 Cámara detectada, solicitando permisos...');

      // Solicitar permisos
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: isMobile ? 640 : 1280, min: 320 },
          height: { ideal: isMobile ? 640 : 720, min: 240 },
          frameRate: { ideal: isMobile ? 20 : 30 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Cerrar stream - solo necesitamos permisos
      stream.getTracks().forEach(track => track.stop());
      
      setPermissionState('granted');
      console.log('✅ Permisos otorgados');

      // Inicializar scanner
      await initializeScanner();

    } catch (error: any) {
      console.error('❌ Error inicializando cámara:', error);
      
      let errorMessage = 'Error al acceder a la cámara';
      
      if (error.name === 'NotAllowedError') {
        setPermissionState('denied');
        errorMessage = 'Permisos de cámara denegados. Por favor, permite el acceso a la cámara.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No se encontró ninguna cámara en el dispositivo';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Tu navegador no soporta acceso a la cámara';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'La cámara está siendo usada por otra aplicación';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setIsInitializing(false);
    }
  };

  // Inicializar scanner
  const initializeScanner = async () => {
    if (!videoRef.current) {
      throw new Error('Elemento de video no disponible');
    }

    try {
      console.log('🔍 Inicializando QR Scanner...');

      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          const qrData = typeof result === 'string' ? result : result.data;
          handleScanResult(qrData);
        },
        {
          onDecodeError: () => {
            // Ignorar errores de decodificación
          },
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment',
          maxScansPerSecond: isMobile ? 2 : 5,
        }
      );

      await scanner.start();
      scannerRef.current = scanner;
      setIsScanning(true);
      
      console.log('✅ QR Scanner iniciado correctamente');

    } catch (error: any) {
      console.error('❌ Error inicializando scanner:', error);
      throw new Error(`Error al inicializar el escáner: ${error.message}`);
    }
  };

  // Manejar resultado del scan
  const handleScanResult = async (data: string) => {
    if (!isScanning) return;

    try {
      setIsScanning(false);
      
      if (scannerRef.current) {
        scannerRef.current.pause();
      }

      console.log('📱 QR escaneado:', data);

      if (!data || !data.trim()) {
        throw new Error('Código QR vacío');
      }

      // Extraer código
      let code = data.trim();
      if (data.includes('code=')) {
        try {
          const url = new URL(data);
          code = url.searchParams.get('code') || data;
        } catch {
          // Si no es URL válida, usar data directamente
        }
      }

      console.log('🔍 Código extraído:', code);

      // Registrar asistencia
      const result = await scanQRAndRegisterAttendance(code);
      
      setModalData({
        success: true,
        message: '¡Asistencia Registrada!',
        subtitle: 'Gracias por asistir',
        date: new Date().toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      });
      setShowModal(true);

      if (onSuccess) {
        onSuccess(result);
      }

      setTimeout(() => onClose(), 1500);

    } catch (error: any) {
      console.error('❌ Error procesando QR:', error);
      
      setModalData({
        success: false,
        message: 'Error al Registrar',
        subtitle: error.message || 'Error inesperado'
      });
      setShowModal(true);

      // Reanudar scanner
      setTimeout(() => {
        if (scannerRef.current) {
          try {
            scannerRef.current.start();
            setIsScanning(true);
          } catch (resumeError) {
            console.error('Error reanudando:', resumeError);
          }
        }
      }, 3000);
    }
  };

  // Manejar cierre
  const handleClose = () => {
    cleanup();
    setError(null);
    setPermissionState('prompt');
    onClose();
  };

  // Reintentar
  const handleRetry = () => {
    cleanup();
    setError(null);
    setPermissionState('prompt');
    
    setTimeout(() => {
      initializeCamera();
    }, 100);
  };

  // Cerrar modal
  const handleModalClose = () => {
    setShowModal(false);
    setModalData(null);
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black bg-opacity-75"
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            className={`relative w-full max-w-md mx-auto ${
              isDark ? 'bg-gray-800' : 'bg-white'
            } rounded-2xl overflow-hidden shadow-2xl`}
          >
            {/* Header */}
            <div className={`p-4 border-b ${
              isDark ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Escanear Código QR
                </h3>
                <button
                  onClick={handleClose}
                  className={`p-1 rounded-lg transition-colors ${
                    isDark 
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                      : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="relative">
              {/* Loading */}
              {isInitializing && (
                <div className="p-8 text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 mx-auto mb-4"
                  >
                    <ArrowPathIcon className="w-full h-full text-blue-500" />
                  </motion.div>
                  <p className={`text-sm ${
                    isDark ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Inicializando cámara...
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-8 text-center">
                  <ExclamationTriangleIcon className="w-16 h-16 mx-auto mb-4 text-red-500" />
                  <h4 className={`font-semibold mb-2 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {permissionState === 'denied' ? 'Permisos Requeridos' : 'Error'}
                  </h4>
                  <p className={`text-sm mb-6 ${
                    isDark ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {error}
                  </p>
                  <button
                    onClick={handleRetry}
                    className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    {permissionState === 'denied' ? 'Solicitar Permisos' : 'Reintentar'}
                  </button>
                  {isMobile && (
                    <p className={`text-xs mt-4 ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      💡 Permite el acceso cuando tu navegador lo solicite
                    </p>
                  )}
                </div>
              )}

              {/* Scanner */}
              {permissionState === 'granted' && !error && !isInitializing && (
                <div className="relative aspect-square bg-black">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                    autoPlay
                    playsInline
                    muted
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 relative">
                      {/* Corner markers */}
                      {[[0,0], [0,1], [1,0], [1,1]].map(([x, y], i) => (
                        <div
                          key={i}
                          className={`absolute w-6 h-6 border-2 border-blue-400 ${
                            x === 0 && y === 0 ? 'top-0 left-0 border-b-0 border-r-0' :
                            x === 0 && y === 1 ? 'top-0 right-0 border-b-0 border-l-0' :
                            x === 1 && y === 0 ? 'bottom-0 left-0 border-t-0 border-r-0' :
                            'bottom-0 right-0 border-t-0 border-l-0'
                          }`}
                        />
                      ))}
                      
                      {/* Scan line */}
                      <motion.div
                        className="absolute left-0 right-0 h-0.5 bg-blue-400"
                        animate={{ y: [0, 192, 0] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <div className="bg-black/70 rounded-full px-4 py-2 mx-4">
                      <p className="text-white text-sm">
                        {isScanning ? '📱 Apunta el QR al centro' : '⏳ Procesando...'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Modal de resultado */}
      {modalData && (
        <AttendanceModal
          isOpen={showModal}
          onClose={handleModalClose}
          success={modalData.success}
          message={modalData.message}
          subtitle={modalData.subtitle}
          date={modalData.date}
        />
      )}
    </>
  );
};

export default QRScannerSimple;