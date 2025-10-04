import { useState, useEffect } from 'react';

interface DeviceInfo {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  supportsCamera: boolean;
  orientation: 'portrait' | 'landscape';
}

export const useDeviceDetection = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isIOS: false,
    isAndroid: false,
    isSafari: false,
    isChrome: false,
    supportsCamera: false,
    orientation: 'portrait'
  });

  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const platform = navigator.platform?.toLowerCase() || '';
      
      // Detectar tipo de dispositivo
      const isMobile = /mobi|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
                      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
                      ('ontouchstart' in window) ||
                      (navigator.maxTouchPoints > 0);
      
      // Detectar sistema operativo
      const isIOS = /iphone|ipad|ipod/i.test(userAgent) || 
                   (platform.includes('mac') && navigator.maxTouchPoints > 0);
      const isAndroid = /android/i.test(userAgent);
      
      // Detectar navegador
      const isSafari = /safari/i.test(userAgent) && !/chrome|chromium|crios/i.test(userAgent);
      const isChrome = /chrome|chromium|crios/i.test(userAgent);
      
      // Detectar soporte de cámara
      const supportsCamera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      
      // Detectar orientación
      const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
      
      setDeviceInfo({
        isMobile,
        isIOS,
        isAndroid,
        isSafari,
        isChrome,
        supportsCamera,
        orientation
      });
    };

    // Detectar al cargar
    detectDevice();
    
    // Escuchar cambios de orientación
    const handleOrientationChange = () => {
      setTimeout(detectDevice, 100); // Pequeño delay para que la orientación se actualice
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  return deviceInfo;
};

// Utilidades adicionales para mejorar la experiencia móvil
export const getMobileOptimizedConfig = (deviceInfo: DeviceInfo) => {
  const baseConfig = {
    highlightScanRegion: true,
    highlightCodeOutline: true,
    preferredCamera: 'environment' as const,
    maxScansPerSecond: 5,
  };

  // Configuraciones específicas para iOS
  if (deviceInfo.isIOS) {
    return {
      ...baseConfig,
      maxScansPerSecond: 3, // Reducir para mejor rendimiento en iOS
    };
  }

  // Configuraciones específicas para Android
  if (deviceInfo.isAndroid) {
    return {
      ...baseConfig,
      maxScansPerSecond: 4,
    };
  }

  return baseConfig;
};

export const getVideoConstraints = (deviceInfo: DeviceInfo) => {
  const baseConstraints = {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280, min: 320 },
      height: { ideal: 720, min: 240 },
      frameRate: { ideal: 30, max: 30 }
    }
  };

  // Ajustes para iOS Safari
  if (deviceInfo.isIOS && deviceInfo.isSafari) {
    return {
      video: {
        ...baseConstraints.video,
        width: { ideal: 1024, min: 320 }, // Resolución más conservadora
        height: { ideal: 576, min: 240 },
        frameRate: { ideal: 24, max: 30 } // Frame rate más bajo
      }
    };
  }

  // Ajustes para dispositivos Android más antiguos
  if (deviceInfo.isAndroid) {
    return {
      video: {
        ...baseConstraints.video,
        frameRate: { ideal: 25, max: 30 }
      }
    };
  }

  return baseConstraints;
};