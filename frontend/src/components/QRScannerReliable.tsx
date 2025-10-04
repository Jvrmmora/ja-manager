import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QrScanner from 'qr-scanner';
import { XMarkIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { scanQRAndRegisterAttendance } from '../services/api';
import AttendanceModal from './AttendanceModal';
import { useTheme } from '../context/ThemeContext';

interface QRScannerReliableProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: any) => void;
}

const QRScannerReliable: React.FC<QRScannerReliableProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const retryCountRef = useRef(0);
  
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'checking' | 'granted' | 'denied'>('checking');
  const [videoReady, setVideoReady] = useState(false);
  const { isDark } = useTheme();

  // Estados del modal
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<{
    success: boolean;
    message: string;
    subtitle?: string;
    date?: string;
  } | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (scannerRef.current) {
      try {
        scannerRef.current.destroy();
        console.log('Scanner destruido correctamente');
      } catch (error) {
        console.warn('Error limpiando scanner:', error);
      }
      scannerRef.current = null;
    }
    
    setIsScanning(false);
    setIsInitializing(false);
    setVideoReady(false);
    retryCountRef.current = 0;
  }, []);

  // Efecto principal
  useEffect(() => {
    if (isOpen) {
      console.log('🎬 Modal abierto, iniciando proceso...');
      setError(null);
      setPermissionState('checking');
      setVideoReady(false);
      
      // Usar requestAnimationFrame para asegurar que el DOM esté listo
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          console.log('🎯 DOM listo, verificando video element...');
          checkVideoElement();
        });
      });
    } else {
      cleanup();
      setError(null);
      setPermissionState('checking');
    }

    return cleanup;
  }, [isOpen, cleanup]);

  // Verificar que el elemento video existe
  const checkVideoElement = () => {
    console.log('🔍 Verificando elemento video...');
    
    if (videoRef.current) {
      console.log('✅ Elemento video encontrado!');
      setVideoReady(true);
      initializeCamera();
    } else {
      console.error('❌ Elemento video NO encontrado');
      retryCountRef.current++;
      
      if (retryCountRef.current < 5) {
        console.log(`🔄 Reintentando... (${retryCountRef.current}/5)`);
        setTimeout(checkVideoElement, 300);
      } else {
        setError('No se pudo inicializar el elemento de video. Intenta cerrar y abrir nuevamente.');
      }
    }
  };

  // Inicializar cámara
  const initializeCamera = async () => {
    try {
      setIsInitializing(true);
      setError(null);

      console.log('🎥 Iniciando proceso de cámara...');

      // Verificar soporte
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta acceso a la cámara');
      }

      // Verificar cámaras
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        throw new Error('No se encontró ninguna cámara en el dispositivo');
      }

      console.log('📷 Cámara disponible, solicitando permisos...');

      // Solicitar permisos con configuración básica
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 640 }
        }
      });

      // Cerrar stream inmediatamente
      stream.getTracks().forEach(track => track.stop());
      
      setPermissionState('granted');
      console.log('✅ Permisos concedidos');

      // Esperar un poco más antes de inicializar el scanner
      setTimeout(() => {
        initializeScanner();
      }, 500);

    } catch (error: any) {
      console.error('❌ Error en inicialización de cámara:', error);
      
      if (error.name === 'NotAllowedError') {
        setPermissionState('denied');
        setError('Permisos de cámara denegados. Por favor, permite el acceso a la cámara.');
      } else {
        setError(`Error: ${error.message}`);
      }
      setIsInitializing(false);
    }
  };

  // Inicializar scanner
  const initializeScanner = async () => {
    try {
      console.log('🔍 Inicializando QR Scanner...');
      
      // Triple verificación del elemento video
      if (!videoRef.current) {
        throw new Error('Elemento de video no disponible en initializeScanner');
      }

      console.log('📹 Elemento video confirmado, creando scanner...');

      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('📱 QR detectado!');
          const qrData = typeof result === 'string' ? result : result.data;
          handleScanResult(qrData);
        },
        {
          onDecodeError: () => {
            // Silencioso - errores de decodificación son normales
          },
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment',
          maxScansPerSecond: 2,
        }
      );

      console.log('🚀 Iniciando scanner...');
      await scanner.start();
      
      scannerRef.current = scanner;
      setIsScanning(true);
      setIsInitializing(false);
      
      console.log('✅ QR Scanner iniciado correctamente!');

    } catch (error: any) {
      console.error('❌ Error inicializando scanner:', error);
      setError(`Error del scanner: ${error.message}`);
      setIsInitializing(false);
    }
  };

  // Manejar resultado del scan
  const handleScanResult = async (data: string) => {
    if (!isScanning) return;

    try {
      console.log('📱 Procesando QR:', data);
      setIsScanning(false);
      
      if (scannerRef.current) {
        scannerRef.current.pause();
      }

      if (!data?.trim()) {
        throw new Error('Código QR vacío');
      }

      // Extraer código simple
      let code = data.trim();
      if (data.includes('code=')) {
        try {
          const url = new URL(data);
          code = url.searchParams.get('code') || data;
        } catch {
          // Usar data original si no es URL válida
        }
      }

      console.log('🔍 Registrando asistencia con código:', code);

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

      setTimeout(() => onClose(), 2000);

    } catch (error: any) {
      console.error('❌ Error procesando QR:', error);
      
      setModalData({
        success: false,
        message: 'Error al Registrar',
        subtitle: error.message || 'Error inesperado'
      });
      setShowModal(true);

      // Reanudar después de error
      setTimeout(() => {
        if (scannerRef.current) {
          try {
            scannerRef.current.start();
            setIsScanning(true);
          } catch (err) {
            console.error('Error reanudando:', err);
            handleRetry();
          }
        }
      }, 3000);
    }
  };

  // Reintentar todo el proceso
  const handleRetry = () => {
    console.log('🔄 Reintentando todo el proceso...');
    cleanup();
    setError(null);
    setPermissionState('checking');
    retryCountRef.current = 0;
    
    setTimeout(() => {
      checkVideoElement();
    }, 500);
  };

  // Cerrar
  const handleClose = () => {
    cleanup();
    onClose();
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
            ref={containerRef}
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
              {/* Debug info */}
              <div className={`px-4 py-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Video: {videoReady ? '✅' : '❌'} | 
                Permisos: {permissionState} | 
                Scanner: {isScanning ? '✅' : '❌'}
              </div>

              {/* Loading */}
              {(isInitializing || permissionState === 'checking') && (
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
                    {!videoReady ? 'Preparando video...' : 
                     permissionState === 'checking' ? 'Verificando permisos...' :
                     'Inicializando cámara...'}
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
                    Error
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
                    Reintentar
                  </button>
                </div>
              )}

              {/* Scanner */}
              {permissionState === 'granted' && videoReady && !error && !isInitializing && (
                <div className="relative aspect-square bg-black">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={() => {
                      console.log('📹 Video metadata loaded');
                    }}
                    onCanPlay={() => {
                      console.log('📹 Video can play');
                    }}
                  />
                  
                  {/* Overlay simple */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-blue-400 rounded-lg relative">
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
                        {isScanning ? '📱 Apunta el QR al centro' : '⏳ Preparando...'}
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

export default QRScannerReliable;