import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  generateDailyQR,
  getCurrentQR,
  getQRStats,
  getTodayAttendances,
} from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import { QRCountdown } from './QRCountdown';
import BrandModalHeader from './ui/BrandModalHeader';
import { seasonService } from '../services/seasonService';
import { POINTS_PRESETS } from '../constants/points';
import {
  formatDisplayDate,
  formatDisplayTime,
  isExpired,
  getCurrentDateColombia,
} from '../utils/dateUtils';
import logo from '../assets/logos/logo.png';

interface QRGeneratorProps {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

const QRGenerator: React.FC<QRGeneratorProps> = ({ onSuccess, onError }) => {
  const [qrData, setQrData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [liveAttendances, setLiveAttendances] = useState<any[]>([]);
  const [lastAttendanceCount, setLastAttendanceCount] = useState(0);
  const [showConfigModal, setShowConfigModal] = useState(false); // Modal de configuración
  const [selectedPoints, setSelectedPoints] = useState(10); // Puntos seleccionados
  const [speedBonusEnabled, setSpeedBonusEnabled] = useState(true); // Bonus de velocidad habilitado
  const [bonusDecayMinutes, setBonusDecayMinutes] = useState(30); // Duración del bonus en minutos
  const [isRegenerate, setIsRegenerate] = useState(false); // Si es regeneración
  const [urlCopied, setUrlCopied] = useState(false); // Feedback al copiar el enlace de asistencia

  useEffect(() => {
    // Cargar QR existente al montar el componente
    loadCurrentQR();
  }, []);

  useEffect(() => {
    // Actualizar estadísticas cada 10 segundos si hay un QR activo
    let interval: ReturnType<typeof setInterval>;
    if (qrData) {
      interval = setInterval(() => {
        loadStats();
        // Asistentes en vivo (panel y proyector)
        loadLiveAttendances();
      }, 3000); // Cada 3 segundos para tiempo real
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [qrData, showFullscreen]);

  // Cargar asistencias en tiempo real cuando hay un QR activo
  useEffect(() => {
    if (qrData) {
      loadLiveAttendances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrData]);

  // Manejar tecla Escape para cerrar modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showFullscreen) {
        // Evita que el panel que contiene al QR también se cierre
        event.preventDefault();
        setShowFullscreen(false);
      }
    };

    if (showFullscreen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showFullscreen]);

  const loadLiveAttendances = async () => {
    try {
      const attendanceData = await getTodayAttendances();
      const newAttendances = attendanceData.attendances || [];

      // Detectar nuevas asistencias
      if (newAttendances.length > lastAttendanceCount) {
        // Obtener solo las nuevas asistencias
        const newestAttendances = newAttendances.slice(lastAttendanceCount);

        // Agregar nuevas asistencias una por una con delay
        newestAttendances.forEach((attendance: any, index: number) => {
          setTimeout(() => {
            setLiveAttendances(prev => {
              // Evitar duplicados
              const exists = prev.some(a => a._id === attendance._id);
              if (!exists) {
                return [attendance, ...prev]; // Agregar al inicio
              }
              return prev;
            });
          }, index * 500); // 500ms entre cada nueva asistencia
        });

        setLastAttendanceCount(newAttendances.length);
      } else if (liveAttendances.length === 0) {
        // Primera carga
        setLiveAttendances(newAttendances.reverse()); // Mostrar más recientes primero
        setLastAttendanceCount(newAttendances.length);
      }
    } catch (error) {
      console.error('Error cargando asistencias en vivo:', error);
    }
  };

  const loadCurrentQR = async () => {
    try {
      setIsLoading(true);
      const data = await getCurrentQR();
      setQrData(data);
      await loadStats();
    } catch {
      // No hay QR activo, no es un error crítico
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await getQRStats();
      setStats(statsData);
    } catch (error: any) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const ensureActiveSeason = async (): Promise<boolean> => {
    try {
      const active = await seasonService.getActive();
      if (!active) {
        const msg = 'Debes crear y activar una Temporada antes de generar QR.';
        setError(msg);
        onError?.(msg);
        return false;
      }
      return true;
    } catch (e: any) {
      const msg = 'No se pudo verificar la temporada activa.';
      setError(msg);
      onError?.(msg);
      return false;
    }
  };

  const handleGenerateQR = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      // Pasar force=isRegenerate, selectedPoints, speedBonusEnabled y bonusDecayMinutes
      const data = await generateDailyQR(
        isRegenerate,
        selectedPoints,
        speedBonusEnabled,
        bonusDecayMinutes
      );
      setQrData(data);
      await loadStats();

      // Resetear modal
      setShowConfigModal(false);
      setIsRegenerate(false);
      setSelectedPoints(10);
      setSpeedBonusEnabled(true);
      setBonusDecayMinutes(30);

      if (onSuccess) {
        onSuccess(data);
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Error al generar código QR';
      setError(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return formatDisplayDate(dateString);
  };

  const formatTime = (dateString: string) => {
    return formatDisplayTime(dateString);
  };

  const isExpiredQR = () => {
    if (!qrData?.qrCode?.expiresAt) return false;
    return isExpired(qrData.qrCode.expiresAt);
  };

  const handleCopyUrl = async () => {
    if (!qrData?.qrUrl) return;
    try {
      await navigator.clipboard.writeText(qrData.qrUrl);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch {
      onError?.('No se pudo copiar el enlace. Cópialo manualmente.');
    }
  };

  const buildWhatsappShareUrl = () => {
    const message = `¡Hola! 👋 Registra tu asistencia de hoy tocando este enlace (no necesitas escanear el QR):\n\n${qrData?.qrUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  if (isLoading) {
    return (
      <div className="py-10 text-center">
        <LoadingSpinner />
        <p className="mt-4 text-sm text-cocoa-500 dark:text-white/60">
          Cargando información del QR...
        </p>
      </div>
    );
  }

  const qrCode = qrData?.qrCode;
  const attendanceCount = stats?.attendanceCount ?? liveAttendances.length;
  const maxBonus = qrCode ? Math.floor((qrCode.points || 10) * 0.5) : 0;

  const openGenerate = async () => {
    if (!(await ensureActiveSeason())) return;
    setIsRegenerate(false);
    setSelectedPoints(10);
    setShowConfigModal(true);
  };

  return (
    <>
      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      {!qrData || isExpiredQR() ? (
        <div className="flex flex-col items-center gap-4 rounded-[26px] border border-sand-200 bg-white px-6 py-12 text-center dark:border-white/10 dark:bg-ink-800">
          <span className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-sand-100 text-brand-ember dark:bg-brand-orange/15 dark:text-brand-amber">
            <QrIcon className="h-8 w-8" />
          </span>
          <p className="m-0 text-[15px] text-cocoa-600 dark:text-white/70">
            {isExpiredQR()
              ? 'El código QR ha expirado'
              : 'No hay código QR activo para el día de hoy'}
          </p>
          <button
            type="button"
            onClick={openGenerate}
            disabled={isGenerating}
            className="btn-fire h-[52px] px-7 text-[15px]"
          >
            {isGenerating ? (
              <>
                <LoadingSpinner size="sm" />
                Generando...
              </>
            ) : (
              <>
                <QrIcon className="h-5 w-5" />
                Generar QR del {formatDate(getCurrentDateColombia())}
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-[320px_minmax(0,1fr)]">
          {/* Código */}
          <div className="flex flex-col gap-3">
            <div className="relative flex items-center justify-center rounded-[26px] border border-sand-200 bg-white p-6 dark:border-white/10">
              <BrandCorners size="sm" />
              <img
                src={qrData.qrImage}
                alt="Código QR de Asistencia"
                className="h-60 w-60 rounded-xl"
              />
            </div>
            <span className="flex h-9 items-center justify-center gap-2 rounded-full bg-emerald-50 text-[13px] font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 motion-safe:animate-glow-green" />
              Activo · expira en <QRCountdown expiresAt={qrCode.expiresAt} variant="inline" />
            </span>
            <button
              type="button"
              onClick={async () => {
                if (!(await ensureActiveSeason())) return;
                setShowFullscreen(true);
              }}
              className="btn-fire h-[52px] text-[15px]"
            >
              <ExpandIcon className="h-[17px] w-[17px]" />
              Ampliar para proyector
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!(await ensureActiveSeason())) return;
                setIsRegenerate(true);
                setSelectedPoints(qrCode?.points || 10);
                setShowConfigModal(true);
              }}
              disabled={isGenerating}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-sand-300 bg-white text-sm font-semibold text-cocoa-600 transition-colors hover:border-cocoa-400 disabled:opacity-60 dark:border-white/15 dark:bg-transparent dark:text-white/80"
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner size="sm" />
                  Regenerando...
                </>
              ) : (
                <>
                  <RefreshIcon className="h-4 w-4" />
                  Regenerar QR
                </>
              )}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyUrl}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border-[1.5px] border-sand-300 bg-white text-[13px] font-semibold text-cocoa-600 transition-colors hover:border-cocoa-400 dark:border-white/15 dark:bg-transparent dark:text-white/80"
              >
                {urlCopied ? (
                  <>
                    <CheckIcon className="h-4 w-4 text-emerald-500" />
                    ¡Copiado!
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4" />
                    Copiar enlace
                  </>
                )}
              </button>
              <a
                href={buildWhatsappShareUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#25D366] text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                <WhatsappIcon className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
            <p className="m-0 text-center text-[11px] text-cocoa-400 dark:text-white/40">
              Para quien no pueda escanear el QR: comparte el enlace y podrá registrar su asistencia igual.
            </p>
          </div>

          {/* Información */}
          <div className="flex min-w-0 flex-col gap-3.5">
            <div className="grid grid-cols-3 gap-2.5">
              <InfoTile label="Fecha" value={formatDate(qrCode.dailyDate)} />
              <InfoTile label="Generado" value={formatTime(qrCode.generatedAt)} />
              <InfoTile label="Puntos" value={`+${qrCode.points || 10}`} accent />
            </div>
            {qrCode.speedBonusEnabled && (
              <LiveBonusDisplay
                maxBonus={maxBonus}
                bonusDecayMinutes={qrCode.bonusDecayMinutes || 30}
                qrGeneratedAt={qrCode.generatedAt}
                variant="panel"
              />
            )}
            <div className="flex flex-1 flex-col gap-2 rounded-[22px] border border-sand-200 bg-white p-4 dark:border-white/10 dark:bg-ink-800">
              <div className="flex items-start justify-between gap-3">
                <span className="flex flex-col gap-0.5">
                  <span className="font-display text-lg font-semibold uppercase text-cocoa-900 dark:text-white">
                    Asistentes registrados
                  </span>
                  <span className="text-xs text-cocoa-400 dark:text-white/50">
                    Actualizado automáticamente cada pocos segundos
                  </span>
                </span>
                <span className="font-display text-[34px] font-bold leading-none text-brand-ember dark:text-brand-amber">
                  {attendanceCount}
                </span>
              </div>
              {liveAttendances.length === 0 ? (
                <p className="m-0 py-4 text-center text-sm text-cocoa-400 dark:text-white/50">
                  Esperando primeros registros...
                </p>
              ) : (
                <ul className="m-0 flex list-none flex-col p-0">
                  {liveAttendances.slice(0, 6).map(attendance => (
                    <li
                      key={attendance._id}
                      className="flex items-center gap-3 border-b border-sand-100 py-2 last:border-b-0 dark:border-white/5"
                    >
                      <AttendeeAvatar attendance={attendance} size={34} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-cocoa-900 dark:text-white">
                        {attendance.youngId?.fullName}
                      </span>
                      <span className="text-xs text-cocoa-400 dark:text-white/50">
                        {formatTime(attendance.scannedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modo proyector (portal: evita quedar atrapado en paneles con transform) */}
      {createPortal(
      <AnimatePresence>
        {showFullscreen && qrData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="dark fixed inset-0 z-[9999] overflow-hidden bg-ink-950 text-white"
            role="dialog"
            aria-modal="true"
            aria-label="Código QR para proyector"
          >
            <div className="pointer-events-none absolute -left-52 -top-[420px] h-[900px] w-[900px] rounded-full bg-[radial-gradient(circle,rgba(242,106,46,.28)_0%,rgba(220,51,64,.1)_40%,rgba(20,11,16,0)_68%)] motion-safe:animate-ember" />
            <div className="pointer-events-none absolute left-1/4 top-1/2 h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle,rgba(138,28,69,.35)_0%,rgba(20,11,16,0)_65%)] motion-safe:animate-ember-slow" />

            <div className="relative grid h-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(380px,38%)]">
              {/* Código */}
              <div className="flex flex-col items-center overflow-y-auto px-6 py-6 lg:px-14 lg:py-9">
                <div className="flex w-full items-center justify-between">
                  <span className="flex items-center gap-3">
                    <img src={logo} alt="" className="h-11 w-11 object-contain" />
                    <span className="flex flex-col leading-none">
                      <span className="font-display text-[11px] tracking-[0.3em] text-white/55">JÓVENES</span>
                      <span className="font-display text-[22px] font-semibold tracking-[0.04em]">MODELIA</span>
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowFullscreen(false)}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-4 text-[13px] font-semibold text-white/75 transition-colors hover:border-white/50 hover:text-white"
                  >
                    <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                    Cerrar · Esc
                  </button>
                </div>

                <span className="mt-5 font-display text-base uppercase tracking-[0.3em] text-brand-amber">
                  {formatDate(qrCode.dailyDate)}
                </span>
                <motion.h1
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="m-0 mt-2 text-center font-display text-5xl font-bold uppercase leading-[0.95] xl:text-[72px]"
                >
                  Registra tu <span className="text-fire">asistencia</span>
                </motion.h1>

                <div className="mt-7 flex flex-1 flex-col items-center justify-center gap-9 pb-4 xl:flex-row xl:gap-12">
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="relative rounded-[36px] bg-white p-7 shadow-[0_40px_100px_-30px_rgba(242,106,46,0.6)]"
                  >
                    <BrandCorners size="lg" />
                    <span className="pointer-events-none absolute inset-x-7 h-[3px] rounded bg-[linear-gradient(90deg,rgba(249,162,59,0),#F9A23B,rgba(249,162,59,0))] shadow-[0_0_18px_2px_rgba(249,162,59,0.6)] motion-safe:animate-scan-line" />
                    <img
                      src={qrData.qrImage}
                      alt="Código QR de Asistencia"
                      className="h-72 w-72 rounded-2xl [image-rendering:pixelated] lg:h-[min(46vh,440px)] lg:w-[min(46vh,440px)] xl:h-[min(60vh,600px)] xl:w-[min(60vh,600px)]"
                    />
                  </motion.div>

                  <div className="flex w-full max-w-[300px] flex-col gap-[18px]">
                    {qrCode.speedBonusEnabled && (
                      <LiveBonusDisplay
                        maxBonus={maxBonus}
                        bonusDecayMinutes={qrCode.bonusDecayMinutes || 30}
                        qrGeneratedAt={qrCode.generatedAt}
                        variant="projector"
                      />
                    )}
                    <div className="flex flex-col gap-2">
                      <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-white/55">
                        Expira en
                      </span>
                      <QRCountdown expiresAt={qrCode.expiresAt} />
                    </div>
                    <p className="m-0 text-[15px] leading-relaxed text-white/65">
                      Abre JA Manager en tu celular → <strong className="text-white">Registrar asistencia</strong> → apunta al código.
                    </p>
                  </div>
                </div>
              </div>

              {/* Asistentes en vivo */}
              <div className="hidden flex-col border-l border-white/10 bg-ink-900/90 lg:flex">
                <div className="flex items-end justify-between gap-4 border-b border-white/10 px-9 pb-5 pt-8">
                  <span className="flex flex-col gap-2">
                    <span className="flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[0.16em] text-emerald-400">
                      <span className="h-[9px] w-[9px] rounded-full bg-emerald-400 motion-safe:animate-glow-green" />
                      En vivo
                    </span>
                    <span className="font-display text-[32px] font-semibold uppercase leading-none">
                      Asistentes registrados
                    </span>
                  </span>
                  <motion.span
                    key={attendanceCount}
                    initial={{ scale: 1.25 }}
                    animate={{ scale: 1 }}
                    className="bg-[linear-gradient(135deg,#FDE68A,#F9A23B,#DC3340)] bg-clip-text font-display text-[80px] font-bold leading-[0.85] text-transparent"
                  >
                    {attendanceCount}
                  </motion.span>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto px-7 py-5">
                  <AnimatePresence>
                    {liveAttendances.map((attendance, index) => (
                      <motion.div
                        key={attendance._id}
                        initial={{ x: 200, opacity: 0, scale: 0.9 }}
                        animate={{ x: 0, opacity: 1, scale: 1 }}
                        exit={{ x: -200, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 22, delay: Math.min(index, 6) * 0.08 }}
                        className={`flex items-center gap-4 rounded-[20px] border px-[18px] py-3.5 ${
                          index === 0
                            ? 'border-brand-amber/60 bg-brand-amber/10 shadow-[0_0_30px_-8px_rgba(249,162,59,0.5)]'
                            : 'border-white/10 bg-white/[0.04]'
                        }`}
                      >
                        <span className="relative flex-shrink-0">
                          <AttendeeAvatar attendance={attendance} size={56} ring />
                          <span className="absolute -bottom-1 -right-1 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-ink-900 bg-emerald-600">
                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate text-xl font-bold">
                            {attendance.youngId?.fullName}
                          </span>
                          <span className="text-sm text-white/55">
                            {formatTime(attendance.scannedAt)}
                          </span>
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {liveAttendances.length === 0 && (
                    <div className="py-16 text-center text-white/55">
                      <p className="m-0 text-lg">Esperando primeros registros...</p>
                      <p className="m-0 mt-2 text-sm">
                        Los asistentes aparecerán aquí en tiempo real
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}

      {/* Modal de configuración de puntos */}
      <AnimatePresence>
        {showConfigModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0C0609]/75 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl dark:bg-ink-900"
              role="dialog"
              aria-modal="true"
              aria-label={isRegenerate ? 'Regenerar QR' : 'Generar QR'}
            >
              <BrandModalHeader
                title={isRegenerate ? 'Regenerar QR' : 'Generar QR'}
                icon={isRegenerate ? <RefreshIcon className="h-5 w-5" /> : <QrIcon className="h-5 w-5" />}
                onClose={() => setShowConfigModal(false)}
                compact
              />
              <div className="space-y-4 p-6">
                <div>
                  <p className="m-0 text-[15px] font-bold text-cocoa-900 dark:text-white">
                    Puntos por asistencia
                  </p>
                  <p className="m-0 mt-1 text-[13px] text-cocoa-500 dark:text-white/60">
                    Selecciona cuántos puntos ganará cada joven al escanear este QR
                  </p>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {POINTS_PRESETS.map(value => (
                    <motion.button
                      key={value}
                      type="button"
                      onClick={() => setSelectedPoints(value)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      aria-pressed={selectedPoints === value}
                      className={`h-[46px] rounded-[14px] border-[1.5px] font-display text-lg font-semibold transition-colors ${
                        selectedPoints === value
                          ? 'border-brand-ember bg-gradient-to-br from-brand-orange to-[#B3243B] text-white shadow-lg'
                          : 'border-sand-200 bg-cream text-cocoa-600 hover:border-[#F4B58C] dark:border-white/10 dark:bg-white/5 dark:text-white/80'
                      }`}
                    >
                      {value}
                    </motion.button>
                  ))}
                </div>
                <div className="rounded-2xl border border-[#F6D6B8] bg-sand-50 p-4 text-[13px] leading-relaxed text-cocoa-600 dark:border-brand-orange/25 dark:bg-brand-orange/10 dark:text-white/75">
                  <p className="m-0 mb-1 font-bold text-[#9A3412] dark:text-brand-amber">
                    Valores recomendados
                  </p>
                  <ul className="m-0 list-none space-y-0.5 p-0">
                    <li>• <strong>10 pts</strong>: Asistencia regular</li>
                    <li>• <strong>20 pts</strong>: Evento especial</li>
                    <li>• <strong>30 pts</strong>: Evento excepcional (campamento)</li>
                    <li>• <strong>40-50 pts</strong>: Eventos extraordinarios</li>
                  </ul>
                </div>
                {isRegenerate && (
                  <div className="flex gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-[13px] leading-snug text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
                    </svg>
                    <span>
                      <strong>Atención:</strong> Esto desactivará el QR actual y generará uno nuevo con los puntos configurados.
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-3 px-6 pb-6">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  disabled={isGenerating}
                  className="h-[50px] flex-1 rounded-full border-[1.5px] border-sand-300 bg-white text-[15px] font-semibold text-cocoa-600 hover:border-cocoa-400 dark:border-white/15 dark:bg-transparent dark:text-white/80"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGenerateQR}
                  disabled={isGenerating}
                  className="btn-fire h-[50px] flex-1 text-[15px]"
                >
                  {isGenerating ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>{isRegenerate ? 'Regenerando...' : 'Generando...'}</span>
                    </>
                  ) : (
                    <>
                      <QrIcon className="h-5 w-5" />
                      <span>{isRegenerate ? 'Regenerar QR' : 'Generar QR'}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const InfoTile: React.FC<{ label: string; value: string; accent?: boolean }> = ({
  label,
  value,
  accent = false,
}) => (
  <div className="flex min-w-0 flex-col gap-1 rounded-[18px] border border-sand-200 bg-white px-3.5 py-3 dark:border-white/10 dark:bg-ink-800">
    <span className="text-xs font-semibold text-cocoa-400 dark:text-white/50">{label}</span>
    <span
      className={`truncate ${
        accent
          ? 'font-display text-xl font-semibold text-brand-ember dark:text-brand-amber'
          : 'text-[15px] font-bold text-cocoa-900 dark:text-white'
      }`}
    >
      {value}
    </span>
  </div>
);

// Esquinas de marca alrededor del código
const BrandCorners: React.FC<{ size: 'sm' | 'lg' }> = ({ size }) => {
  const box = size === 'lg' ? 'h-16 w-16 border-[6px]' : 'h-[30px] w-[30px] border-4';
  const off = size === 'lg' ? '-left-2.5 -top-2.5' : 'left-3.5 top-3.5';
  const offR = size === 'lg' ? '-right-2.5 -top-2.5' : 'right-3.5 top-3.5';
  const offBL = size === 'lg' ? '-left-2.5 -bottom-2.5' : 'left-3.5 bottom-3.5';
  const offBR = size === 'lg' ? '-right-2.5 -bottom-2.5' : 'right-3.5 bottom-3.5';
  const r = size === 'lg' ? '30px' : '12px';
  return (
    <>
      <span className={`pointer-events-none absolute ${off} ${box} border-b-0 border-r-0 border-brand-amber`} style={{ borderTopLeftRadius: r }} />
      <span className={`pointer-events-none absolute ${offR} ${box} border-b-0 border-l-0 border-brand-orange`} style={{ borderTopRightRadius: r }} />
      <span className={`pointer-events-none absolute ${offBL} ${box} border-r-0 border-t-0 border-brand-red`} style={{ borderBottomLeftRadius: r }} />
      <span className={`pointer-events-none absolute ${offBR} ${box} border-l-0 border-t-0 border-brand-wine`} style={{ borderBottomRightRadius: r }} />
    </>
  );
};

const AttendeeAvatar: React.FC<{ attendance: any; size: number; ring?: boolean }> = ({
  attendance,
  size,
  ring = false,
}) => {
  const young = attendance.youngId || {};
  const initials = (young.fullName || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase())
    .join('');
  return (
    <span
      className={`block flex-shrink-0 rounded-full ${ring ? 'bg-[linear-gradient(135deg,#F9A23B,#DC3340,#8A1C45)] p-[3px]' : ''}`}
      style={{ width: size, height: size }}
    >
      <span
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-ink-800 font-display text-white"
        style={{ fontSize: Math.round(size * 0.32) }}
      >
        {young.profileImage ? (
          <img src={young.profileImage} alt="" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </span>
    </span>
  );
};

const QrIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="5" height="5" rx="1" />
    <rect x="16" y="3" width="5" height="5" rx="1" />
    <rect x="3" y="16" width="5" height="5" rx="1" />
    <path d="M21 16h-3a2 2 0 0 0-2 2v3M21 21v.01M12 7v3a2 2 0 0 1-2 2H7M3 12h.01M12 3h.01M12 16v.01M16 12h1M21 12v.01M12 21v-1" />
  </svg>
);

const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />
  </svg>
);

const ExpandIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);

const LinkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
    <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.5-1.5" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const WhatsappIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.44 1.32 4.94L2.05 22l5.29-1.38a9.87 9.87 0 0 0 4.7 1.2h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm0 18.06h-.01a8.16 8.16 0 0 1-4.16-1.14l-.3-.18-3.13.82.84-3.05-.2-.31a8.15 8.15 0 0 1-1.25-4.31c0-4.5 3.66-8.16 8.17-8.16 2.18 0 4.23.85 5.77 2.39a8.1 8.1 0 0 1 2.39 5.78c0 4.5-3.67 8.16-8.12 8.16Zm4.47-6.12c-.24-.12-1.45-.72-1.68-.8-.22-.08-.39-.12-.55.12-.16.24-.63.8-.78.97-.14.16-.29.18-.53.06-.24-.12-1.02-.38-1.95-1.21-.72-.64-1.2-1.44-1.35-1.68-.14-.24-.01-.37.11-.49.11-.11.24-.29.36-.43.12-.14.16-.24.24-.4.08-.16.04-.31-.02-.43-.06-.12-.55-1.32-.75-1.81-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.43.06-.65.31-.22.24-.86.84-.86 2.05s.88 2.38 1 2.54c.12.16 1.73 2.64 4.2 3.7.59.25 1.05.4 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.45-.59 1.66-1.17.2-.57.2-1.06.14-1.17-.06-.1-.22-.16-.46-.28Z" />
  </svg>
);

// Bonus de velocidad en tiempo real
const LiveBonusDisplay: React.FC<{
  maxBonus: number;
  bonusDecayMinutes: number;
  qrGeneratedAt: string | Date;
  variant: 'panel' | 'projector';
}> = ({ maxBonus, bonusDecayMinutes, qrGeneratedAt, variant }) => {
  const [currentBonus, setCurrentBonus] = useState(maxBonus);
  const [percent, setPercent] = useState(100);

  useEffect(() => {
    const updateBonus = () => {
      const now = new Date().getTime();
      const generatedTime = new Date(qrGeneratedAt).getTime();
      const elapsedMs = now - generatedTime;
      const decayDurationMs = bonusDecayMinutes * 60 * 1000;

      if (elapsedMs >= decayDurationMs) {
        setCurrentBonus(0);
        setPercent(0);
        return;
      }

      const remainingPercent = Math.max(
        0,
        Math.min(100, ((decayDurationMs - elapsedMs) / decayDurationMs) * 100)
      );
      setPercent(remainingPercent);
      setCurrentBonus(
        Math.max(0, Math.floor((remainingPercent / 100) * maxBonus))
      );
    };

    updateBonus();
    const interval = setInterval(updateBonus, 1000);
    return () => clearInterval(interval);
  }, [maxBonus, bonusDecayMinutes, qrGeneratedAt]);

  if (currentBonus < 1) {
    return null;
  }

  const bolt = (
    <svg
      className={`${variant === 'projector' ? 'h-10 w-10' : 'h-4 w-4'} flex-shrink-0 motion-safe:animate-pulse`}
      viewBox="0 0 24 24"
      fill="#FCD34D"
      stroke="#FCD34D"
      strokeWidth={1.2}
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ filter: 'drop-shadow(0 0 10px rgba(252,211,77,.7))' }}
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
  const bar = (
    <span className="block h-2 overflow-hidden rounded bg-white/10">
      <span
        className="block h-full rounded bg-[linear-gradient(90deg,#FDE68A,#F9A23B,#DC3340)] transition-[width] duration-1000"
        style={{ width: `${percent}%` }}
      />
    </span>
  );

  if (variant === 'panel') {
    return (
      <div className="flex flex-col gap-2.5 rounded-[18px] bg-ink-950 px-[18px] py-4 text-white">
        <span className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-bold">
            {bolt}
            Bonus activo
          </span>
          <motion.span
            key={currentBonus}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="font-display text-xl text-brand-amber"
          >
            +{currentBonus} pts
          </motion.span>
        </span>
        {bar}
        <span className="text-xs text-white/60">
          ¡Escanea rápido para obtenerlo! Baja con cada minuto.
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
      className="flex flex-col gap-2.5 rounded-3xl border-[1.5px] border-brand-amber/55 bg-[linear-gradient(135deg,rgba(249,162,59,.2),rgba(220,51,64,.12))] px-[22px] py-5"
    >
      <span className="flex items-center gap-3">
        {bolt}
        <span className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#FCD34D]">
            Bonus activo
          </span>
          <motion.span
            key={currentBonus}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="font-display text-[44px] font-bold leading-none"
          >
            +{currentBonus} pts
          </motion.span>
        </span>
      </span>
      {bar}
      <span className="text-sm text-white/80">¡Escanea rápido para obtenerlo!</span>
    </motion.div>
  );
};

export default QRGenerator;
