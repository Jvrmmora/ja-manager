import React from 'react';
import { motion } from 'framer-motion';
import { QrCodeIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface AnimatedScanButtonProps {
  onClick: () => void;
  isScanning?: boolean;
  disabled?: boolean;
  isCompleted?: boolean; // Nuevo prop para estado completado
  className?: string;
}

const AnimatedScanButton: React.FC<AnimatedScanButtonProps> = ({
  onClick,
  isScanning = false,
  disabled = false,
  isCompleted = false, // Nuevo prop
  className = ""
}) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || isScanning || isCompleted}
      className={`
        relative w-full py-4 px-6 rounded-xl font-semibold text-white
        ${isCompleted 
          ? 'bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 hover:from-emerald-600 hover:via-green-600 hover:to-teal-700 cursor-default' 
          : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 cursor-pointer'
        }
        disabled:from-gray-400 disabled:to-gray-500
        shadow-lg hover:shadow-xl
        transition-all duration-300
        flex items-center justify-center gap-3
        overflow-hidden
        ${className}
      `}
      whileHover={!disabled && !isScanning && !isCompleted ? { scale: 1.02 } : {}}
      whileTap={!disabled && !isScanning && !isCompleted ? { scale: 0.98 } : {}}
      animate={
        isCompleted ? {
          scale: [1, 1.02, 1],
          boxShadow: [
            "0 4px 15px rgba(16, 185, 129, 0.3)",
            "0 4px 25px rgba(5, 150, 105, 0.4)",
            "0 4px 15px rgba(16, 185, 129, 0.3)"
          ]
        } : !disabled && !isScanning ? {
          boxShadow: [
            "0 4px 15px rgba(59, 130, 246, 0.4)",
            "0 4px 25px rgba(59, 130, 246, 0.6)",
            "0 4px 15px rgba(59, 130, 246, 0.4)"
          ]
        } : {}
      }
      transition={
        isCompleted ? {
          scale: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          },
          boxShadow: {
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut"
          }
        } : {
          boxShadow: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }
      }
    >
      {/* Efecto de fondo animado */}
      {!isCompleted ? (
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
      ) : (
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/15 rounded-xl" />
      )}

      {/* Icono QR o Check */}
      <motion.div
        animate={
          isCompleted ? {
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          } : isScanning ? {
            rotate: 360
          } : !disabled ? {
            scale: [1, 1.1, 1]
          } : {}
        }
        transition={
          isCompleted ? {
            scale: {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            },
            rotate: {
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }
          } : isScanning ? {
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          } : {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }
      >
        {isCompleted ? (
          <CheckCircleIcon className="w-6 h-6" />
        ) : (
          <QrCodeIcon className="w-6 h-6" />
        )}
      </motion.div>

      {/* Texto */}
      <span className="relative z-10 text-base">
        {isScanning ? 'Escaneando...' : isCompleted ? 'Asistencia Registrada Hoy' : 'Registrar Asistencia'}
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
          className={`absolute inset-0 rounded-xl border-2 ${isCompleted 
            ? 'border-teal-300/50' 
            : 'border-blue-300'
          }`}
          animate={
            isCompleted ? {
              scale: [1, 1.03, 1],
              opacity: [0.4, 0.8, 0.4]
            } : {
              scale: [1, 1.05, 1],
              opacity: [0.7, 0.3, 0.7]
            }
          }
          transition={
            isCompleted ? {
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut"
            } : {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }
        />
      )}

      {/* Indicador adicional de éxito */}
      {isCompleted && (
        <motion.div
          className="absolute top-2 right-2"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: [0, 1.2, 1],
            opacity: [0, 1, 0.8],
            rotate: [0, 360]
          }}
          transition={{
            scale: { duration: 0.5, ease: "backOut" },
            opacity: { duration: 0.5 },
            rotate: { duration: 0.6, ease: "easeOut" }
          }}
        >
          <div className="w-3 h-3 bg-teal-300 rounded-full shadow-lg"></div>
        </motion.div>
      )}
    </motion.button>
  );
};

export default AnimatedScanButton;