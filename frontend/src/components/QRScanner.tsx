import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QrScanner from 'qr-scanner';
import { XMarkIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { scanQRAndRegisterAttendance } from '../services/api';
import AttendanceModal from './AttendanceModal';
import { useTheme } from '../context/ThemeContext';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: any) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraState, setCameraState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const { isDark } = useTheme();

  // Usar refs para estados críticos que no deben causar re-renders
  const canScanRef = useRef(false);
  const isProcessingRef = useRef(false);

  // Estados del modal de resultado
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<{
    success: boolean;
    message: string;
    subtitle?: string;
    date?: string;
  } | null>(null);

  // Detectar si es dispositivo móvil
  const isMobile = /Mobi|Android/i.test(navigator.userAgent) || 
                   ('ontouchstart' in window) || 
                   (navigator.maxTouchPoints > 0);

  // Limpiar recursos
  const cleanup = useCallback(() => {
    // Limpiar refs
    canScanRef.current = false;
    isProcessingRef.current = false;
    
    if (scannerRef.current) {
      try {
        scannerRef.current.destroy();
      } catch (error) {
        console.warn('Error limpiando scanner:', error);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setIsInitializing(false);
  }, []);

  // Efecto principal
  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      cleanup();
      setError(null);
      setCameraState('prompt');
    }

    return cleanup;
  }, [isOpen, cleanup]);

  // Inicializar scanner
  const startScanner = async () => {
    try {
      setIsInitializing(true);
      setError(null);

      // Verificar soporte básico
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta acceso a la cámara');
      }

      // Verificar que hay cámaras disponibles
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        throw new Error('No se encontró ninguna cámara en el dispositivo');
      }

      // Solicitar permisos primero
      await requestCameraPermission();

    } catch (error: any) {
      console.error('Error iniciando scanner:', error);
      setError(error.message || 'Error al inicializar el escáner');
      setCameraState('denied');
      setIsInitializing(false);
    }
  };

  // Solicitar permisos de cámara
  const requestCameraPermission = async () => {
    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // Preferir cámara trasera
          width: { ideal: isMobile ? 720 : 1280, min: 320 },
          height: { ideal: isMobile ? 720 : 720, min: 240 },
          frameRate: { ideal: isMobile ? 25 : 30, max: 30 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Cerrar el stream inmediatamente - solo necesitamos los permisos
      stream.getTracks().forEach(track => track.stop());
      
      setCameraState('granted');
    } catch (error: any) {
      setCameraState('denied');
      
      let errorMessage = 'Error al acceder a la cámara';
      
      switch (error.name) {
        case 'NotAllowedError':
          errorMessage = 'Permisos de cámara denegados. Por favor, permite el acceso a la cámara.';
          break;
        case 'NotFoundError':
          errorMessage = 'No se encontró ninguna cámara en el dispositivo';
          break;
        case 'NotSupportedError':
          errorMessage = 'Tu navegador no soporta acceso a la cámara';
          break;
        case 'NotReadableError':
          errorMessage = 'La cámara está siendo usada por otra aplicación';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      
      throw new Error(errorMessage);
    }
  };

  // Efecto para inicializar el scanner cuando el video esté disponible
  useEffect(() => {
    if (cameraState === 'granted' && videoRef.current && !scannerRef.current && isOpen) {
      // Pequeño delay para asegurar que el elemento video esté completamente renderizado
      const timer = setTimeout(() => {
        initializeQRScanner();
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [cameraState, isOpen]);

  // Inicializar QR Scanner
  const initializeQRScanner = async () => {
    if (!videoRef.current) {
      setError('Elemento de video no disponible');
      setIsInitializing(false);
      return;
    }

    try {
      setIsInitializing(true);
      
      const config = {
        onDecodeError: () => {
          // Ignorar errores de decodificación - son normales
        },
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: 'environment' as const,
        maxScansPerSecond: isMobile ? 3 : 5, // Reducir en móviles para mejor rendimiento
      };

      scannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          const qrData = typeof result === 'string' ? result : result.data;
          handleScanResult(qrData);
        },
        config
      );

      await scannerRef.current.start();
      setIsScanning(true);
      setIsInitializing(false);
      
      // Activar refs para permitir scanning
      canScanRef.current = true;
      isProcessingRef.current = false;
      
      
    } catch (error: any) {
      setError(error.message || 'Error al inicializar el escáner QR');
      setIsScanning(false);
      setIsInitializing(false);
    }
  };

  // Manejar resultado del escaneo
  const handleScanResult = async (data: string) => {
    // Usar refs en lugar de states para verificaciones
    if (!canScanRef.current || isProcessingRef.current) {
      return;
    }

    // Verificación adicional: Scanner debe existir
    if (!scannerRef.current) {
      return;
    }

    try {
      // Activar locks inmediatamente
      canScanRef.current = false;
      isProcessingRef.current = true;
      setIsScanning(false);
      // Pausar y detener scanner inmediatamente
      if (scannerRef.current) {
        try {
          scannerRef.current.pause();
          scannerRef.current.stop();
        } catch (e) {
          // Error pausando scanner - continuar
        }
      }

      // Validar QR
      if (!data || data.trim() === '') {
        throw new Error('Código QR vacío o inválido');
      }

      // Extraer código con múltiples estrategias
      let code: string;
      
      try {
        // Estrategia 1: Si es una URL completa
        if (data.includes('http')) {
          const url = new URL(data);
          
          // Buscar en query parameters
          if (url.searchParams.has('code')) {
            code = url.searchParams.get('code') || '';
          } 
          // Buscar en path
          else if (data.includes('attendance/scan/')) {
            const match = data.match(/attendance\/scan\/([^/?#]+)/);
            code = match ? match[1] : '';
          }
          // Buscar cualquier UUID en la URL
          else {
            const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
            const match = data.match(uuidRegex);
            code = match ? match[0] : '';
          }
        } 
        // Estrategia 2: Si parece un UUID directo
        else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.trim())) {
          code = data.trim();
        }
        // Estrategia 3: Buscar UUID en cualquier parte del texto
        else {
          const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
          const match = data.match(uuidRegex);
          if (match) {
            code = match[0];
          } else {
            // Estrategia 4: Usar todo el contenido como código
            code = data.trim();
          }
        }
      } catch (urlError) {
        // Buscar UUID en el texto
        const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
        const match = data.match(uuidRegex);
        code = match ? match[0] : data.trim();
      }

      if (!code) {
        throw new Error('No se pudo extraer el código del QR');
      }

      // Registrar asistencia
      const result = await scanQRAndRegisterAttendance(code);
      
      // Mostrar éxito
      setModalData({
        success: true,
        message: '¡Asistencia Registrada!',
        subtitle: 'Gracias por asistir a nuestro culto joven',
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

      // Cerrar scanner
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (error: any) {
      // Limpiar refs en error
      isProcessingRef.current = false;
      
      // Mostrar error
      setModalData({
        success: false,
        message: 'Error al Registrar',
        subtitle: error.message || 'Ocurrió un error inesperado'
      });
      setShowModal(true);

      // Reanudar scanner después del error
      setTimeout(() => {
        if (scannerRef.current && !isProcessingRef.current) {
          try {
            scannerRef.current.start();
            setIsScanning(true);
            canScanRef.current = true;
          } catch (resumeError) {
            console.error('Error reanudando scanner:', resumeError);
            handleRetry();
          }
        }
      }, 3000);
    }
  };

  // Manejar cierre
  const handleClose = () => {
    cleanup();
    setError(null);
    setCameraState('prompt');
    onClose();
  };

  // Reintentar
  const handleRetry = () => {
    setError(null);
    setCameraState('prompt');
    // Limpiar scanner anterior si existe
    if (scannerRef.current) {
      try {
        scannerRef.current.destroy();
      } catch (error) {
        console.warn('Error limpiando scanner anterior:', error);
      }
      scannerRef.current = null;
    }
    startScanner();
  };

  // Manejar cierre de modal
  const handleModalClose = () => {
    setShowModal(false);
    setModalData(null);
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black bg-opacity-75"
            onClick={handleClose}
          />
          
          {/* Scanner Modal */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            className={`relative w-full max-w-md mx-auto ${
              isDark ? 'bg-gray-800' : 'bg-white'
            } rounded-2xl overflow-hidden shadow-2xl`}
            style={{ 
              touchAction: 'manipulation', // Prevenir zoom en móviles
              WebkitUserSelect: 'none',
              userSelect: 'none'
            }}
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
              {/* Inicializando */}
              {isInitializing && (
                <div className="p-8 text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 mx-auto mb-4"
                  >
                    <ArrowPathIcon className={`w-full h-full ${
                      isDark ? 'text-blue-400' : 'text-blue-500'
                    }`} />
                  </motion.div>
                  <p className={`text-sm ${
                    isDark ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {isMobile ? 'Preparando cámara móvil...' : 'Inicializando cámara...'}
                  </p>
                </div>
              )}

              {/* Error */}
              {error && !isInitializing && (
                <div className="p-8 text-center">
                  <ExclamationTriangleIcon className={`w-16 h-16 mx-auto mb-4 ${
                    isDark ? 'text-red-400' : 'text-red-500'
                  }`} />
                  <h4 className={`font-semibold mb-2 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {cameraState === 'denied' ? 'Permisos Requeridos' : 'Error de Cámara'}
                  </h4>
                  <p className={`text-sm mb-6 ${
                    isDark ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {error}
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={handleRetry}
                      className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                      {cameraState === 'denied' ? 'Solicitar Permisos' : 'Reintentar'}
                    </button>
                    {isMobile && (
                      <div className={`text-xs ${
                        isDark ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        <p>💡 En móviles: Permite el acceso cuando tu navegador lo solicite</p>
                        <p>⚙️ Si no funciona, revisa la configuración de permisos</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Scanner activo */}
              {cameraState === 'granted' && !error && (
                <div className="relative aspect-square bg-black">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    style={{ 
                      transform: 'scaleX(-1)', // Efecto espejo
                      WebkitTransform: 'scaleX(-1)'
                    }}
                    autoPlay
                    playsInline // Crucial para iOS
                    muted // Necesario para autoplay
                  />
                  
                  {/* Overlay de escaneo */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      <div className="w-56 h-56 relative">
                        {/* Esquinas del marco */}
                        {[
                          { top: 0, left: 0, rotate: 0 },
                          { top: 0, right: 0, rotate: 90 },
                          { bottom: 0, left: 0, rotate: -90 },
                          { bottom: 0, right: 0, rotate: 180 }
                        ].map((corner, i) => (
                          <motion.div
                            key={i}
                            className="absolute w-8 h-8"
                            style={corner}
                            animate={{
                              opacity: [0.7, 1, 0.7],
                              scale: [1, 1.1, 1]
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              delay: i * 0.2
                            }}
                          >
                            <div className="w-full h-1 bg-blue-400 rounded"></div>
                            <div className="w-1 h-full bg-blue-400 rounded"></div>
                          </motion.div>
                        ))}
                        
                        {/* Línea de escaneo */}
                        <motion.div
                          className="absolute left-4 right-4 h-0.5 bg-blue-400 shadow-lg"
                          animate={{ y: [16, 208, 16] }}
                          transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Estado */}
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <motion.div
                      className="bg-black/70 rounded-full px-6 py-3 mx-4"
                      style={{ backdropFilter: 'blur(8px)' }}
                      animate={isScanning ? {
                        scale: [1, 1.02, 1]
                      } : {}}
                      transition={{
                        duration: 1.5,
                        repeat: isScanning ? Infinity : 0
                      }}
                    >
                      <p className="text-white text-sm font-medium flex items-center justify-center gap-2">
                        {isScanning ? (
                          <>
                            <motion.div
                              className="w-2 h-2 bg-green-400 rounded-full"
                              animate={{ scale: [1, 1.5, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            />
                            Apunta el QR al centro
                          </>
                        ) : isInitializing ? (
                          <>
                            <motion.div
                              className="w-2 h-2 bg-blue-400 rounded-full"
                              animate={{ scale: [1, 1.5, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            />
                            Preparando escáner...
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                            Procesando...
                          </>
                        )}
                      </p>
                    </motion.div>
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

export default QRScanner;