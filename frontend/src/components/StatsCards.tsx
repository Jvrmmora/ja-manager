import React from 'react';
import type { IYoung } from '../types';

interface StatsCardsProps {
  youngList: IYoung[];
  onBirthdayClick?: () => void;
}

const StatsCards: React.FC<StatsCardsProps> = ({ youngList, onBirthdayClick }) => {
  // Calcular estadísticas
  const totalYoung = youngList.length;
  
  // Calcular activos (por ahora todos los jóvenes son activos)
  const activeYoung = totalYoung;

  // Calcular cumpleaños de este mes
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const birthdaysThisMonth = youngList.filter(young => {
    if (!young.birthday) return false;
    
    const birthday = new Date(young.birthday);
    return birthday.getMonth() === currentMonth;
  }).length;

  // Calcular nuevos de este mes
  const newThisMonth = youngList.filter(young => {
    if (!young.createdAt) return false;
    
    const createdAt = new Date(young.createdAt);
    return createdAt.getMonth() === currentMonth && 
           createdAt.getFullYear() === currentYear;
  }).length;

  const stats = [
    {
      title: 'Total Jóvenes',
      value: totalYoung,
      color: 'blue',
      bgColor: 'bg-white',
      textColor: 'text-blue-600'
    },
    {
      title: 'Activos',
      value: activeYoung,
      color: 'green',
      bgColor: 'bg-white',
      textColor: 'text-green-600'
    },
    {
      title: 'Nuevos Este Mes',
      value: newThisMonth,
      color: 'purple',
      bgColor: 'bg-white',
      textColor: 'text-purple-600'
    },
    {
      title: 'Cumpleaños Este Mes: Septiembre',
      value: birthdaysThisMonth,
      color: 'orange',
      bgColor: 'bg-orange-500',
      textColor: 'text-white',
      icon: '🎂',
      subtitle: 'Haz clic para ver detalles'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`${stat.bgColor} rounded-lg p-6 shadow-sm border border-gray-200 ${
            stat.color === 'orange' ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
          }`}
          onClick={stat.color === 'orange' ? onBirthdayClick : undefined}
        >
          {/* Título y valor */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                stat.color === 'orange' ? 'text-white' : 'text-gray-600'
              }`}>
                {stat.title}
              </p>
              <div className="flex items-center mt-2">
                {stat.icon && (
                  <span className="text-2xl mr-2">{stat.icon}</span>
                )}
                <p className={`text-3xl font-bold ${stat.textColor}`}>
                  {stat.value}
                </p>
              </div>
              {stat.subtitle && (
                <p className="text-xs text-white/80 mt-2">
                  {stat.subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
