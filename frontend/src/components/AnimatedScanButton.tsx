import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { getCurrentQR } from '../services/api';

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
  const [bonusInfo, setBonusInfo] = useState<{
    currentBonus: number;
    maxBonus: number;
    decayPercent: number;
    qrGeneratedAt?: string | Date;
    bonusDecayMinutes?: number;
  } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Función para obtener y calcular el bonus actual
  const fetchBonusInfo = async () => {
    try {
      const response = await getCurrentQR();
      if (
        response.data.qrCode.speedBonusEnabled &&
        !response.data.hasBonusExpired
      ) {
        const currentBonus = response.data.currentSpeedBonus;
        const maxBonus = Math.floor(response.data.qrCode.points * 0.5);
        const decayPercent = maxBonus > 0 ? (currentBonus / maxBonus) * 100 : 0;

        setBonusInfo({
          currentBonus,
          maxBonus,
          decayPercent,
          qrGeneratedAt: response.data.qrCode.generatedAt,
          bonusDecayMinutes: response.data.qrCode.bonusDecayMinutes || 30,
        });
      } else {
        setBonusInfo(null);
      }
    } catch (error) {
      // Si no hay QR activo o hay error, no mostrar bonus
      setBonusInfo(null);
    }
  };

  // Efecto para obtener bonus al montar y actualizar cada 5s
  useEffect(() => {
    // Solo ejecutar si no está completado y no está deshabilitado
    if (isCompleted || disabled) {
      setBonusInfo(null);
      return;
    }

    // Fetch inicial
    fetchBonusInfo();

    // Configurar interval de 5s para mantener datos frescos
    intervalRef.current = setInterval(fetchBonusInfo, 5000);

    // Pausar cuando la pestaña está en background (Page Visibility API)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pausar
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        // Reanudar
        fetchBonusInfo();
        intervalRef.current = setInterval(fetchBonusInfo, 5000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isCompleted, disabled]);

  const liveBonus = useLiveBonus(bonusInfo);
  const showBonus = !!liveBonus && liveBonus.points >= 1 && !isScanning;

  if (isCompleted) {
    return (
      <div
        className={`relative flex min-h-[220px] flex-col justify-center gap-4 rounded-[32px] border border-emerald-400/35 bg-ink-900 p-7 sm:p-9 text-left text-white ${className}`}
        role="status"
      >
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 motion-safe:animate-[glow-green_2.2s_ease-out_infinite]">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <span className="font-display text-3xl sm:text-4xl font-semibold uppercase leading-none">
          Asistencia Registrada Hoy
        </span>
        <span className="text-[15px] text-white/65">
          ¡Nos vemos el próximo sábado!
        </span>
      </div>
    );
  }

  if (isScanning) {
    return (
      <div
        className={`relative flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-[32px] border border-white/10 bg-gradient-to-br from-[#7A2A1A] via-[#5E1A30] to-[#3A1028] p-7 text-white ${className}`}
        role="status"
        aria-live="polite"
      >
        <svg className="h-11 w-11 animate-spin text-brand-amber" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-6.22-8.56" />
        </svg>
        <span className="font-display text-3xl font-semibold uppercase">Escaneando...</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {!disabled && (
        <>
          <span className="pointer-events-none absolute inset-0 rounded-[32px] border-2 border-brand-amber/70 motion-safe:animate-pulse-ring" />
          <span className="pointer-events-none absolute inset-0 rounded-[32px] border-2 border-brand-red/60 motion-safe:animate-pulse-ring-delayed" />
        </>
      )}
      <motion.button
        onClick={onClick}
        disabled={disabled}
        whileHover={!disabled ? { y: -4, scale: 1.01 } : {}}
        whileTap={!disabled ? { scale: 0.98 } : {}}
        className="bg-fire-bright relative flex min-h-[260px] sm:min-h-[300px] w-full flex-col justify-between gap-6 overflow-hidden rounded-[32px] p-6 sm:p-9 text-left text-white shadow-[0_30px_70px_-24px_rgba(242,106,46,0.6)] transition-shadow duration-300 hover:shadow-[0_40px_80px_-24px_rgba(242,106,46,0.75)] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-amber/60 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="pointer-events-none absolute -inset-y-[20%] left-0 w-28 bg-gradient-to-r from-white/0 via-white/25 to-white/0 motion-safe:animate-sheen" />

        <span className="relative flex items-center justify-between gap-3">
          <span className="font-display text-xs sm:text-sm uppercase tracking-[0.24em] text-white/85">
            Asistencia de hoy
          </span>
          {showBonus && (
            <span className="flex h-9 items-center gap-1.5 rounded-full border border-white/25 bg-ink-950/35 px-3.5 text-sm font-bold">
              <svg className="h-4 w-4 text-[#FCD34D] motion-safe:animate-pulse" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              +{liveBonus.points} pts
            </span>
          )}
        </span>

        <span className="relative flex items-center gap-4 sm:gap-6">
          <span className="flex h-20 w-20 sm:h-[104px] sm:w-[104px] flex-shrink-0 items-center justify-center rounded-[22px] sm:rounded-[28px] bg-white text-[#B3243B] shadow-[0_16px_32px_-12px_rgba(20,11,16,0.5)]">
            <svg className="h-11 w-11 sm:h-14 sm:w-14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="5" height="5" rx="1" />
              <rect x="16" y="3" width="5" height="5" rx="1" />
              <rect x="3" y="16" width="5" height="5" rx="1" />
              <path d="M21 16h-3a2 2 0 0 0-2 2v3M21 21v.01M12 7v3a2 2 0 0 1-2 2H7M3 12h.01M12 3h.01M12 16v.01M16 12h1M21 12v.01M12 21v-1" />
            </svg>
          </span>
          <span className="flex flex-col gap-1.5">
            <span className="font-display text-[34px] sm:text-5xl font-bold uppercase leading-[0.95]">
              Registrar
              <br />
              Asistencia
            </span>
            <span className="text-sm sm:text-[15px] text-white/85">
              Escanea el código QR del culto joven
            </span>
          </span>
        </span>

        {showBonus ? (
          <span className="relative flex flex-col gap-2">
            <span className="flex justify-between text-xs sm:text-[13px] font-semibold text-white/90">
              <span>Bono de velocidad</span>
              <span>baja con cada minuto</span>
            </span>
            <span className="h-2 overflow-hidden rounded-full bg-ink-950/35">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-[#FDE68A] via-[#FCD34D] to-brand-amber transition-[width] duration-1000 ease-linear"
                style={{ width: `${Math.max(4, liveBonus.percent)}%` }}
              />
            </span>
          </span>
        ) : (
          <span className="relative text-[13px] font-medium text-white/75">
            Toca para abrir la cámara
          </span>
        )}
      </motion.button>
    </div>
  );
};

// Recalcula el bono cada segundo a partir de la hora de generación del QR.
function useLiveBonus(
  info: {
    currentBonus: number;
    maxBonus: number;
    decayPercent: number;
    qrGeneratedAt?: string | Date;
    bonusDecayMinutes?: number;
  } | null
) {
  const [live, setLive] = useState<{ points: number; percent: number } | null>(null);

  useEffect(() => {
    if (!info) {
      setLive(null);
      return;
    }
    if (!info.qrGeneratedAt) {
      setLive({ points: info.currentBonus, percent: info.decayPercent });
      return;
    }
    const generated = new Date(info.qrGeneratedAt).getTime();
    const duration = (info.bonusDecayMinutes ?? 30) * 60 * 1000;
    const update = () => {
      const remaining = Math.max(0, duration - (Date.now() - generated));
      const percent = (remaining / duration) * 100;
      setLive({ points: Math.floor((percent / 100) * info.maxBonus), percent });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [info]);

  return live;
}

export default AnimatedScanButton;
