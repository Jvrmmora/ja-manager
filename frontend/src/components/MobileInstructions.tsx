import React from 'react';
import { motion } from 'framer-motion';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import { useTheme } from '../context/ThemeContext';

interface MobileInstructionsProps {
  onContinue: () => void;
  onCancel: () => void;
}

const MobileInstructions: React.FC<MobileInstructionsProps> = ({
  onContinue,
  onCancel
}) => {
  const deviceInfo = useDeviceDetection();
  const { isDark } = useTheme();

  const getInstructions = () => {
    if (deviceInfo.isIOS && deviceInfo.isSafari) {
      return {
        title: '📱 Instrucciones para Safari iOS',
        steps: [
          'Cuando aparezca la ventana de permisos, toca "Permitir"',
          'Si no aparece, verifica en Configuración > Safari > Cámara',
          'Asegúrate de que el sitio tenga permisos de cámara',
          'Mantén el código QR centrado en la pantalla'
        ]
      };
    }

    if (deviceInfo.isIOS && deviceInfo.isChrome) {
      return {
        title: '📱 Instrucciones para Chrome iOS',
        steps: [
          'Toca "Permitir" cuando se soliciten permisos de cámara',
          'Si no funciona, prueba refrescando la página',
          'Verifica que Chrome tenga permisos de cámara en iOS',
          'Apunta la cámara directamente al código QR'
        ]
      };
    }

    if (deviceInfo.isAndroid && deviceInfo.isChrome) {
      return {
        title: '📱 Instrucciones para Android Chrome',
        steps: [
          'Toca "Permitir" en la ventana de permisos',
          'Si se bloquea, toca el ícono de cámara en la barra de direcciones',
          'Asegúrate de tener buena iluminación',
          'Mantén el teléfono estable al escanear'
        ]
      };
    }

    return {
      title: '📱 Instrucciones Generales',
      steps: [
        'Tu navegador solicitará permisos de cámara',
        'Toca "Permitir" o "Aceptar" cuando aparezca',
        'Apunta la cámara al código QR',
        'Mantén el código centrado en el marco'
      ]
    };
  };

  const instructions = getInstructions();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 max-w-md mx-auto"
    >
      <div className="text-center mb-6">
        <h3 className={`text-lg font-semibold mb-2 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          {instructions.title}
        </h3>
        <p className={`text-sm ${
          isDark ? 'text-gray-300' : 'text-gray-600'
        }`}>
          Antes de continuar, revisa estas instrucciones:
        </p>
      </div>

      <div className="space-y-3 mb-8">
        {instructions.steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-start gap-3 p-3 rounded-lg ${
              isDark ? 'bg-gray-700/50' : 'bg-gray-50'
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
            }`}>
              {index + 1}
            </div>
            <p className={`text-sm ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {step}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="space-y-3">
        <button
          onClick={onContinue}
          className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
        >
          Entendido, Continuar
        </button>
        <button
          onClick={onCancel}
          className={`w-full px-4 py-3 rounded-lg transition-colors font-medium ${
            isDark 
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Cancelar
        </button>
      </div>

      {/* Nota adicional para móviles */}
      {deviceInfo.isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className={`mt-4 p-3 rounded-lg text-xs text-center ${
            isDark ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-50 text-yellow-700'
          }`}
        >
          💡 <strong>Consejo:</strong> Si tienes problemas, intenta rotar tu dispositivo o usar mejor iluminación
        </motion.div>
      )}
    </motion.div>
  );
};

export default MobileInstructions;