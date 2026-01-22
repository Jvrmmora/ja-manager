import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface PointsAnimationProps {
  points: number;
  basePoints?: number;
  speedBonus?: number;
  type?: 'attendance' | 'activity' | 'referrer' | 'referred';
  onComplete?: () => void;
  duration?: number; // duración en ms
}

const PointsAnimation: React.FC<PointsAnimationProps> = ({
  points,
  basePoints,
  speedBonus,
  onComplete,
  duration = 4500,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Si hay bonus, mostrar desglose; si no, usar puntos totales
  const hasBonus = speedBonus !== undefined && speedBonus > 0;
  const displayBasePoints = basePoints ?? points;

  useEffect(() => {
    // Mostrar animación después de un pequeño delay
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    // Iniciar fade out antes de completar
    const fadeOutTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, duration - 500);

    // Completar animación
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`
        fixed inset-0 z-[70] flex items-center justify-center pointer-events-none
        transition-opacity duration-500
        ${isFadingOut ? 'opacity-0' : 'opacity-100'}
      `}
    >
      <div
        className={`
          flex flex-col items-center justify-center gap-4
          bg-gradient-to-br from-gray-800 via-gray-900 to-black
          text-white px-8 py-6 rounded-2xl
          shadow-2xl transform border-4 border-amber-500/80
          ${isVisible && !isFadingOut ? 'animate-slideUpPulse' : ''}
          relative overflow-hidden
        `}
        style={{
          backdropFilter: 'blur(10px)',
          boxShadow:
            '0 0 40px rgba(251, 191, 36, 0.4), 0 10px 50px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Efecto de brillo en el borde */}
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            border: '2px solid transparent',
            backgroundImage:
              'linear-gradient(45deg, rgba(251, 191, 36, 0.5), rgba(245, 158, 11, 0.5), rgba(251, 191, 36, 0.5))',
            backgroundClip: 'padding-box',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
          }}
          animate={{
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Título superior */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-amber-400 text-sm font-bold uppercase tracking-widest"
        >
          PUNTOS GANADOS
        </motion.div>

        {/* Primera línea: Puntos base con estrella */}
        <div className="flex items-center justify-center gap-3 bg-gray-700/40 px-6 py-3 rounded-xl backdrop-blur-sm border border-gray-600/50 w-full">
          {/* Icono de estrella con animación */}
          <motion.span
            className="material-symbols-rounded text-3xl font-bold text-amber-400"
            animate={{
              scale: [1, 1.15, 1],
              rotate: [0, 8, -8, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              fontVariationSettings:
                '"FILL" 1, "wght" 700, "GRAD" 0, "opsz" 48',
              filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.8))',
            }}
          >
            star
          </motion.span>

          <div className="text-left flex-1">
            <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
              Asistencia:
            </p>
            <p className="text-2xl font-bold text-white">
              +{displayBasePoints} pts
            </p>
          </div>
        </div>

        {/* Segunda línea: Bonus por velocidad (solo si existe) */}
        {hasBonus && speedBonus && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="flex items-center justify-center gap-3 bg-gradient-to-r from-amber-600/30 via-orange-600/30 to-amber-600/30 px-6 py-3 rounded-xl backdrop-blur-sm border border-amber-500/60 shadow-lg w-full"
          >
            {/* Icono de rayo con animación */}
            <motion.span
              className="material-symbols-rounded text-3xl font-bold"
              animate={{
                scale: [1, 1.3, 1],
                rotate: [0, 5, -5, 0],
                filter: [
                  'drop-shadow(0 0 8px rgba(251, 191, 36, 0.8))',
                  'drop-shadow(0 0 16px rgba(251, 191, 36, 1))',
                  'drop-shadow(0 0 8px rgba(251, 191, 36, 0.8))',
                ],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                fontVariationSettings:
                  '"FILL" 1, "wght" 700, "GRAD" 0, "opsz" 48',
                background:
                  'linear-gradient(to bottom right, #fbbf24, #f59e0b, #f97316)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              bolt
            </motion.span>

            <div className="text-left flex-1">
              <p className="text-xs font-semibold text-amber-200 uppercase tracking-wide">
                Velocidad:
              </p>
              <p className="text-2xl font-bold text-white">+{speedBonus} pts</p>
            </div>
          </motion.div>
        )}

        {/* Línea divisoria */}
        <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent"></div>

        {/* Tercera línea: Total */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: hasBonus ? 0.4 : 0.2 }}
          className="flex items-center justify-center gap-3 w-full"
        >
          <span className="text-xl font-semibold text-gray-300 uppercase tracking-wider">
            Total:
          </span>
          <span className="text-5xl font-bold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
            {points} puntos
          </span>
        </motion.div>
      </div>

      {/* Estilos de animación */}
      <style>{`
        @keyframes slideUpPulse {
          0% {
            opacity: 0;
            transform: translateY(30px) scale(0.9);
          }
          20% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(1);
          }
          100% {
            transform: scale(1);
          }
        }

        .animate-slideUpPulse {
          animation: slideUpPulse 1.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default PointsAnimation;
