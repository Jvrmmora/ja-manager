import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useSeasonCountdown } from '../hooks/useSeasonCountdown';
import type { CountdownData } from '../hooks/useSeasonCountdown';
import type { ISeason } from '../types';

interface SeasonContextType {
  activeSeason: ISeason | null;
  countdown: CountdownData;
  progressPercent: number;
  setActiveSeason: (season: ISeason | null) => void;
  refreshSeason: () => void;
}

const SeasonContext = createContext<SeasonContextType | undefined>(undefined);

interface SeasonProviderProps {
  children: ReactNode;
}

export const SeasonProvider: React.FC<SeasonProviderProps> = ({ children }) => {
  const [activeSeason, setActiveSeason] = useState<ISeason | null>(null);
  const countdown = useSeasonCountdown(activeSeason?.endDate || null);

  // Calcular progreso de la temporada
  const progressPercent = React.useMemo(() => {
    if (!activeSeason) return 0;

    const start = new Date(activeSeason.startDate).getTime();
    const end = new Date(activeSeason.endDate).getTime();
    const now = Date.now();

    if (now < start) return 0;
    if (now > end) return 100;

    const total = end - start;
    const elapsed = now - start;

    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  }, [activeSeason]);

  const refreshSeason = useCallback(() => {
    // Forzar recálculo actualizando el objeto
    if (activeSeason) {
      setActiveSeason({ ...activeSeason });
    }
  }, [activeSeason]);

  return (
    <SeasonContext.Provider
      value={{
        activeSeason,
        countdown,
        progressPercent,
        setActiveSeason,
        refreshSeason,
      }}
    >
      {children}
    </SeasonContext.Provider>
  );
};

export const useSeason = (): SeasonContextType => {
  const context = useContext(SeasonContext);
  if (context === undefined) {
    throw new Error('useSeason must be used within a SeasonProvider');
  }
  return context;
};
