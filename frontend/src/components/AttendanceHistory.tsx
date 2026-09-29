import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  XCircleIcon,
  CalendarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { getMyAttendanceHistory } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

interface AttendanceHistoryProps {
  className?: string;
  compact?: boolean; // Para mostrar una versión más compacta
}

const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({
  className = '',
  compact = false,
}) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadHistory();
  }, [currentPage]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const historyData = await getMyAttendanceHistory(
        currentPage,
        compact ? 5 : 10
      );
      setData(historyData);
    } catch (error: any) {
      setError(error.message || 'Error al cargar el historial');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    // Si es formato YYYY-MM-DD, parsearlo como fecha local
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day, 12, 0, 0);
      return date.toLocaleDateString('es-CO', {
        timeZone: 'America/Bogota',
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    // Si es un timestamp completo, usar zona horaria de Colombia
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      timeZone: 'America/Bogota',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    // Formatear con zona horaria de Colombia
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-CO', {
      timeZone: 'America/Bogota',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toDate = (dateString: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day, 12, 0, 0);
    }
    return new Date(dateString);
  };

  const dayParts = (dateString: string) => {
    const date = toDate(dateString);
    const opts = { timeZone: 'America/Bogota' } as const;
    return {
      day: date.toLocaleDateString('es-CO', { ...opts, day: 'numeric' }),
      month: date
        .toLocaleDateString('es-CO', { ...opts, month: 'short' })
        .replace('.', '')
        .toUpperCase(),
    };
  };

  const cardCls = `rounded-[28px] border border-sand-200 bg-white p-6 sm:p-9 dark:border-white/10 dark:bg-ink-900 ${className}`;

  if (isLoading) {
    return (
      <div className={`${cardCls} text-center py-12`}>
        <LoadingSpinner />
        <p className="mt-4 text-sm text-cocoa-500 dark:text-white/60">
          Cargando historial...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${cardCls} text-center py-12`}>
        <XCircleIcon className="w-12 h-12 mx-auto mb-4 text-red-500 dark:text-red-400" />
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        <button onClick={loadHistory} className="btn-fire mt-5 h-11 px-6 text-sm">
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <section className={cardCls}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <span className="eyebrow text-[13px] text-brand-deep dark:text-brand-amber">
            Asistencias
          </span>
          <h2 className="m-0 font-display text-[28px] sm:text-4xl font-semibold uppercase leading-none text-cocoa-900 dark:text-white">
            Mi Historial de Asistencias
          </h2>
        </div>
        {!compact && data.stats && (
          <div className="flex gap-2">
            <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#F6D6B8] bg-sand-50 px-3.5 text-sm text-cocoa-600 dark:border-white/10 dark:bg-ink-800 dark:text-white/70">
              Total: <strong className="text-cocoa-900 dark:text-white">{data.stats.totalAttendances}</strong>
            </span>
            <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#F6D6B8] bg-sand-50 px-3.5 text-sm text-cocoa-600 dark:border-white/10 dark:bg-ink-800 dark:text-white/70">
              Este mes: <strong className="text-cocoa-900 dark:text-white">{data.stats.thisMonthAttendances}</strong>
            </span>
          </div>
        )}
      </div>

      {data.stats && (
        <div
          className={`mb-5 flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-[15px] ${
            data.stats.hasAttendanceToday
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-300'
              : 'border-sand-200 bg-sand-50 text-cocoa-600 dark:border-white/10 dark:bg-ink-800 dark:text-white/70'
          }`}
        >
          {data.stats.hasAttendanceToday ? (
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </span>
          ) : (
            <ClockIcon className="h-6 w-6 flex-shrink-0" />
          )}
          <span>
            <strong>
              {data.stats.hasAttendanceToday
                ? 'Asistencia registrada hoy'
                : 'Sin asistencia registrada hoy'}
            </strong>
            {data.stats.todayAttendance && (
              <span className="opacity-80">
                {' '}· Registrada a las {formatTime(data.stats.todayAttendance.scannedAt)}
              </span>
            )}
          </span>
        </div>
      )}

      {data.attendances && data.attendances.length > 0 ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {data.attendances.map((attendance: any, index: number) => {
            const parts = dayParts(attendance.attendanceDate);
            const isLatest = index === 0 && currentPage === 1;
            return (
              <motion.li
                key={attendance._id || index}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 rounded-2xl px-2 sm:px-3 py-3 border-b border-[#F5EAE0] last:border-0 transition-colors hover:bg-cream dark:border-white/5 dark:hover:bg-white/[0.03]"
              >
                <span
                  className={`flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-2xl leading-none ${
                    isLatest
                      ? 'bg-ink-950 text-white dark:bg-brand-wine/40'
                      : 'bg-sand-50 text-cocoa-900 dark:bg-ink-800 dark:text-white'
                  }`}
                >
                  <span className="font-display text-[22px] font-semibold">{parts.day}</span>
                  <span className={`text-[10px] font-bold tracking-[0.1em] ${isLatest ? 'text-brand-amber' : 'text-brand-deep dark:text-brand-amber'}`}>
                    {parts.month}
                  </span>
                </span>
                <span className="flex min-w-0 flex-grow flex-col gap-0.5">
                  <span className="text-[15px] sm:text-base font-semibold capitalize leading-snug text-cocoa-900 dark:text-white">
                    {formatDate(attendance.attendanceDate)}
                  </span>
                  <span className="text-sm text-cocoa-500 dark:text-white/55 sm:hidden">
                    {formatTime(attendance.scannedAt)}
                  </span>
                </span>
                <span className="inline-flex h-7 flex-shrink-0 items-center rounded-full bg-emerald-50 px-3 text-[13px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  Presente
                </span>
                <span className="hidden sm:block w-24 flex-shrink-0 text-right text-sm text-cocoa-500 dark:text-white/55">
                  {formatTime(attendance.scannedAt)}
                </span>
              </motion.li>
            );
          })}
        </ul>
      ) : (
        <div className="py-10 text-center">
          <CalendarIcon className="mx-auto mb-4 h-12 w-12 text-cocoa-400 dark:text-white/30" />
          <p className="text-cocoa-500 dark:text-white/60">
            No tienes asistencias registradas aún
          </p>
        </div>
      )}

      {!compact && data.pagination && data.pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={!data.pagination.hasPreviousPage}
            className="h-11 rounded-full border border-sand-300 bg-white px-5 text-sm font-semibold text-cocoa-900 transition-colors hover:bg-sand-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-transparent dark:text-white"
          >
            Anterior
          </button>
          <span className="whitespace-nowrap text-xs sm:text-sm text-cocoa-500 dark:text-white/60">
            Página {data.pagination.currentPage} de {data.pagination.totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={!data.pagination.hasNextPage}
            className="h-11 rounded-full bg-cocoa-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-ink-950 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-ink-950"
          >
            Siguiente
          </button>
        </div>
      )}

      {compact && data.stats && (
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-sand-200 pt-4 text-center dark:border-white/10">
          <div>
            <p className="text-fire font-display text-3xl font-bold">{data.stats.totalAttendances}</p>
            <p className="text-xs text-cocoa-500 dark:text-white/60">Total asistencias</p>
          </div>
          <div>
            <p className="text-fire font-display text-3xl font-bold">{data.stats.thisMonthAttendances}</p>
            <p className="text-xs text-cocoa-500 dark:text-white/60">Este mes</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default AttendanceHistory;
