import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface LightningBonusProps {
  bonusPoints: number;
  decayPercent: number; // 0-100
  maxBonus?: number; // Bonus máximo inicial
  bonusDecayMinutes?: number; // Duración del bonus en minutos
  qrGeneratedAt?: string | Date; // Fecha de generación del QR
}

export const LightningBonus: React.FC<LightningBonusProps> = ({
  bonusPoints: initialBonusPoints,
  decayPercent: initialDecayPercent,
  maxBonus = 50,
  bonusDecayMinutes = 10,
  qrGeneratedAt,
}) => {
  // Estados para actualización en tiempo real
  const [currentBonus, setCurrentBonus] = useState(initialBonusPoints);
  const [currentDecayPercent, setCurrentDecayPercent] =
    useState(initialDecayPercent);

  useEffect(() => {
    // Si no hay qrGeneratedAt, usar los valores iniciales
    if (!qrGeneratedAt) {
      setCurrentBonus(initialBonusPoints);
      setCurrentDecayPercent(initialDecayPercent);
      return;
    }

    // Calcular bonus en tiempo real
    const updateBonus = () => {
      const now = new Date().getTime();
      const generatedTime = new Date(qrGeneratedAt).getTime();
      const elapsedMs = now - generatedTime;
      const decayDurationMs = bonusDecayMinutes * 60 * 1000;

      if (elapsedMs >= decayDurationMs) {
        // Bonus expirado
        setCurrentBonus(0);
        setCurrentDecayPercent(0);
        return;
      }

      // Calcular porcentaje restante (100% al inicio, 0% al final)
      const remainingPercent = Math.max(
        0,
        Math.min(100, ((decayDurationMs - elapsedMs) / decayDurationMs) * 100)
      );

      // Calcular bonus actual de forma lineal
      const calculatedBonus = Math.max(
        0,
        Math.floor((remainingPercent / 100) * maxBonus)
      );

      setCurrentBonus(calculatedBonus);
      setCurrentDecayPercent(remainingPercent);
    };

    // Actualizar inmediatamente
    updateBonus();

    // Actualizar cada segundo
    const interval = setInterval(updateBonus, 1000);

    return () => clearInterval(interval);
  }, [
    qrGeneratedAt,
    maxBonus,
    bonusDecayMinutes,
    initialBonusPoints,
    initialDecayPercent,
  ]);

  // No mostrar si el bonus es menor a 1 punto
  if (currentBonus < 1) {
    return null;
  }

  // Calcular opacidad y escala basado en el porcentaje de decaimiento
  const opacity = Math.max(0.3, currentDecayPercent / 100); // Mínimo 30% de opacidad
  const scale = 0.6 + (currentDecayPercent / 100) * 0.6; // De 0.6 a 1.2

  return (
    <motion.div
      className="flex items-center gap-1"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{
        opacity,
        scale,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }}
    >
      {/* Contenedor del ícono con glow pulsante */}
      <motion.div
        className="relative"
        animate={{
          filter: [
            `drop-shadow(0 0 ${4 * opacity}px rgba(251, 191, 36, ${opacity}))`,
            `drop-shadow(0 0 ${8 * opacity}px rgba(251, 191, 36, ${opacity * 0.8}))`,
            `drop-shadow(0 0 ${4 * opacity}px rgba(251, 191, 36, ${opacity}))`,
          ],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <span
          className="material-symbols-rounded text-2xl bg-gradient-to-br from-yellow-400 via-orange-500 to-orange-600 bg-clip-text text-transparent font-bold"
          style={{
            fontVariationSettings: '"FILL" 1, "wght" 700, "GRAD" 0, "opsz" 48',
          }}
        >
          bolt
        </span>
      </motion.div>

      {/* Texto del bonus */}
      <motion.span
        className="text-sm font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"
        animate={{
          opacity,
        }}
      >
        +{currentBonus}
      </motion.span>
    </motion.div>
  );
};
