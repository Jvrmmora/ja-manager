import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import QrScanner from 'qr-scanner';

interface QRScannerMobileProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (qrData: string) => void;
}

type ScannerState = 'initializing' | 'requesting-permissions' | 'starting' | 'ready' | 'error';

interface ScannerError {
  type: 'permission' | 'camera' | 'timeout' | 'unknown';
  message: string;
  details?: string;
}

const QRScannerMobile: React.FC<QRScannerMobileProps> = ({ isOpen, onClose, onScan }) => {
  // Ref para el video element
  const [videoError, setVideoError] = useState<string | null>(null);

  const [state, setState] = useState<ScannerState>('initializing');
  const [error, setError] = useState<ScannerError | null>(null);
  const [qrScanner, setQrScanner] = useState<QrScanner | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  // Nuevo: Estado interno de éxito
  const [scanSuccess, setScanSuccess] = useState(false);

  // Helper para logs con timestamp
  const logWithTimestamp = useCallback((message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[QRScannerMobile ${timestamp}] ${message}`, data || '');
  }, []);

  // Función mejorada para esperar el elemento video
  const waitForVideoElement = useCallback(async (timeout = 15000): Promise<HTMLVideoElement> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkElement = () => {
        // Intentar múltiples formas de encontrar el elemento video
        let videoElement = document.getElementById('qr-video') as HTMLVideoElement;
        
        if (!videoElement) {
          // Buscar por selector más general
          videoElement = document.querySelector('#qr-video, video[id="qr-video"]') as HTMLVideoElement;
        }
        
        if (!videoElement) {
          // Buscar cualquier video dentro del modal
          const modal = document.querySelector('[data-qr-modal="true"]');
          if (modal) {
            videoElement = modal.querySelector('video') as HTMLVideoElement;
          }
        }

        logWithTimestamp('Checking for video element', { 
          found: !!videoElement, 
          elementId: videoElement?.id,
          tagName: videoElement?.tagName 
        });

        if (videoElement) {
          // Agregar listeners de error y ended
          videoElement.onerror = (e) => {
            setVideoError('Error en el elemento de video');
            logWithTimestamp('Video element error', e);
          };
          videoElement.onended = (e) => {
            setVideoError('Stream de cámara finalizado');
            logWithTimestamp('Video element ended', e);
          };
          videoElement.onpause = (e) => {
            logWithTimestamp('Video element paused', e);
          };
          videoElement.onplay = (e) => {
            logWithTimestamp('Video element play', e);
          };
          resolve(videoElement);
          return;
        }

        const elapsed = Date.now() - startTime;
        if (elapsed >= timeout) {
          reject(new Error(`Video element not found after ${timeout}ms`));
          return;
        }

        // Reintentar con diferentes intervalos
        const retryDelay = elapsed < 1000 ? 50 : elapsed < 5000 ? 100 : 200;
        setTimeout(checkElement, retryDelay);
      };

      // Comenzar inmediatamente
      checkElement();
    });
  }, [logWithTimestamp]);

  // Función para detectar capacidades del dispositivo
  const detectDeviceCapabilities = useCallback(async () => {
    const capabilities = {
      hasCamera: false,
      hasPermissions: false,
      isSecureContext: false,
      userAgent: navigator.userAgent,
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    };

    try {
      // Verificar contexto seguro
      capabilities.isSecureContext = window.isSecureContext || location.protocol === 'https:';

      // Verificar disponibilidad de getUserMedia
      if (navigator.mediaDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          capabilities.hasCamera = devices.some(device => device.kind === 'videoinput');
        } catch (e) {
          logWithTimestamp('Error enumerating devices', e);
        }
      }

      logWithTimestamp('Device capabilities detected', capabilities);
      return capabilities;
    } catch (e) {
      logWithTimestamp('Error detecting capabilities', e);
      return capabilities;
    }
  }, [logWithTimestamp]);

  // Función para inicializar el escáner con retry lógico
  const initializeScanner = useCallback(async () => {
    setScanSuccess(false);
      // Log avanzado: estado del stream y tracks
      const logStreamTracks = (videoElement: HTMLVideoElement) => {
        if (videoElement && videoElement.srcObject instanceof MediaStream) {
          const stream = videoElement.srcObject as MediaStream;
          logWithTimestamp('STREAM: active=' + stream.active + ', tracks=' + stream.getTracks().length);
          stream.getTracks().forEach((track, idx) => {
            logWithTimestamp(`Track[${idx}]: kind=${track.kind}, readyState=${track.readyState}, enabled=${track.enabled}`);
          });
        } else {
          logWithTimestamp('STREAM: No MediaStream en videoElement');
        }
      };
    try {
      setState('initializing');
      setError(null);
      setVideoError(null);
      logWithTimestamp('Starting scanner initialization');

      // Detectar capacidades del dispositivo
      const capabilities = await detectDeviceCapabilities();
      
      if (!capabilities.isSecureContext) {
        throw new Error('HTTPS required for camera access');
      }

      if (!capabilities.hasCamera) {
        throw new Error('No camera found on device');
      }

      setState('requesting-permissions');
      
      // Esperar a que el elemento video esté disponible
      logWithTimestamp('Waiting for video element...');
      const videoElement = await waitForVideoElement(10000);
      logWithTimestamp('Video element found', { id: videoElement.id });

      setState('starting');


      // --- PATCH: Constraints mínimos y logs detallados ---
      let scanner: QrScanner | null = null;
      let started = false;
      let lastError: any = null;
      try {
        // Log antes de iniciar
        logStreamTracks(videoElement);
        logWithTimestamp('Intentando preferredCamera: environment');
        scanner = new QrScanner(
          videoElement,
          (result) => {
            logWithTimestamp('QR Code detected', { data: result.data });
            setScanSuccess(true);
            onScan(result.data);
            // Esperar 1s y cerrar modal
            setTimeout(() => {
              cleanup();
              onClose();
            }, 1000);
          },
          {
            returnDetailedScanResult: true,
            maxScansPerSecond: 10,
            preferredCamera: 'environment',
            highlightScanRegion: true,
            highlightCodeOutline: true,
            onDecodeError: (error) => {
              const errorMessage = typeof error === 'string' ? error : error.message || 'Unknown error';
              logWithTimestamp('Decode error', errorMessage);
            }
          }
        );
        await scanner.start();
        started = true;
        logWithTimestamp('QR Scanner started with environment camera');
      } catch (err) {
        lastError = err;
        logWithTimestamp('Fallo con environment, probando cámara frontal', err);
        // Fallback: probar cámara frontal
        try {
          scanner = new QrScanner(
            videoElement,
            (result) => {
              logWithTimestamp('QR Code detected (frontal)', { data: result.data });
              setScanSuccess(true);
              onScan(result.data);
              setTimeout(() => {
                cleanup();
                onClose();
              }, 1000);
            },
            {
              returnDetailedScanResult: true,
              maxScansPerSecond: 10,
              preferredCamera: 'user',
              highlightScanRegion: true,
              highlightCodeOutline: true,
              onDecodeError: (error) => {
                const errorMessage = typeof error === 'string' ? error : error.message || 'Unknown error';
                logWithTimestamp('Decode error (frontal)', errorMessage);
              }
            }
          );
          await scanner.start();
          started = true;
          logWithTimestamp('QR Scanner started with user (frontal) camera');
        } catch (err2) {
          lastError = err2;
          logWithTimestamp('Fallo también con cámara frontal', err2);
        }
      }
      if (!started) {
        setVideoError('No se pudo iniciar la cámara');
        logStreamTracks(videoElement);
        throw lastError || new Error('No se pudo iniciar la cámara');
      }
      setQrScanner(scanner);
      setState('ready');
      logStreamTracks(videoElement);
      logWithTimestamp('QR Scanner initialized successfully');

    } catch (error: any) {
      logWithTimestamp('Scanner initialization failed', error);
      
      let scannerError: ScannerError;
      
      if (error.message.includes('Permission denied') || error.name === 'NotAllowedError') {
        scannerError = {
          type: 'permission',
          message: 'Permisos de cámara denegados',
          details: 'Por favor, permite el acceso a la cámara y recarga la página'
        };
      } else if (error.message.includes('Camera not found') || error.name === 'NotFoundError') {
        scannerError = {
          type: 'camera',
          message: 'Cámara no encontrada',
          details: 'Asegúrate de que tu dispositivo tenga una cámara disponible'
        };
      } else if (error.message.includes('Video element not found') || error.message.includes('timeout')) {
        scannerError = {
          type: 'timeout',
          message: 'Error de inicialización',
          details: 'No se pudo inicializar la cámara. Intenta de nuevo.'
        };
      } else {
        scannerError = {
          type: 'unknown',
          message: 'Error desconocido',
          details: error.message || 'Ha ocurrido un error inesperado'
        };
      }

      setError(scannerError);
      setState('error');
    }
  }, [logWithTimestamp, waitForVideoElement, detectDeviceCapabilities, onScan]);

  // Función de limpieza
  const cleanup = useCallback(() => {
    logWithTimestamp('Cleaning up scanner');
    const videoElement = document.getElementById('qr-video') as HTMLVideoElement | null;
    if (videoElement) {
      if (videoElement.srcObject instanceof MediaStream) {
        const stream = videoElement.srcObject as MediaStream;
        logWithTimestamp('CLEANUP: Stream active=' + stream.active + ', tracks=' + stream.getTracks().length);
        stream.getTracks().forEach((track, idx) => {
          logWithTimestamp(`CLEANUP Track[${idx}]: kind=${track.kind}, readyState=${track.readyState}, enabled=${track.enabled}`);
        });
      } else {
        logWithTimestamp('CLEANUP: No MediaStream en videoElement');
      }
    }
    // Idempotente: solo limpiar si existe
    if (qrScanner) {
      try {
        qrScanner.stop();
        qrScanner.destroy();
      } catch (e) {
        logWithTimestamp('Error during cleanup', e);
      }
      setQrScanner(null);
    }
    setState('initializing');
    setError(null);
  }, [qrScanner, logWithTimestamp]);

  // Función para reintentar
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    cleanup();
    await new Promise(resolve => setTimeout(resolve, 500)); // Pequeña pausa
    await initializeScanner();
    setIsRetrying(false);
  }, [cleanup, initializeScanner]);

  // Effect para inicializar cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      logWithTimestamp('Modal opened, initializing scanner');
      // Pequeño delay para asegurar que el DOM esté renderizado
      const timer = setTimeout(() => {
        initializeScanner();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      cleanup();
    }
  }, [isOpen, initializeScanner, cleanup, logWithTimestamp]);

  // Effect de limpieza al desmontar
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Función para cerrar
  const handleClose = useCallback(() => {
    cleanup();
    onClose();
  }, [cleanup, onClose]);

  // Renderizar el contenido según el estado
  const renderContent = () => {
    // Overlay de éxito si scanSuccess está activo
    if (scanSuccess) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
          <div className="text-green-500 text-6xl mb-4">✅</div>
          <h3 className="text-2xl font-bold text-green-700 mb-2">¡Asistencia registrada!</h3>
          <p className="text-gray-700 text-center mb-6">Tu asistencia se ha registrado correctamente.</p>
        </div>
      );
    }
    if (state === 'error' && (error || videoError)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-red-600 mb-2">
            {error?.message || 'Error de cámara'}
          </h3>
          <p className="text-gray-600 text-center mb-6">
            {error?.details || videoError}
          </p>
          <motion.button
            onClick={handleRetry}
            disabled={isRetrying}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium disabled:bg-gray-400 flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isRetrying ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                <span>Reintentando...</span>
              </>
            ) : (
              <span>Reintentar</span>
            )}
          </motion.button>
        </div>
      );
    }

    return (
      <div className="relative">
        {/* Video Element */}
        <video
          id="qr-video"
          className="w-full h-[400px] object-cover rounded-lg bg-black"
          playsInline
          muted
        />
        {videoError && (
          <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center rounded-lg z-10">
            <div className="text-red-500 text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <div className="text-lg font-semibold">{videoError}</div>
            </div>
          </div>
        )}

        {/* Estado de carga superpuesto */}
        {state !== 'ready' && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-lg font-medium">
                {state === 'initializing' && 'Inicializando...'}
                {state === 'requesting-permissions' && 'Solicitando permisos...'}
                {state === 'starting' && 'Iniciando cámara...'}
              </p>
              <p className="text-sm text-gray-300 mt-2">
                {state === 'requesting-permissions' && 'Permite el acceso a la cámara'}
                {state === 'starting' && 'Preparando el escáner...'}
              </p>
            </div>
          </div>
        )}

        {/* Instrucciones cuando está listo */}
        {state === 'ready' && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-black bg-opacity-70 text-white p-3 rounded-lg text-center">
              <p className="text-sm">
                📱 Apunta la cámara hacia el código QR
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          data-qr-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleClose();
            }
          }}
        >
          <motion.div
            className="bg-white rounded-lg shadow-xl w-full max-w-md"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Escanear Código QR
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {renderContent()}
            </div>

            {/* Footer con información adicional */}
            <div className="p-4 border-t bg-gray-50 rounded-b-lg">
              <p className="text-xs text-gray-500 text-center">
                📋 El código QR se escaneará automáticamente al detectarlo
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QRScannerMobile;