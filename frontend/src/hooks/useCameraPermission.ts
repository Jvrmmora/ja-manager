import { useState, useEffect } from 'react';

interface CameraPermission {
  state: 'prompt' | 'granted' | 'denied';
  error: string | null;
  isSupported: boolean;
  hasCamera: boolean;
}

export const useCameraPermission = () => {
  const [permission, setPermission] = useState<CameraPermission>({
    state: 'prompt',
    error: null,
    isSupported: false,
    hasCamera: false
  });

  const checkSupport = async () => {
    try {
      // Verificar si el navegador soporta getUserMedia
      const isSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      
      if (!isSupported) {
        setPermission(prev => ({
          ...prev,
          isSupported: false,
          error: 'Tu navegador no soporta acceso a la cámara'
        }));
        return false;
      }

      // Verificar si hay dispositivos de cámara
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        const hasCamera = cameras.length > 0;

        setPermission(prev => ({
          ...prev,
          isSupported: true,
          hasCamera,
          error: hasCamera ? null : 'No se encontraron cámaras en el dispositivo'
        }));

        return hasCamera;
      } catch (enumError) {
        // Si no podemos enumerar dispositivos, asumir que hay cámara
        setPermission(prev => ({
          ...prev,
          isSupported: true,
          hasCamera: true,
          error: null
        }));
        return true;
      }
    } catch (error) {
      setPermission(prev => ({
        ...prev,
        isSupported: false,
        error: 'Error verificando soporte de cámara'
      }));
      return false;
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      setPermission(prev => ({ ...prev, error: null }));

      // Configuración optimizada para móviles
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // Preferir cámara trasera
          width: { ideal: 1280, min: 320 },
          height: { ideal: 720, min: 240 },
          frameRate: { ideal: 30, max: 30 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Cerrar el stream inmediatamente después de obtener permisos
      stream.getTracks().forEach(track => track.stop());
      
      setPermission(prev => ({
        ...prev,
        state: 'granted',
        error: null
      }));
      
      return true;
    } catch (error: any) {
      console.error('Error solicitando permisos de cámara:', error);
      
      let errorMessage = 'Error desconocido al acceder a la cámara';
      let state: 'denied' | 'prompt' = 'denied';
      
      switch (error.name) {
        case 'NotAllowedError':
          errorMessage = 'Permisos de cámara denegados. Por favor, permite el acceso a la cámara.';
          state = 'denied';
          break;
        case 'NotFoundError':
          errorMessage = 'No se encontró ninguna cámara en el dispositivo';
          state = 'denied';
          break;
        case 'NotSupportedError':
          errorMessage = 'Tu navegador no soporta acceso a la cámara';
          state = 'denied';
          break;
        case 'NotReadableError':
          errorMessage = 'La cámara está siendo usada por otra aplicación';
          state = 'prompt'; // Puede reintentar
          break;
        case 'OverconstrainedError':
          errorMessage = 'No se puede acceder a la cámara con la configuración solicitada';
          state = 'prompt';
          break;
        case 'SecurityError':
          errorMessage = 'Acceso a la cámara bloqueado por razones de seguridad';
          state = 'denied';
          break;
        default:
          errorMessage = error.message || errorMessage;
          state = 'prompt';
      }
      
      setPermission(prev => ({
        ...prev,
        state,
        error: errorMessage
      }));
      
      return false;
    }
  };

  const reset = () => {
    setPermission({
      state: 'prompt',
      error: null,
      isSupported: false,
      hasCamera: false
    });
  };

  // Verificar permisos existentes al montar el hook
  useEffect(() => {
    const checkExistingPermissions = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
          
          if (permissionStatus.state === 'granted') {
            setPermission(prev => ({ ...prev, state: 'granted' }));
          } else if (permissionStatus.state === 'denied') {
            setPermission(prev => ({ 
              ...prev, 
              state: 'denied',
              error: 'Permisos de cámara denegados previamente'
            }));
          }
        }
      } catch (error) {
        // Ignorar errores al verificar permisos existentes
        console.log('No se pueden verificar permisos existentes:', error);
      }
    };

    checkExistingPermissions();
  }, []);

  return {
    permission,
    checkSupport,
    requestPermission,
    reset
  };
};