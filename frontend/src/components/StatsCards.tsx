import React, { useEffect, useState } from 'react';
import type { IYoung } from '../types';
import { pointsService } from '../services/pointsService';
import {
  getCurrentMonthColombia,
  getCurrentYearColombia,
} from '../utils/dateUtils';

interface StatsCardsProps {
  youngList: IYoung[];
}

const StatsCards: React.FC<StatsCardsProps> = ({ youngList }) => {
  // Calcular estadísticas
  const totalYoung = youngList.length;

  // Activos: participantes en el ranking de la temporada actual
  const [activeYoung, setActiveYoung] = useState<number>(totalYoung);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ranking = await pointsService.getLeaderboard({});
        if (mounted && Array.isArray(ranking)) {
          setActiveYoung(ranking.length);
        }
      } catch {
        // fallback silencioso
        if (mounted) setActiveYoung(totalYoung);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [totalYoung]);

  // Calcular cumpleaños de este mes usando zona horaria de Colombia
  const currentMonth = getCurrentMonthColombia();
  const currentYear = getCurrentYearColombia();

  // Calcular nuevos de este mes
  const newThisMonth = youngList.filter(young => {
    if (!young.createdAt) return false;

    const createdAt = new Date(young.createdAt);
    return (
      createdAt.getMonth() === currentMonth &&
      createdAt.getFullYear() === currentYear
    );
  }).length;

  const tile =
    'flex min-w-[118px] flex-shrink-0 flex-col gap-1.5 rounded-[18px] border px-4 py-3.5 text-left sm:min-w-0';

  // KPIs de la franja oscura del admin
  return (
    <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0">
      <div className={`${tile} border-white/10 bg-white/[0.06]`}>
        <span className="text-xs font-semibold text-white/60">Total jóvenes</span>
        <span className="font-display text-[32px] sm:text-[38px] font-bold leading-none text-white">
          {totalYoung}
        </span>
      </div>
      <div className={`${tile} border-white/10 bg-white/[0.06]`}>
        <span className="text-xs font-semibold text-white/60">Activos</span>
        <span className="font-display text-[32px] sm:text-[38px] font-bold leading-none text-emerald-400">
          {activeYoung}
        </span>
      </div>
      <div className={`${tile} border-white/10 bg-white/[0.06]`}>
        <span className="text-xs font-semibold text-white/60">Nuevos del mes</span>
        <span className="font-display text-[32px] sm:text-[38px] font-bold leading-none text-white">
          {newThisMonth}
        </span>
      </div>
    </div>
  );
};

export default StatsCards;
