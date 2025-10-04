import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QrScanner from 'qr-scanner';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { scanQRAndRegisterAttendance } from '../services/api';
import AttendanceModal from './AttendanceModal';
import { useTheme } from '../context/ThemeContext';

interface QRScannerDirectProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: any) => void;
}

const QRScannerDirect: React.FC<QRScannerDirectProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [scanner, setScanner] = useState<QrScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'init' | 'permissions' | 'starting' | 'ready' | 'error'>('init');
  const { isDark } = useTheme();

  // Estados del modal
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<{
    success: boolean;
    message: string;
    subtitle?: string;
    date?: string;
  } | null>(null);

  // ID único para el video element
  const videoId = 'qr-scanner-video-direct';

  useEffect(() => {
    if (isOpen) {
      console.log('🎬 Iniciando QR Scanner Direct...');
      initializeDirectScanner();
    } else {
      cleanup();
    }

    return cleanup;
  }, [isOpen]);

  const cleanup = () => {
    console.log('🧹 Limpiando recursos...');
    if (scanner) {
      try {
        scanner.destroy();
      } catch (error) {
        console.warn('Error limpiando scanner:', error);
      }
      setScanner(null);
    }
    setIsScanning(false);
    setError(null);
    setStatus('init');
  };

  const initializeDirectScanner = async () => {
    try {
      setStatus('init');
      setError(null);

      // Esperar a que el DOM esté listo
      await waitForVideoElement();

      setStatus('permissions');
      console.log('📷 Solicitando permisos...');

      // Verificar soporte
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Tu navegador no soporta acceso a la cámara');
      }

      // Verificar cámaras
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        throw new Error('No se encontró ninguna cámara');
      }

      // Solicitar permisos
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      stream.getTracks().forEach(track => track.stop());

      setStatus('starting');
      console.log('🔍 Creando scanner...');

      // Obtener elemento por ID
      const videoElement = document.getElementById(videoId) as HTMLVideoElement;
      if (!videoElement) {
        throw new Error('Elemento de video no encontrado');
      }

      console.log('✅ Elemento video encontrado, inicializando scanner...');

      const qrScanner = new QrScanner(
        videoElement,
        (result) => {
          const data = typeof result === 'string' ? result : result.data;
          handleScanResult(data);
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment',
          maxScansPerSecond: 2,
          onDecodeError: () => {
            // Ignorar errores de decodificación
          }
        }
      );

      await qrScanner.start();
      setScanner(qrScanner);
      setIsScanning(true);
      setStatus('ready');
      
      console.log('✅ Scanner iniciado correctamente!');

    } catch (error: any) {
      console.error('❌ Error:', error);
      setError(error.message);
      setStatus('error');
    }
  };

  const waitForVideoElement = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 20;

      const checkElement = () => {
        const element = document.getElementById(videoId);
        console.log(`🔍 Intento ${attempts + 1}: Elemento encontrado:`, !!element);
        
        if (element) {
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('Timeout esperando elemento de video'));
        } else {
          attempts++;
          setTimeout(checkElement, 250);
        }
      };

      // Comenzar verificación después de un frame
      requestAnimationFrame(checkElement);
    });
  };

  const handleScanResult = async (data: string) => {
    if (!isScanning) return;

    try {
      console.log('📱 QR detectado:', data);
      setIsScanning(false);
      scanner?.pause();

      if (!data?.trim()) {
        throw new Error('Código QR vacío');
      }

      let code = data.trim();
      if (data.includes('code=')) {
        try {
          const url = new URL(data);
          code = url.searchParams.get('code') || data;
        } catch {
          // Usar data original
        }
      }

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

      setTimeout(() => {
        if (scanner) {
          try {
            scanner.start();
            setIsScanning(true);
          } catch (err) {
            console.error('Error reanudando:', err);
          }
        }
      }, 3000);
    }
  };

  const handleRetry = () => {
    cleanup();
    setTimeout(() => {
      initializeDirectScanner();
    }, 500);
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

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
              {/* Debug */}
              <div className={`px-4 py-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Estado: {status} | Scanner: {isScanning ? '✅' : '❌'}
              </div>

              {/* Estados de carga */}
              {(status === 'init' || status === 'permissions' || status === 'starting') && (
                <div className="p-8 text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 mx-auto mb-4"
                  >
                    <div className="w-full h-full border-4 border-blue-500 border-t-transparent rounded-full"></div>
                  </motion.div>
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {status === 'init' && 'Preparando...'}
                    {status === 'permissions' && 'Solicitando permisos...'}
                    {status === 'starting' && 'Iniciando cámara...'}
                  </p>
                </div>
              )}

              {/* Error */}
              {status === 'error' && (
                <div className="p-8 text-center">
                  <ExclamationTriangleIcon className="w-16 h-16 mx-auto mb-4 text-red-500" />
                  <h4 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Error
                  </h4>
                  <p className={`text-sm mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
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

              {/* Scanner listo */}
              {status === 'ready' && (
                <div className="relative aspect-square bg-black">
                  <video
                    id={videoId}
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                    autoPlay
                    playsInline
                    muted
                  />
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-blue-400 rounded-lg relative">
                      <motion.div
                        className="absolute left-0 right-0 h-0.5 bg-blue-400"
                        animate={{ y: [0, 192, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <div className="bg-black/70 rounded-full px-4 py-2 mx-4">
                      <p className="text-white text-sm">
                        {isScanning ? '📱 Apunta el QR al centro' : '⏳ Iniciando...'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

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

export default QRScannerDirect;