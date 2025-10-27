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
  className = '',
}) => {
  // Si está completado, mostrar un label en lugar de botón
  if (isCompleted) {
    return (
      <motion.div
        className={`
          relative w-full py-4 px-6 rounded-xl font-semibold
          bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-white
          shadow-2xl
          flex items-center justify-center gap-3
          overflow-hidden
          ${className}
        `}
        animate={{
          scale: [1, 1.03, 1],
          boxShadow: [
            '0 10px 40px rgba(16, 185, 129, 0.5)',
            '0 15px 50px rgba(5, 150, 105, 0.6)',
            '0 10px 40px rgba(16, 185, 129, 0.5)',
          ],
        }}
        transition={{
          scale: {
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
          },
          boxShadow: {
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        }}
      >
        {/* Fondo base con gradiente */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-500/20 rounded-xl" />

        {/* Efecto de brillo que recorre el botón */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-xl"
          animate={{
            x: ['-200%', '200%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
            repeatDelay: 1,
          }}
        />

        {/* Icono de Check con resplandor */}
        <motion.div
          className="relative"
          animate={{
            scale: [1, 1.15, 1],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            scale: {
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            },
            rotate: {
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          }}
        >
          {/* Resplandor detrás del ícono */}
          <motion.div
            className="absolute inset-0 bg-white/40 rounded-full blur-md"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <CheckCircleIcon className="w-7 h-7 relative z-10 drop-shadow-lg" />
        </motion.div>

        {/* Texto */}
        <span className="relative z-10 text-base font-bold tracking-wide">
          Asistencia Registrada Hoy
        </span>

        {/* Efecto de pulso del borde */}
        <motion.div
          className="absolute inset-0 rounded-xl border-2 border-emerald-300/70"
          animate={{
            scale: [1, 1.04, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Punto indicador blanco con pulso */}
        <motion.div
          className="absolute top-3 right-3"
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 1.3, 1],
            opacity: [0, 1, 0.9],
          }}
          transition={{
            scale: { duration: 0.6, ease: 'backOut' },
            opacity: { duration: 0.5 },
          }}
        >
          {/* Efecto de pulso alrededor del punto */}
          <motion.div
            className="absolute inset-0 bg-white/60 rounded-full"
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0.6, 0, 0.6],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
          {/* Punto blanco */}
          <div className="relative w-3 h-3 bg-white rounded-full shadow-xl border-2 border-emerald-200"></div>
        </motion.div>
      </motion.div>
    );
  }

  // Botón normal para estados no completados
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || isScanning}
      className={`
        relative w-full py-4 px-6 rounded-xl font-semibold
        bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 cursor-pointer shadow-lg
        disabled:from-gray-400 disabled:to-gray-500 disabled:text-gray-200
        hover:shadow-xl
        transition-all duration-300
        flex items-center justify-center gap-3
        overflow-hidden
        ${className}
      `}
      whileHover={!disabled && !isScanning ? { scale: 1.02 } : {}}
      whileTap={!disabled && !isScanning ? { scale: 0.98 } : {}}
      animate={
        !disabled && !isScanning
          ? {
              boxShadow: [
                '0 4px 15px rgba(59, 130, 246, 0.4)',
                '0 4px 25px rgba(59, 130, 246, 0.6)',
                '0 4px 15px rgba(59, 130, 246, 0.4)',
              ],
            }
          : {}
      }
      transition={{
        boxShadow: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      }}
    >
      {/* Efecto de fondo animado */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-blue-600/20"
        animate={
          !disabled && !isScanning
            ? {
                x: ['-100%', '100%'],
              }
            : {}
        }
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Icono QR o Scanning */}
      <motion.div
        animate={
          isScanning
            ? {
                rotate: 360,
              }
            : !disabled
              ? {
                  scale: [1, 1.1, 1],
                }
              : {}
        }
        transition={
          isScanning
            ? {
                duration: 1,
                repeat: Infinity,
                ease: 'linear',
              }
            : {
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }
        }
      >
        <QrCodeIcon className="w-6 h-6" />
      </motion.div>

      {/* Texto */}
      <span className="relative z-10 text-base">
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
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      )}

      {/* Efecto de pulso del borde */}
      {!disabled && !isScanning && (
        <motion.div
          className="absolute inset-0 rounded-xl border-2 border-blue-300"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.7, 0.3, 0.7],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </motion.button>
  );
};

export default AnimatedScanButton;
