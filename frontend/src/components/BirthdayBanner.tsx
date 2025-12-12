import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { formatBirthday } from '../utils/dateUtils';

interface BirthdayBannerProps {
  birthday?: Date | string | null;
  onEditProfile?: () => void;
  onOpenMonthBirthdays?: () => void; // Abrir modal simplificado para cumpleaños del mes
}

const BirthdayBanner: React.FC<BirthdayBannerProps> = ({
  birthday,
  onEditProfile,
  onOpenMonthBirthdays,
}) => {
  const [isBirthdayMonth, setIsBirthdayMonth] = useState(false);
  // Nombre del mes actual en español (capitalizado)
  const monthName = (() => {
    const raw = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(
      new Date()
    );
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  })();
  const confettiIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
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

  // Si no hay fecha de cumpleaños
  if (!birthday) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-4xl mx-auto mb-8"
      >
        <div className="relative bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600 rounded-xl p-5 shadow-md">
          <div className="flex items-center justify-between gap-3">
            {/* Información del cumpleaños no registrado */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="material-symbols-rounded text-gray-600 dark:text-gray-300 text-3xl sm:text-4xl flex-shrink-0">
                cake
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-base sm:text-lg font-bold text-gray-700 dark:text-gray-200">
                  Fecha de cumpleaños
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  No registrada
                </p>
              </div>
            </div>

            {/* Botones del lado derecho */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Botón de cumpleaños del mes */}
              {onOpenMonthBirthdays && (
                <motion.button
                  onClick={onOpenMonthBirthdays}
                  className="group relative"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Cumpleaños del mes"
                >
                  <div className="flex flex-col items-center gap-1 sm:flex-row sm:items-center sm:gap-2.5">
                    {/* Texto del mes - solo visible en desktop */}
                    <div className="hidden sm:flex flex-col items-end justify-center">
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-200 leading-tight whitespace-nowrap">
                        Cumpleaños
                      </p>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-200 leading-tight whitespace-nowrap">
                        mes {monthName}
                      </p>
                    </div>

                    {/* Botón circular con flecha */}
                    <div className="relative">
                      {/* Pulso de fondo */}
                      <motion.div
                        className="absolute inset-0 bg-white/30 dark:bg-gray-500/30 rounded-full"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />

                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-lg group-hover:bg-gray-50 dark:group-hover:bg-gray-700 transition-all duration-300 border-2 border-gray-400/40 dark:border-gray-500/40 group-hover:border-gray-500/60 dark:group-hover:border-gray-400/60">
                        <motion.span
                          className="material-symbols-rounded text-gray-700 dark:text-gray-200 text-2xl sm:text-3xl font-bold"
                          animate={{ x: [0, 3, 0] }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                        >
                          arrow_forward
                        </motion.span>
                      </div>
                    </div>

                    {/* Texto móvil */}
                    <p className="sm:hidden text-[10px] font-bold text-gray-700 dark:text-gray-200 leading-tight text-center whitespace-nowrap">
                      Cumple. {monthName}
                    </p>
                  </div>
                </motion.button>
              )}

              {/* Botón de editar perfil - más compacto en móvil */}
              {onEditProfile && (
                <button
                  onClick={onEditProfile}
                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm border border-gray-300 dark:border-gray-600"
                >
                  <span className="material-symbols-rounded text-lg">edit</span>
                  <span>Agregar Fecha</span>
                </button>
              )}
            </div>
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
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            {/* Lado izquierdo: Ícono + Info */}
            <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
              {/* Ícono animado si es el mes */}
              {isBirthdayMonth ? (
                <motion.span
                  className="material-symbols-rounded text-white text-3xl sm:text-4xl flex-shrink-0 mt-0.5"
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
                <span className="material-symbols-rounded text-white text-3xl sm:text-4xl flex-shrink-0 mt-0.5">
                  cake
                </span>
              )}

              {/* Información */}
              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                  Tu Cumpleaños
                </h3>
                <p className="text-xl sm:text-2xl font-bold text-white leading-tight">
                  {formatBirthday(birthday)}
                </p>
              </div>
            </div>

            {/* Lado derecho: Badge + Botón */}
            {onOpenMonthBirthdays && (
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {/* Badge "¡Tu mes!" arriba - solo cuando es su cumpleaños */}
                {isBirthdayMonth && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring', bounce: 0.5 }}
                    className="flex items-center gap-1.5 px-3 py-1 bg-white/25 backdrop-blur-sm rounded-full border border-white/30"
                  >
                    <span className="material-symbols-rounded text-white text-sm">
                      stars
                    </span>
                    <span className="text-xs font-bold text-white whitespace-nowrap">
                      ¡Tu mes!
                    </span>
                  </motion.div>
                )}

                {/* Botón de flecha */}
                <motion.button
                  onClick={onOpenMonthBirthdays}
                  className="group relative"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Ver cumpleaños del mes"
                >
                  <div className="relative">
                    {/* Pulso de fondo animado */}
                    <motion.div
                      className="absolute inset-0 bg-white/20 rounded-full"
                      animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />

                    {/* Botón circular */}
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:bg-white/50 transition-all duration-300 border-2 border-white/50 group-hover:border-white/70">
                      <motion.span
                        className="material-symbols-rounded text-white text-2xl sm:text-3xl font-bold"
                        animate={{ x: [0, 3, 0] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      >
                        arrow_forward
                      </motion.span>
                    </div>
                  </div>
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default BirthdayBanner;
