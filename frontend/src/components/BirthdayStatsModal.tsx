import React, { useState, useEffect } from 'react';
import { getAuthToken } from '../services/api';
import { formatBirthday, parseYYYYMMDD } from '../utils/dateUtils';
import BrandModalHeader from './ui/BrandModalHeader';
import { initialsOf } from './young/useYoungActions';

const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

interface BirthdayStats {
  emailsSentToday: number;
  totalPointsClaimedThisMonth: number;
  transactionsCount: number;
  upcomingBirthdays: Array<{
    youngId: string;
    fullName: string;
    birthday: string;
    nextBirthday: string;
    daysUntil: number;
    profileImage?: string;
  }>;
}

interface BirthdayStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BirthdayStatsModal: React.FC<BirthdayStatsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [stats, setStats] = useState<BirthdayStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/birthday/stats`,
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al obtener estadísticas');
      }

      const data = await response.json();
      setStats(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Captura: cierra solo este modal y no el de cumpleaños que está debajo
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tile =
    'flex flex-col gap-2.5 rounded-[20px] border px-[18px] py-4';

  return (
    <div
      className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center bg-[#0C0609]/75 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] sm:max-h-[90vh] w-full sm:max-w-2xl flex-col overflow-hidden rounded-t-[28px] sm:rounded-[30px] bg-cream shadow-[0_60px_120px_-40px_rgba(0,0,0,0.8)] dark:bg-ink-900"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Estadísticas de cumpleaños"
      >
        <BrandModalHeader
          title="Estadísticas de cumpleaños"
          subtitle="Resumen de envíos y reclamaciones"
          iconTone="wine"
          icon={
            <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 3v18h18M7 15l4-4 3 3 5-6" />
            </svg>
          }
          onClose={onClose}
        />

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="h-12 w-12 animate-spin rounded-full border-4 border-sand-200 border-t-brand-ember" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          ) : stats ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className={`${tile} border-sand-200 bg-white dark:border-white/10 dark:bg-ink-800`}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sand-100 text-brand-ember dark:bg-brand-orange/15 dark:text-brand-amber">
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="M22 7l-10 6L2 7" />
                    </svg>
                  </span>
                  <span className="font-display text-[40px] font-bold leading-none text-cocoa-900 dark:text-white">
                    {stats.emailsSentToday}
                  </span>
                  <span className="text-[13px] text-cocoa-500 dark:text-white/60">Correos enviados hoy</span>
                </div>
                <div className={`${tile} border-ink-950 bg-ink-950 text-white`}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-amber/15 text-brand-amber">
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </span>
                  <span className="font-display text-[40px] font-bold leading-none text-brand-amber">
                    {stats.totalPointsClaimedThisMonth}
                  </span>
                  <span className="text-[13px] text-white/65">Puntos reclamados (mes)</span>
                </div>
                <div className={`${tile} border-sand-200 bg-white dark:border-white/10 dark:bg-ink-800`}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F6E1E8] text-brand-wine dark:bg-brand-wine/25 dark:text-[#F4A3C0]">
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                    </svg>
                  </span>
                  <span className="font-display text-[40px] font-bold leading-none text-cocoa-900 dark:text-white">
                    {stats.transactionsCount}
                  </span>
                  <span className="text-[13px] text-cocoa-500 dark:text-white/60">Reclamaciones este mes</span>
                </div>
              </div>

              <div className="rounded-[22px] border border-sand-200 bg-white p-4 dark:border-white/10 dark:bg-ink-800">
                <span className="eyebrow block px-1.5 pb-2 text-[13px] text-brand-deep dark:text-brand-amber">
                  Próximos cumpleaños
                </span>
                {stats.upcomingBirthdays.length === 0 ? (
                  <p className="m-0 py-4 text-center text-sm text-cocoa-500 dark:text-white/60">
                    No hay cumpleaños próximos registrados
                  </p>
                ) : (
                  <ul className="m-0 list-none p-0">
                    {stats.upcomingBirthdays.map(birthday => {
                      const bd =
                        /^\d{4}-\d{2}-\d{2}/.test(birthday.birthday)
                          ? parseYYYYMMDD(birthday.birthday.split('T')[0] as string)
                          : new Date(birthday.birthday);
                      const valid = !isNaN(bd.getTime());
                      const isToday = birthday.daysUntil === 0;
                      return (
                        <li
                          key={birthday.youngId}
                          className="grid grid-cols-[50px_42px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border-b border-sand-100 px-1.5 py-2.5 last:border-b-0 dark:border-white/5"
                        >
                          <span
                            className={`flex h-12 w-12 flex-col items-center justify-center rounded-[14px] leading-none ${
                              isToday ? 'bg-ink-950 text-white' : 'bg-sand-50 text-cocoa-900 dark:bg-white/5 dark:text-white'
                            }`}
                          >
                            <span className="font-display text-[19px] font-semibold">
                              {valid ? bd.getDate() : '·'}
                            </span>
                            <span className={`text-[9px] font-bold tracking-[0.1em] ${isToday ? 'text-brand-amber' : 'text-brand-deep dark:text-brand-amber'}`}>
                              {valid ? MONTHS[bd.getMonth()] : ''}
                            </span>
                          </span>
                          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-ink-800 text-xs font-bold text-white">
                            {birthday.profileImage ? (
                              <img src={birthday.profileImage} alt="" className="h-full w-full object-cover" />
                            ) : (
                              initialsOf(birthday.fullName)
                            )}
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-bold text-cocoa-900 dark:text-white">
                              {birthday.fullName}
                            </span>
                            <span className="truncate text-xs text-cocoa-400 dark:text-white/55">
                              {formatBirthday(birthday.birthday)}
                            </span>
                          </span>
                          <span
                            className={`inline-flex h-[26px] items-center rounded-full px-2.5 text-xs font-bold ${
                              isToday
                                ? 'bg-fire text-white'
                                : birthday.daysUntil === 1
                                  ? 'bg-sand-100 text-[#9A3412] dark:bg-brand-orange/15 dark:text-brand-amber'
                                  : 'bg-sand-50 text-cocoa-500 dark:bg-white/5 dark:text-white/60'
                            }`}
                          >
                            {isToday ? '¡Hoy!' : birthday.daysUntil === 1 ? 'Mañana' : `En ${birthday.daysUntil} días`}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-shrink-0 justify-end border-t border-sand-200 px-5 py-3.5 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-full bg-ink-950 px-6 text-sm font-semibold text-white dark:bg-white dark:text-ink-950"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default BirthdayStatsModal;
