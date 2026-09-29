import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getTodayAttendances, getAttendancesByDate } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import { initialsOf } from './young/useYoungActions';
import {
  getCurrentDateColombia,
  formatDisplayDate,
  formatDisplayTime,
} from '../utils/dateUtils';

interface AttendanceListProps {
  className?: string;
  refreshTrigger?: number; // Para refrescar desde componente padre
}

const AttendanceList: React.FC<AttendanceListProps> = ({
  className = '',
  refreshTrigger = 0,
}) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenData, setFullscreenData] = useState<any>(null); // Datos estáticos para pantalla completa
  const [selectedDate, setSelectedDate] = useState(() => {
    // Fecha actual en formato YYYY-MM-DD en zona horaria de Colombia
    return getCurrentDateColombia();
  });

  useEffect(() => {
    loadAttendances();
  }, [refreshTrigger, selectedDate]);

  useEffect(() => {
    // Auto-refresh cada 30 segundos solo si es la fecha actual o está vacía Y no está en pantalla completa
    const today = getCurrentDateColombia();
    if ((!selectedDate || selectedDate === today) && !isFullscreen) {
      const interval = setInterval(() => {
        loadAttendances();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [selectedDate, isFullscreen]);

  // Efecto para limpiar datos de pantalla completa cuando se cierra
  useEffect(() => {
    if (!isFullscreen) {
      setFullscreenData(null);
    }
  }, [isFullscreen]);

  // Manejar tecla Escape para cerrar modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        event.preventDefault();
        setIsFullscreen(false);
        setFullscreenData(null);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isFullscreen]);

  const loadAttendances = async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Si selectedDate está vacío, usar fecha actual en zona horaria de Colombia
      const today = getCurrentDateColombia();
      const dateToUse = selectedDate || today;

      // Si selectedDate estaba vacío, actualizarlo a la fecha actual
      if (!selectedDate) {
        setSelectedDate(today);
      }

      // Si es fecha actual, usar getTodayAttendances, sino usar getAttendancesByDate
      let attendanceData;

      if (dateToUse === today) {
        attendanceData = await getTodayAttendances();
      } else {
        attendanceData = await getAttendancesByDate(dateToUse);
      }

      // Solo actualizar datos si no estamos en pantalla completa
      if (!isFullscreen) {
        setData(attendanceData);
      }
    } catch (error: any) {
      if (!isFullscreen) {
        setError(error.message || 'Error al cargar asistencias');
      }
    } finally {
      if (!isFullscreen) {
        setIsLoading(false);
      }
    }
  };

  const formatTime = (dateString: string) => {
    return formatDisplayTime(dateString);
  };

  const formatDate = (dateString: string) => {
    return formatDisplayDate(dateString);
  };

  const exportToCSV = () => {
    if (!data?.attendances) return;

    const headers = ['Nombre', 'Placa', 'Grupo', 'Hora de Registro', 'Email'];
    const rows = data.attendances.map((attendance: any) => [
      attendance.youngId.fullName,
      attendance.youngId.placa || 'Sin placa',
      attendance.youngId.group || 'Sin grupo',
      formatTime(attendance.scannedAt),
      attendance.youngId.email || 'Sin email',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: string[]) => row.map(field => `"${field}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `asistencias_${data.date}.csv`;
    link.click();
  };

  if (isLoading && !data) {
    return (
      <div className={`py-10 text-center ${className}`}>
        <LoadingSpinner />
        <p className="mt-4 text-sm text-cocoa-500 dark:text-white/60">Cargando asistencias...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-2xl border border-red-200 bg-red-50 p-5 text-center dark:border-red-500/30 dark:bg-red-500/10 ${className}`}>
        <p className="m-0 text-sm text-red-700 dark:text-red-300">{error}</p>
        <button type="button" onClick={loadAttendances} className="btn-fire mt-4 h-10 px-5 text-sm">
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const isToday = !selectedDate || selectedDate === getCurrentDateColombia();
  const sorted = [...data.attendances].sort(
    (a: any, b: any) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
  );
  const percentage = Number(data.stats.attendancePercentage) || 0;

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Controles + estadísticas */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[250px_repeat(3,minmax(0,1fr))]">
        <label className="flex flex-col gap-2 rounded-[20px] border border-sand-200 bg-white px-4 py-3.5 text-xs font-bold uppercase tracking-[0.08em] text-cocoa-400 dark:border-white/10 dark:bg-ink-800 dark:text-white/50">
          Fecha
          <input
            type="date"
            value={selectedDate}
            onChange={e => {
              const newDate = e.target.value;
              // Si la fecha está vacía, usar fecha actual en zona horaria de Colombia
              setSelectedDate(newDate || getCurrentDateColombia());
            }}
            className="field-brand h-11 !rounded-xl !px-3 text-[15px] normal-case tracking-normal"
          />
        </label>
        <div className="flex flex-col justify-center gap-1.5 rounded-[20px] bg-ink-950 px-5 py-4 text-white">
          <span className="text-[13px] text-white/65">Presentes</span>
          <span className="font-display text-[44px] font-bold leading-none text-brand-amber">
            {data.stats.totalPresent}
          </span>
        </div>
        <div className="flex flex-col justify-center gap-1.5 rounded-[20px] border border-sand-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-ink-800">
          <span className="text-[13px] text-cocoa-500 dark:text-white/60">Jóvenes activos</span>
          <span className="font-display text-[44px] font-bold leading-none text-cocoa-900 dark:text-white">
            {data.stats.totalYoung}
          </span>
        </div>
        <div className="flex flex-col justify-center gap-2 rounded-[20px] border border-sand-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-ink-800">
          <span className="flex items-baseline justify-between text-[13px] text-cocoa-500 dark:text-white/60">
            Asistencia
            <strong className="font-display text-[22px] text-brand-ember dark:text-brand-amber">{percentage}%</strong>
          </span>
          <span className="block h-2.5 overflow-hidden rounded-full bg-sand-50 dark:bg-white/10">
            <span
              className="block h-full rounded-full bg-[linear-gradient(90deg,#F9A23B,#DC3340,#8A1C45)]"
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] text-cocoa-500 dark:text-white/60">
          {isToday
            ? `${formatDate(data.date)} · se actualiza automáticamente cada 30 segundos`
            : `Mostrando asistencias del ${formatDate(selectedDate)}`}
        </span>
        {data.attendances.length > 0 && (
          <span className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                // Capturar datos estáticos al abrir pantalla completa
                setFullscreenData(JSON.parse(JSON.stringify(data)));
                setIsFullscreen(true);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-sand-300 bg-white px-4 text-[13px] font-semibold text-cocoa-600 hover:border-cocoa-400 dark:border-white/15 dark:bg-ink-800 dark:text-white/80"
            >
              <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>
              Pantalla completa
            </button>
            <button
              type="button"
              onClick={exportToCSV}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-sand-300 bg-white px-4 text-[13px] font-semibold text-cocoa-600 hover:border-cocoa-400 dark:border-white/15 dark:bg-ink-800 dark:text-white/80"
            >
              <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Exportar CSV
            </button>
          </span>
        )}
      </div>

      {/* Lista */}
      {data.attendances.length > 0 ? (
        <div className="rounded-[22px] border border-sand-200 bg-white dark:border-white/10 dark:bg-ink-800">
          <div className="hidden h-11 grid-cols-[48px_minmax(0,1fr)_170px_110px_110px] items-center gap-3.5 rounded-t-[22px] border-b border-sand-200 bg-sand-50 px-5 text-xs font-bold uppercase tracking-[0.08em] text-cocoa-400 md:grid dark:border-white/10 dark:bg-white/[0.03] dark:text-white/50">
            <span>#</span>
            <span>Joven</span>
            <span>Placa</span>
            <span>Hora</span>
            <span>Estado</span>
          </div>
          {sorted.map((attendance: any, index: number) => (
            <motion.div
              key={attendance._id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(index, 12) * 0.03 }}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-sand-100 px-4 py-3 last:border-b-0 hover:bg-cream md:grid-cols-[48px_minmax(0,1fr)_170px_110px_110px] md:gap-3.5 md:px-5 dark:border-white/5 dark:hover:bg-white/[0.03]"
            >
              <span className="hidden font-display text-lg text-cocoa-400 md:block dark:text-white/45">
                {sorted.length - index}
              </span>
              <span className="flex min-w-0 items-center gap-3">
                <span className="relative flex-shrink-0">
                  <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-ink-800 text-xs font-bold text-white">
                    {attendance.youngId.profileImage ? (
                      <img src={attendance.youngId.profileImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initialsOf(attendance.youngId.fullName || '')
                    )}
                  </span>
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-emerald-600 dark:border-ink-800">
                    <svg className="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-bold text-cocoa-900 dark:text-white">
                    {attendance.youngId.fullName}
                  </span>
                  {attendance.youngId.email && (
                    <span className="truncate text-xs text-cocoa-400 dark:text-white/50">
                      {attendance.youngId.email}
                    </span>
                  )}
                </span>
              </span>
              <span className="hidden truncate font-mono text-xs font-semibold text-brand-wine md:block dark:text-[#F4A3C0]">
                {attendance.youngId.placa || '—'}
              </span>
              <span className="text-right text-sm text-cocoa-600 md:text-left dark:text-white/70">
                {formatTime(attendance.scannedAt)}
              </span>
              <span className="hidden md:block">
                <span className="inline-flex h-[26px] items-center rounded-full bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                  Registrado
                </span>
              </span>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="rounded-[22px] border border-sand-200 bg-white px-6 py-12 text-center dark:border-white/10 dark:bg-ink-800">
          <p className="m-0 text-lg text-cocoa-600 dark:text-white/70">No hay asistencias registradas aún</p>
          <p className="m-0 mt-2 text-sm text-cocoa-400 dark:text-white/50">
            Las asistencias aparecerán aquí cuando los jóvenes escaneen el código QR
          </p>
        </div>
      )}

      {/* Modo proyector (portal: evita quedar atrapado en paneles con transform) */}
      {createPortal(
      <AnimatePresence>
        {isFullscreen &&
          fullscreenData &&
          fullscreenData.attendances &&
          fullscreenData.attendances.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="dark fixed inset-0 z-[9999] flex flex-col overflow-hidden bg-ink-950 text-white"
              role="dialog"
              aria-modal="true"
              aria-label="Lista de asistencia"
            >
              <div className="pointer-events-none absolute left-1/3 -top-[420px] h-[820px] w-[820px] rounded-full bg-[radial-gradient(circle,rgba(242,106,46,.28)_0%,rgba(20,11,16,0)_65%)]" />
              <div className="relative flex items-center justify-between gap-4 border-b border-white/10 px-6 py-5 lg:px-12">
                <div>
                  <h2 className="m-0 font-display text-3xl font-bold uppercase lg:text-4xl">
                    Lista de <span className="text-fire">asistencia</span>
                  </h2>
                  <p className="m-0 mt-1 text-white/60">
                    {formatDate(fullscreenData.date)} · {fullscreenData.attendances.length} asistentes
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsFullscreen(false);
                    setFullscreenData(null);
                  }}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-semibold text-white/80 hover:border-white/50 hover:text-white"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                  Cerrar · Esc
                </button>
              </div>
              <div className="relative flex-1 overflow-y-auto px-6 py-6 lg:px-12">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[...fullscreenData.attendances]
                    .sort(
                      (a: any, b: any) =>
                        new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime()
                    ) // Ordenar por orden de llegada
                    .map((attendance: any, index: number) => (
                      <motion.div
                        key={attendance._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index, 20) * 0.03 }}
                        className="flex items-center gap-4 rounded-[20px] border border-white/10 bg-white/[0.05] px-4 py-3.5"
                      >
                        <span className="relative flex-shrink-0">
                          <span className="block h-16 w-16 rounded-full bg-[linear-gradient(135deg,#F9A23B,#DC3340,#8A1C45)] p-[3px]">
                            <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-ink-800 font-display text-xl">
                              {attendance.youngId.profileImage ? (
                                <img src={attendance.youngId.profileImage} alt="" className="h-full w-full object-cover" />
                              ) : (
                                initialsOf(attendance.youngId.fullName || '')
                              )}
                            </span>
                          </span>
                          <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand-amber text-xs font-bold text-ink-950">
                            {index + 1}
                          </span>
                        </span>
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="truncate text-lg font-semibold">{attendance.youngId.fullName}</span>
                          <span className="text-sm text-white/60">{formatTime(attendance.scannedAt)}</span>
                        </span>
                      </motion.div>
                    ))}
                </div>
              </div>
            </motion.div>
          )}
      </AnimatePresence>,
      document.body
      )}
    </div>
  );
};

export default AttendanceList;
