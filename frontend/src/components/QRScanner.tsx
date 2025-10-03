import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QrScanner from 'qr-scanner';
import { XMarkIcon, CameraIcon } from '@heroicons/react/24/outline';
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
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const { isDark } = useTheme();

  // Estados del modal de resultado
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<{
    success: boolean;
    message: string;
    subtitle?: string;
    date?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      initializeScanner();
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, [isOpen]);

  const initializeScanner = async () => {
    try {
      setError(null);
      setIsScanning(true);

      // Verificar si hay cámaras disponibles
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        throw new Error('No se encontró ninguna cámara en el dispositivo');
      }

      // Inicializar el scanner
      if (videoRef.current) {
        scannerRef.current = new QrScanner(
          videoRef.current,
          (result) => handleScanResult(result.data),
          {
            onDecodeError: (error) => {
              console.log('Decode error:', error);
              // No mostrar errores de decodificación ya que son normales
            },
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: 'environment', // Cámara trasera preferida
          }
        );

        await scannerRef.current.start();
        setCameraPermission('granted');
        setIsScanning(true);
      }
    } catch (error: any) {
      console.error('Error inicializando scanner:', error);
      if (error.name === 'NotAllowedError') {
        setCameraPermission('denied');
        setError('Permisos de cámara denegados. Por favor, permite el acceso a la cámara.');
      } else {
        setError(error.message || 'Error al inicializar la cámara');
      }
      setIsScanning(false);
    }
  };

  const handleScanResult = async (data: string) => {
    try {
      setIsScanning(false);
      
      // Pausar el scanner temporalmente
      if (scannerRef.current) {
        scannerRef.current.pause();
      }

      console.log('QR escaneado:', data);

      // Extraer el código del QR
      let code: string;
      if (data.includes('/attendance/scan?code=')) {
        const url = new URL(data);
        code = url.searchParams.get('code') || '';
      } else {
        code = data;
      }

      if (!code) {
        throw new Error('Código QR inválido');
      }

      // Registrar asistencia
      const result = await scanQRAndRegisterAttendance(code);
      
      // Mostrar modal de éxito
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

      // Callback de éxito
      if (onSuccess) {
        onSuccess(result);
      }

      // Cerrar scanner después de un breve delay
      setTimeout(() => {
        onClose();
      }, 100);

    } catch (error: any) {
      console.error('Error registrando asistencia:', error);
      
      // Mostrar modal de error
      setModalData({
        success: false,
        message: 'Error al Registrar',
        subtitle: error.message || 'Ocurrió un error inesperado'
      });
      setShowModal(true);

      // Reanudar el scanner después del error
      setTimeout(() => {
        if (scannerRef.current) {
          scannerRef.current.start();
          setIsScanning(true);
        }
      }, 2000);
    }
  };

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    setError(null);
    setIsScanning(false);
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

            {/* Scanner Area */}
            <div className="relative">
              {cameraPermission === 'denied' && (
                <div className="p-8 text-center">
                  <CameraIcon className={`w-16 h-16 mx-auto mb-4 ${
                    isDark ? 'text-gray-600' : 'text-gray-400'
                  }`} />
                  <p className={`text-sm ${
                    isDark ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Permisos de cámara denegados. Por favor, permite el acceso a la cámara en la configuración de tu navegador.
                  </p>
                  <button
                    onClick={initializeScanner}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Intentar de nuevo
                  </button>
                </div>
              )}

              {cameraPermission === 'granted' && (
                <div className="relative aspect-square">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }} // Efecto espejo
                  />
                  
                  {/* Overlay de escaneo */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      {/* Esquinas del marco de escaneo */}
                      <div className="w-48 h-48 relative">
                        {/* Esquina superior izquierda */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                        {/* Esquina superior derecha */}
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                        {/* Esquina inferior izquierda */}
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                        {/* Esquina inferior derecha */}
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                        
                        {/* Línea de escaneo animada */}
                        <motion.div
                          className="absolute left-0 right-0 h-0.5 bg-blue-400 shadow-lg"
                          animate={{ y: [0, 192, 0] }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Estado de escaneo */}
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <p className="text-white text-sm font-medium bg-black/50 rounded-full px-4 py-2 mx-4">
                      {isScanning ? 'Apunta el código QR al centro' : 'Procesando...'}
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 text-center">
                  <p className="text-red-500 text-sm">{error}</p>
                  <button
                    onClick={initializeScanner}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                  >
                    Reintentar
                  </button>
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