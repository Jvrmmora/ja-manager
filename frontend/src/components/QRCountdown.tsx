import React, { useState, useEffect } from 'react';
import { getTimeUntilExpiration } from '../utils/dateUtils';

interface QRCountdownProps {
  expiresAt: string | Date;
  isDark?: boolean;
}

export const QRCountdown: React.FC<QRCountdownProps> = ({
  expiresAt,
  isDark = true,
}) => {
  const [timeLeft, setTimeLeft] = useState(() =>
    getTimeUntilExpiration(expiresAt)
  );

  const formatTime = (value: number): string => {
    return value.toString().padStart(2, '0');
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeUntilExpiration(expiresAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (timeLeft.isExpired) {
    return (
      <div
        className={`flex items-center justify-center px-4 py-3 rounded-lg ${
          isDark
            ? 'bg-red-900/20 border border-red-700/50'
            : 'bg-red-50 border border-red-200'
        }`}
      >
        <span
          className={`text-xl font-bold ${isDark ? 'text-red-400' : 'text-red-500'}`}
        >
          QR Expirado
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1.5">
      {/* Días */}
      <div
        className={`flex flex-col items-center rounded-lg px-2.5 py-2 min-w-[55px] ${
          isDark
            ? 'bg-blue-900/20 border border-blue-700/50'
            : 'bg-blue-50 border border-blue-200'
        }`}
      >
        <div
          className={`text-2xl font-black font-mono leading-none ${
            isDark ? 'text-blue-400' : 'text-blue-600'
          }`}
        >
          {formatTime(timeLeft.days)}
        </div>
        <div
          className={`text-[10px] font-semibold mt-1 uppercase tracking-wider ${
            isDark ? 'text-blue-400/70' : 'text-blue-600/70'
          }`}
        >
          Días
        </div>
      </div>

      {/* Separador */}
      <div
        className={`text-xl font-bold self-center -mt-3 ${
          isDark ? 'text-gray-600' : 'text-gray-400'
        }`}
      >
        :
      </div>

      {/* Horas */}
      <div
        className={`flex flex-col items-center rounded-lg px-2.5 py-2 min-w-[55px] ${
          isDark
            ? 'bg-green-900/20 border border-green-700/50'
            : 'bg-green-50 border border-green-200'
        }`}
      >
        <div
          className={`text-2xl font-black font-mono leading-none ${
            isDark ? 'text-green-400' : 'text-green-600'
          }`}
        >
          {formatTime(timeLeft.hours)}
        </div>
        <div
          className={`text-[10px] font-semibold mt-1 uppercase tracking-wider ${
            isDark ? 'text-green-400/70' : 'text-green-600/70'
          }`}
        >
          Hrs
        </div>
      </div>

      {/* Separador */}
      <div
        className={`text-xl font-bold self-center -mt-3 ${
          isDark ? 'text-gray-600' : 'text-gray-400'
        }`}
      >
        :
      </div>

      {/* Minutos */}
      <div
        className={`flex flex-col items-center rounded-lg px-2.5 py-2 min-w-[55px] ${
          isDark
            ? 'bg-amber-900/20 border border-amber-700/50'
            : 'bg-amber-50 border border-amber-200'
        }`}
      >
        <div
          className={`text-2xl font-black font-mono leading-none ${
            isDark ? 'text-amber-400' : 'text-amber-600'
          }`}
        >
          {formatTime(timeLeft.minutes)}
        </div>
        <div
          className={`text-[10px] font-semibold mt-1 uppercase tracking-wider ${
            isDark ? 'text-amber-400/70' : 'text-amber-600/70'
          }`}
        >
          Min
        </div>
      </div>

      {/* Separador */}
      <div
        className={`text-xl font-bold self-center -mt-3 ${
          isDark ? 'text-gray-600' : 'text-gray-400'
        }`}
      >
        :
      </div>

      {/* Segundos */}
      <div
        className={`flex flex-col items-center rounded-lg px-2.5 py-2 min-w-[55px] ${
          isDark
            ? 'bg-purple-900/20 border border-purple-700/50'
            : 'bg-purple-50 border border-purple-200'
        }`}
      >
        <div
          className={`text-2xl font-black font-mono leading-none ${
            isDark ? 'text-purple-400' : 'text-purple-600'
          }`}
        >
          {formatTime(timeLeft.seconds)}
        </div>
        <div
          className={`text-[10px] font-semibold mt-1 uppercase tracking-wider ${
            isDark ? 'text-purple-400/70' : 'text-purple-600/70'
          }`}
        >
          Seg
        </div>
      </div>
    </div>
  );
};
