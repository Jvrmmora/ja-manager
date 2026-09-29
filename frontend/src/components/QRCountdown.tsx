import React, { useState, useEffect } from 'react';
import { getTimeUntilExpiration } from '../utils/dateUtils';

interface QRCountdownProps {
  expiresAt: string | Date;
  /** 'blocks': bloques grandes (proyector). 'inline': texto hh:mm:ss */
  variant?: 'blocks' | 'inline';
}

const pad = (value: number) => value.toString().padStart(2, '0');

export const useCountdown = (expiresAt: string | Date) => {
  const [timeLeft, setTimeLeft] = useState(() =>
    getTimeUntilExpiration(expiresAt)
  );
  useEffect(() => {
    setTimeLeft(getTimeUntilExpiration(expiresAt));
    const interval = setInterval(() => {
      setTimeLeft(getTimeUntilExpiration(expiresAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);
  return timeLeft;
};

export const QRCountdown: React.FC<QRCountdownProps> = ({
  expiresAt,
  variant = 'blocks',
}) => {
  const timeLeft = useCountdown(expiresAt);
  const hours = timeLeft.hours + timeLeft.days * 24;

  if (variant === 'inline') {
    return (
      <span className="font-mono">
        {timeLeft.isExpired
          ? 'Expirado'
          : `${pad(hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`}
      </span>
    );
  }

  if (timeLeft.isExpired) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3">
        <span className="font-display text-xl font-semibold uppercase text-red-300">
          QR expirado
        </span>
      </div>
    );
  }

  const blocks: Array<[string, string, boolean]> = [
    [pad(hours), 'horas', false],
    [pad(timeLeft.minutes), 'min', false],
    [pad(timeLeft.seconds), 'seg', true],
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {blocks.map(([value, label, accent]) => (
        <div
          key={label}
          className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.06] py-3"
        >
          <span
            className={`font-mono text-[34px] font-semibold leading-none ${
              accent ? 'text-brand-amber' : 'text-white'
            }`}
          >
            {value}
          </span>
          <span className="mt-1 text-[11px] text-white/50">{label}</span>
        </div>
      ))}
    </div>
  );
};
