import React, { useEffect, useState } from 'react';

interface PointsAnimationProps {
  points: number;
  type?: 'attendance' | 'activity' | 'referrer' | 'referred';
  onComplete?: () => void;
  duration?: number; // duración en ms
}

const PointsAnimation: React.FC<PointsAnimationProps> = ({
  points,
  onComplete,
  duration = 2500,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

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
        fixed inset-0 z-50 flex items-center justify-center pointer-events-none
        transition-opacity duration-500
        ${isFadingOut ? 'opacity-0' : 'opacity-100'}
      `}
    >
      <div
        className={`
          flex items-center justify-center gap-3
          bg-gradient-to-r from-green-400 to-emerald-500
          text-white px-8 py-5 rounded-full
          shadow-2xl transform
          ${isVisible && !isFadingOut ? 'animate-slideUpPulse' : ''}
        `}
      >
        {/* Icono de estrella - Material Design */}
        <span className="material-symbols-rounded text-4xl font-bold">
          star
        </span>

        {/* Texto de puntos */}
        <span className="text-3xl font-bold tracking-wide">
          +{points} punto{points !== 1 ? 's' : ''}
        </span>
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
