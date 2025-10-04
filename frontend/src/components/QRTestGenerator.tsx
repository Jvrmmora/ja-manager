import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../context/ThemeContext';

interface QRTestGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
}

const QRTestGenerator: React.FC<QRTestGeneratorProps> = ({ isOpen, onClose }) => {
  const [qrData, setQrData] = useState('');
  const [qrSize, setQrSize] = useState(256);
  const { isDark } = useTheme();

  // Generar QR de prueba
  const generateTestQR = (type: string) => {
    const baseUrl = window.location.origin;
    let code = '';
    
    switch (type) {
      case 'valid':
        code = `TEST-${Date.now()}`;
        break;
      case 'url':
        code = `${baseUrl}/attendance/scan?code=TEST-${Date.now()}`;
        break;
      case 'invalid':
        code = 'INVALID-CODE';
        break;
      default:
        code = 'TEST-DEFAULT';
    }
    
    setQrData(code);
  };

  // Copiar al portapapeles
  const copyToClipboard = () => {
    navigator.clipboard.writeText(qrData);
  };

  // URL del QR
  const qrUrl = qrData ? `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(qrData)}` : '';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`relative w-full max-w-md mx-auto ${
          isDark ? 'bg-gray-800' : 'bg-white'
        } rounded-2xl overflow-hidden shadow-2xl`}
      >
        <div className={`p-4 border-b ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h3 className={`text-lg font-semibold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Generador de QR de Prueba
          </h3>
        </div>

        <div className="p-6 space-y-6">
          {/* Botones de generación */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Tipo de QR:
            </label>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => generateTestQR('valid')}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
              >
                Código Válido
              </button>
              <button
                onClick={() => generateTestQR('url')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                URL Completa
              </button>
              <button
                onClick={() => generateTestQR('invalid')}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
              >
                Código Inválido
              </button>
            </div>
          </div>

          {/* Tamaño del QR */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Tamaño: {qrSize}px
            </label>
            <input
              type="range"
              min="128"
              max="512"
              step="32"
              value={qrSize}
              onChange={(e) => setQrSize(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Datos del QR */}
          {qrData && (
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Datos del QR:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={qrData}
                  onChange={(e) => setQrData(e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-lg text-sm ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <button
                  onClick={copyToClipboard}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* QR generado */}
          {qrUrl && (
            <div className="text-center space-y-3">
              <div className={`p-4 rounded-lg ${
                isDark ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <img
                  src={qrUrl}
                  alt="QR Code"
                  className="mx-auto rounded-lg shadow-lg"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </div>
              <p className={`text-xs ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Usa este QR para probar el escáner
              </p>
            </div>
          )}

          {/* Instrucciones */}
          <div className={`p-3 rounded-lg text-xs ${
            isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'
          }`}>
            <p className="font-medium mb-1">💡 Cómo usar:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Genera un QR de prueba</li>
              <li>Abre el escáner desde el dashboard</li>
              <li>Apunta la cámara al QR en pantalla</li>
              <li>Verifica que se procese correctamente</li>
            </ol>
          </div>

          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className={`w-full px-4 py-3 rounded-lg transition-colors font-medium ${
              isDark 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default QRTestGenerator;