import React from 'react';
import { motion } from 'framer-motion';
import { QrCodeIcon } from '@heroicons/react/24/outline';

interface AnimatedScanButtonProps {
  onClick: () => void;
  isScanning?: boolean;
  disabled?: boolean;
  className?: string;
}

const AnimatedScanButton: React.FC<AnimatedScanButtonProps> = ({
  onClick,
  isScanning = false,
  disabled = false,
  className = ""
}) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || isScanning}
      className={`
        relative w-full py-4 px-6 rounded-xl font-semibold text-white
        bg-gradient-to-r from-blue-500 to-blue-600
        hover:from-blue-600 hover:to-blue-700
        disabled:from-gray-400 disabled:to-gray-500
        shadow-lg hover:shadow-xl
        transition-all duration-200
        flex items-center justify-center gap-3
        overflow-hidden
        ${className}
      `}
      whileHover={!disabled && !isScanning ? { scale: 1.02 } : {}}
      whileTap={!disabled && !isScanning ? { scale: 0.98 } : {}}
      animate={!disabled && !isScanning ? {
        boxShadow: [
          "0 4px 15px rgba(59, 130, 246, 0.4)",
          "0 4px 25px rgba(59, 130, 246, 0.6)",
          "0 4px 15px rgba(59, 130, 246, 0.4)"
        ]
      } : {}}
      transition={{
        boxShadow: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }}
    >
      {/* Efecto de fondo animado */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-blue-600/20"
        animate={!disabled && !isScanning ? {
          x: ["-100%", "100%"]
        } : {}}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* Icono QR */}
      <motion.div
        animate={isScanning ? {
          rotate: 360
        } : !disabled ? {
          scale: [1, 1.1, 1]
        } : {}}
        transition={isScanning ? {
          duration: 1,
          repeat: Infinity,
          ease: "linear"
        } : {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <QrCodeIcon className="w-6 h-6" />
      </motion.div>

      {/* Texto */}
      <span className="relative z-10">
        {isScanning ? 'Escaneando...' : 'Registrar Asistencia'}
      </span>

      {/* Puntos de carga cuando está escaneando */}
      {isScanning && (
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-white rounded-full"
              animate={{
                scale: [0.5, 1, 0.5],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </div>
      )}

      {/* Efecto de pulso cuando no está disabled */}
      {!disabled && !isScanning && (
        <motion.div
          className="absolute inset-0 rounded-xl border-2 border-blue-300"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.7, 0.3, 0.7]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </motion.button>
  );
};

export default AnimatedScanButton;