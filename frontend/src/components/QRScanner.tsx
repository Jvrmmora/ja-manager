import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QrScanner from 'qr-scanner';
import { XMarkIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { scanQRAndRegisterAttendance } from '../services/api';
import AttendanceModal from './AttendanceModal';
import MobileInstructions from './MobileInstructions';
import { useTheme } from '../context/ThemeContext';
import { useCameraPermission } from '../hooks/useCameraPermission';
import { useDeviceDetection, getMobileOptimizedConfig } from '../hooks/useDeviceDetection';
import './QRScanner.css';

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
  const [showInstructions, setShowInstructions] = useState(false);
  const { isDark } = useTheme();
  
  // Hooks personalizados para mejor manejo móvil
  const { permission, checkSupport, requestPermission, reset } = useCameraPermission();
  const deviceInfo = useDeviceDetection();

  // Estados del modal de resultado
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<{
    success: boolean;
    message: string;
    subtitle?: string;
    date?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Mostrar instrucciones en móviles la primera vez
      if (deviceInfo.isMobile && permission.state === 'prompt') {
        setShowInstructions(true);
      } else {
        initializeCamera();
      }
    } else {
      cleanup();
      setShowInstructions(false);
    }

    return cleanup;
  }, [isOpen, deviceInfo.isMobile, permission.state]);

  const cleanup = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.destroy();
      } catch (error) {
        console.warn('Error destroying scanner:', error);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setIsInitializing(false);
  };

  const initializeCamera = async () => {
    try {
      setIsInitializing(true);
      
      // Verificar soporte y permisos
      const hasSupport = await checkSupport();
      if (!hasSupport) {
        return;
      }

      // Solicitar permisos
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        return;
      }

      // Inicializar scanner con configuración optimizada
      await initializeScanner();

    } catch (error) {
      console.error('Error inicializando cámara:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const initializeScanner = async () => {
    if (!videoRef.current) {
      console.error('Elemento de video no disponible');
      return;
    }

    try {
      // Configuración optimizada para móviles
      const config = getMobileOptimizedConfig(deviceInfo);

      // Crear el scanner
      scannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          // result puede ser string o un objeto con datos
          const qrData = typeof result === 'string' ? result : result.data;
          handleScanResult(qrData);
        },
        {
          ...config,
          onDecodeError: (error: any) => {
            // Solo log en desarrollo
            if (process.env.NODE_ENV === 'development') {
              console.log('Decode error:', error);
            }
          },
        }
      );

      // Iniciar el scanner
      await scannerRef.current.start();
      setIsScanning(true);

      console.log('✅ Scanner QR inicializado correctamente');

    } catch (error: any) {
      console.error('❌ Error inicializando scanner:', error);
      setIsScanning(false);
    }
  };

  const handleScanResult = async (data: string) => {
    // Evitar múltiples escaneos simultáneos
    if (!isScanning) return;
    
    try {
      setIsScanning(false);
      
      // Pausar el scanner temporalmente para evitar múltiples scans
      if (scannerRef.current) {
        scannerRef.current.pause();
      }

      console.log('📱 QR escaneado:', data);

      // Validar que el QR no esté vacío
      if (!data || data.trim() === '') {
        throw new Error('Código QR vacío o inválido');
      }

      // Extraer el código del QR de manera más robusta
      let code: string;
      
      try {
        // Intentar como URL completa
        if (data.includes('/attendance/scan?code=') || data.includes('code=')) {
          const url = new URL(data);
          code = url.searchParams.get('code') || '';
        } else if (data.includes('attendance/scan/')) {
          // Formato: .../attendance/scan/CODIGO
          const match = data.match(/attendance\/scan\/([^/?]+)/);
          code = match ? match[1] : '';
        } else {
          // Asumir que es el código directamente
          code = data.trim();
        }
      } catch (urlError) {
        // Si no es una URL válida, usar como código directo
        code = data.trim();
      }

      if (!code) {
        throw new Error('No se pudo extraer el código del QR escaneado');
      }

      console.log('🔍 Código extraído:', code);

      // Registrar asistencia con mejor manejo de errores
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
      console.error('❌ Error registrando asistencia:', error);
      
      let errorMessage = 'Ocurrió un error inesperado';
      
      // Manejar diferentes tipos de errores
      if (error.message) {
        if (error.message.includes('QR inválido') || error.message.includes('Código QR inválido')) {
          errorMessage = 'El código QR escaneado no es válido';
        } else if (error.message.includes('expirado')) {
          errorMessage = 'Este código QR ha expirado';
        } else if (error.message.includes('ya registrada')) {
          errorMessage = 'Tu asistencia ya ha sido registrada';
        } else if (error.message.includes('conexión') || error.message.includes('network')) {
          errorMessage = 'Error de conexión. Verifica tu internet';
        } else {
          errorMessage = error.message;
        }
      }
      
      // Mostrar modal de error
      setModalData({
        success: false,
        message: 'Error al Registrar',
        subtitle: errorMessage
      });
      setShowModal(true);

      // Reanudar el scanner después del error (con un delay más largo)
      setTimeout(() => {
        if (scannerRef.current && !showModal) {
          try {
            scannerRef.current.start();
            setIsScanning(true);
          } catch (resumeError) {
            console.error('Error reanudando scanner:', resumeError);
            // En caso de error, reinicializar completamente
            handleRetry();
          }
        }
      }, 3000);
    }
  };

  const handleClose = () => {
    cleanup();
    reset(); // Reiniciar estado de permisos
    setShowInstructions(false);
    onClose();
  };

  const handleRetry = async () => {
    reset(); // Reiniciar estado de permisos
    if (deviceInfo.isMobile) {
      setShowInstructions(true);
    } else {
      await initializeCamera();
    }
  };

  const handleInstructionsContinue = () => {
    setShowInstructions(false);
    initializeCamera();
  };

  const handleInstructionsCancel = () => {
    setShowInstructions(false);
    handleClose();
  };

  const handleModalClose = () => {
    setShowModal(false);
    setModalData(null);
    
    // Si el modal era de error y el scanner sigue activo, reanudar
    if (modalData && !modalData.success && scannerRef.current) {
      try {
        setIsScanning(true);
        scannerRef.current.start();
      } catch (error) {
        console.error('Error reanudando después de cerrar modal:', error);
      }
    }
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
            className={`qr-scanner-modal relative w-full max-w-md mx-auto ${
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
              {/* Instrucciones para móviles */}
              {showInstructions && (
                <MobileInstructions
                  onContinue={handleInstructionsContinue}
                  onCancel={handleInstructionsCancel}
                />
              )}

              {/* Estado de inicialización */}
              {!showInstructions && isInitializing && (
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
                    Inicializando cámara...
                  </p>
                </div>
              )}

              {/* Error de permisos denegados */}
              {!showInstructions && permission.state === 'denied' && !isInitializing && (
                <div className="p-8 text-center">
                  <ExclamationTriangleIcon className={`w-16 h-16 mx-auto mb-4 ${
                    isDark ? 'text-red-400' : 'text-red-500'
                  }`} />
                  <h4 className={`font-semibold mb-2 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    Permisos de Cámara Requeridos
                  </h4>
                  <p className={`text-sm mb-6 ${
                    isDark ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {permission.error || 'Para escanear códigos QR necesitamos acceso a tu cámara.'}
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={handleRetry}
                      className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                      Solicitar Permisos Nuevamente
                    </button>
                    <div className={`text-xs ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <p>💡 <strong>Consejo:</strong> Si no funciona, revisa la configuración de permisos de tu navegador</p>
                      {deviceInfo.isMobile && (
                        <p className="mt-1">📱 En móviles, asegúrate de permitir el acceso a la cámara cuando se solicite</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Error de soporte */}
              {!showInstructions && !permission.isSupported && !isInitializing && (
                <div className="p-8 text-center">
                  <ExclamationTriangleIcon className={`w-16 h-16 mx-auto mb-4 ${
                    isDark ? 'text-yellow-400' : 'text-yellow-500'
                  }`} />
                  <h4 className={`font-semibold mb-2 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    No Compatible
                  </h4>
                  <p className={`text-sm mb-4 ${
                    isDark ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {permission.error || 'Tu navegador no soporta el escáner QR'}
                  </p>
                  {deviceInfo.isMobile && (
                    <div className={`text-xs ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <p>📱 Intenta abrir este sitio en Chrome o Safari</p>
                    </div>
                  )}
                </div>
              )}

              {/* Cámara activa y funcionando */}
              {!showInstructions && permission.state === 'granted' && permission.isSupported && !isInitializing && (
                <div className="qr-scanner-container relative aspect-square bg-black">
                  <video
                    ref={videoRef}
                    className="qr-scanner-video w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }} // Efecto espejo para mejor UX
                    autoPlay
                    playsInline // Importante para iOS
                    muted // Importante para autoplay en móviles
                  />
                  
                  {/* Overlay de escaneo mejorado */}
                  <div className="qr-scanner-overlay absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      {/* Marco de escaneo con animación mejorada */}
                      <div className="qr-scan-frame w-56 h-56 relative">
                        {/* Esquinas del marco de escaneo con gradiente */}
                        <div className="absolute top-0 left-0 w-12 h-12">
                          <div className="w-full h-1 bg-gradient-to-r from-blue-400 to-white rounded-full"></div>
                          <div className="w-1 h-full bg-gradient-to-b from-blue-400 to-white rounded-full"></div>
                        </div>
                        <div className="absolute top-0 right-0 w-12 h-12">
                          <div className="w-full h-1 bg-gradient-to-l from-blue-400 to-white rounded-full"></div>
                          <div className="w-1 h-full bg-gradient-to-b from-blue-400 to-white rounded-full ml-auto"></div>
                        </div>
                        <div className="absolute bottom-0 left-0 w-12 h-12">
                          <div className="w-1 h-full bg-gradient-to-t from-blue-400 to-white rounded-full"></div>
                          <div className="w-full h-1 bg-gradient-to-r from-blue-400 to-white rounded-full mt-auto"></div>
                        </div>
                        <div className="absolute bottom-0 right-0 w-12 h-12">
                          <div className="w-1 h-full bg-gradient-to-t from-blue-400 to-white rounded-full ml-auto"></div>
                          <div className="w-full h-1 bg-gradient-to-l from-blue-400 to-white rounded-full mt-auto"></div>
                        </div>
                        
                        {/* Línea de escaneo animada mejorada */}
                        <motion.div
                          className="absolute left-6 right-6 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-lg"
                          animate={{ y: [24, 200, 24] }}
                          transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />

                        {/* Puntos de esquina animados */}
                        {[
                          { top: '0%', left: '0%' },
                          { top: '0%', right: '0%' },
                          { bottom: '0%', left: '0%' },
                          { bottom: '0%', right: '0%' }
                        ].map((position, index) => (
                          <motion.div
                            key={index}
                            className="absolute w-3 h-3 bg-blue-400 rounded-full shadow-lg"
                            style={position}
                            animate={{
                              scale: [1, 1.3, 1],
                              opacity: [0.7, 1, 0.7]
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              delay: index * 0.2
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Estado de escaneo con mejor UX */}
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <motion.div
                      className="qr-status-text bg-black/70 rounded-full px-6 py-3 mx-4 backdrop-blur-sm"
                      animate={{
                        scale: isScanning ? [1, 1.02, 1] : 1
                      }}
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
                            Apunta el código QR al centro
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