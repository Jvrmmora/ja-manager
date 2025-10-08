import React, { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  altText: string;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, imageUrl, altText }) => {
  const { isDark } = useTheme();
  
  // Cerrar modal con tecla Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Evitar scroll del body cuando el modal está abierto
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-full">
        {/* Botón de cerrar */}
        <button
          onClick={onClose}
          className="absolute -top-10 -right-10 text-white hover:text-gray-300 transition-colors z-10"
          title="Cerrar (Esc)"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Imagen */}
        <div 
          className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg overflow-hidden shadow-2xl`}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={imageUrl}
            alt={altText}
            className="max-w-full max-h-[80vh] w-auto h-auto object-contain"
            onLoad={(e) => {
              // Centrar la imagen después de cargar
              const img = e.target as HTMLImageElement;
              const container = img.parentElement;
              if (container) {
                container.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
          />
          
          {/* Información de la imagen */}
          <div className={`p-4 border-t ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
            <p className={`text-sm text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {altText}
            </p>
            <p className={`text-xs text-center mt-1 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
              Haz clic fuera de la imagen o presiona ESC para cerrar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
