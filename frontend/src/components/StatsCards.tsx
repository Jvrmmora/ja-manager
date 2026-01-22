import React, { useEffect, useState } from 'react';
import type { IYoung } from '../types';
import { pointsService } from '../services/pointsService';
import {
  getCurrentMonthColombia,
  getCurrentYearColombia,
  parseYYYYMMDD,
} from '../utils/dateUtils';

interface StatsCardsProps {
  youngList: IYoung[];
  onBirthdayClick?: () => void;
  onBirthdayStatsClick?: () => void;
}

const StatsCards: React.FC<StatsCardsProps> = ({
  youngList,
  onBirthdayClick,
  onBirthdayStatsClick,
}) => {
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

  const birthdaysThisMonth = youngList.filter(young => {
    if (!young.birthday) return false;

    // Parsear fecha correctamente sin problemas de timezone
    const birthday =
      typeof young.birthday === 'string' &&
      /^\d{4}-\d{2}-\d{2}/.test(young.birthday)
        ? parseYYYYMMDD(young.birthday.split('T')[0])
        : new Date(young.birthday);

    return birthday.getMonth() === currentMonth;
  }).length;

  // Calcular nuevos de este mes
  const newThisMonth = youngList.filter(young => {
    if (!young.createdAt) return false;

    const createdAt = new Date(young.createdAt);
    return (
      createdAt.getMonth() === currentMonth &&
      createdAt.getFullYear() === currentYear
    );
  }).length;

  const monthName = new Date().toLocaleDateString('es-CO', { month: 'long' });

  const stats = [
    {
      title: 'Total Jóvenes',
      value: totalYoung,
      color: 'blue',
      bgColor: 'bg-white dark:bg-gray-800',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Activos',
      value: activeYoung,
      color: 'green',
      bgColor: 'bg-white dark:bg-gray-800',
      textColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Nuevos Este Mes',
      value: newThisMonth,
      color: 'purple',
      bgColor: 'bg-white dark:bg-gray-800',
      textColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      title: `Cumpleaños de ${monthName}`,
      value: birthdaysThisMonth,
      color: 'orange',
      bgColor: 'bg-orange-500',
      textColor: 'text-white',
      icon: '🎂',
      subtitle: 'Haz clic para ver detalles',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        if (stat.color === 'orange') {
          // Card especial con split button integrado
          return (
            <div
              key={index}
              className="rounded-xl shadow-lg bg-gradient-to-r from-purple-400 to-indigo-500 dark:from-purple-600 dark:to-indigo-700 overflow-hidden"
            >
              <div
                onClick={onBirthdayClick}
                className="cursor-pointer p-6 hover:bg-white/10 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-rounded text-white text-2xl">
                    cake
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white/90">
                      Ver Cumpleaños
                    </p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-3xl font-bold text-white">
                        {stat.value}
                      </p>
                      <span className="text-xs text-white/80">
                        en {monthName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Botón de estadísticas en la parte inferior */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  onBirthdayStatsClick?.();
                }}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium transition-all flex items-center justify-center gap-2"
                title="Ver estadísticas de cumpleaños"
              >
                <span className="material-symbols-rounded text-base">
                  insights
                </span>
                <span className="text-sm">Estadísticas</span>
              </button>
            </div>
          );
        }

        // Cards normales
        return (
          <div
            key={index}
            className={`${stat.bgColor} rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p
                  className={`text-sm font-medium text-gray-600 dark:text-gray-400`}
                >
                  {stat.title}
                </p>
                <div className="flex items-center mt-2">
                  <p className={`text-3xl font-bold ${stat.textColor}`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;
