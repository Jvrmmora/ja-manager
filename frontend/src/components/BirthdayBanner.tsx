import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

interface BirthdayBannerProps {
  birthday?: Date | string | null;
  onEditProfile?: () => void;
}

const BirthdayBanner: React.FC<BirthdayBannerProps> = ({
  birthday,
  onEditProfile,
}) => {
  const [isBirthdayMonth, setIsBirthdayMonth] = useState(false);
  const confettiIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!birthday) {
      setIsBirthdayMonth(false);
      return;
    }

    // Convertir birthday a Date si es string
    const birthdayDate =
      typeof birthday === 'string' ? new Date(birthday) : birthday;
    const currentDate = new Date();

    // Verificar si es el mes de cumpleaños
    const isMonth = birthdayDate.getMonth() === currentDate.getMonth();
    setIsBirthdayMonth(isMonth);

    // Si es el mes de cumpleaños, iniciar confeti
    if (isMonth) {
      startConfettiLoop();
    }

    return () => {
      stopConfettiLoop();
    };
  }, [birthday]);

  const startConfettiLoop = () => {
    // Lanzar confeti inmediatamente
    launchConfetti();

    // Luego cada 8 segundos
    confettiIntervalRef.current = setInterval(() => {
      launchConfetti();
    }, 8000);
  };

  const stopConfettiLoop = () => {
    if (confettiIntervalRef.current) {
      clearInterval(confettiIntervalRef.current);
      confettiIntervalRef.current = null;
    }
  };

  const launchConfetti = () => {
    if (!bannerRef.current) return;

    const rect = bannerRef.current.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    // Confeti sutil con partículas pequeñas
    confetti({
      particleCount: 40,
      spread: 70,
      origin: { x, y },
      colors: [
        '#FFB6C1',
        '#FFD700',
        '#FF69B4',
        '#FFA07A',
        '#87CEEB',
        '#DDA0DD',
      ],
      gravity: 0.6,
      scalar: 0.7,
      drift: 0,
      ticks: 200,
      startVelocity: 25,
      shapes: ['circle', 'square'],
      disableForReducedMotion: true,
    });
  };

  const formatBirthday = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
    };
    return d.toLocaleDateString('es-ES', options);
  };

  // Si no hay fecha de cumpleaños
  if (!birthday) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-4xl mx-auto mb-8"
      >
        <div className="relative bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-rounded text-gray-600 dark:text-gray-300 text-2xl">
                cake
              </span>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Fecha de cumpleaños
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  No registrada
                </p>
              </div>
            </div>
            {onEditProfile && (
              <button
                onClick={onEditProfile}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <span className="material-symbols-rounded text-lg">edit</span>
                <span className="hidden sm:inline">Agregar Fecha</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={bannerRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="max-w-4xl mx-auto mb-8 relative"
    >
      {/* Banner principal */}
      <div
        className={`relative overflow-hidden rounded-xl p-5 shadow-lg transition-all duration-300 ${
          isBirthdayMonth
            ? 'bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500 dark:from-pink-600 dark:via-rose-600 dark:to-pink-700'
            : 'bg-gradient-to-r from-purple-400 to-indigo-500 dark:from-purple-600 dark:to-indigo-700'
        }`}
      >
        {/* Efecto de brillo sutil */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-30"></div>

        {/* Contenido */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Ícono animado si es el mes */}
            {isBirthdayMonth ? (
              <motion.span
                className="material-symbols-rounded text-white text-4xl"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3,
                }}
              >
                celebration
              </motion.span>
            ) : (
              <span className="material-symbols-rounded text-white text-4xl">
                cake
              </span>
            )}

            {/* Información */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-white">Tu Cumpleaños</h3>
                {isBirthdayMonth && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/25 backdrop-blur-sm rounded-full text-xs font-semibold text-white"
                  >
                    <span className="material-symbols-rounded text-sm">
                      stars
                    </span>
                    ¡Es tu mes!
                  </motion.span>
                )}
              </div>
              <p className="text-2xl font-bold text-white">
                {formatBirthday(birthday)}
              </p>
            </div>
          </div>

          {/* Decoración con partículas sutiles (solo si es el mes) */}
          {isBirthdayMonth && (
            <div className="hidden md:flex items-center gap-2">
              <motion.span
                className="material-symbols-rounded text-white/60 text-xl"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0 }}
              >
                star
              </motion.span>
              <motion.span
                className="material-symbols-rounded text-white/60 text-xl"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
              >
                star
              </motion.span>
              <motion.span
                className="material-symbols-rounded text-white/60 text-xl"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
              >
                star
              </motion.span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default BirthdayBanner;
