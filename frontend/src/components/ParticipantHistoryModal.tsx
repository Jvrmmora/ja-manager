import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { pointsService } from '../services/pointsService';
import type {
  IPublicPointsHistory,
  IPublicPointsItem,
  PublicPointsType,
} from '../types';
import AvatarPhoto from './ui/AvatarPhoto';

interface ParticipantHistoryModalProps {
  youngId: string;
  youngName: string;
  profileImage?: string | undefined;
  seasonId?: string | undefined;
  isCurrentUser?: boolean;
  onClose: () => void;
}

const TYPE_INFO: Record<
  PublicPointsType,
  { label: string; icon: string; tone: string }
> = {
  ATTENDANCE: { label: 'Asistencias', icon: 'event_available', tone: 'bg-brand-amber/15 text-brand-amber' },
  BONUS: { label: 'Llama Violeta (racha)', icon: 'local_fire_department', tone: 'bg-violet-500/20 text-violet-200' },
  BIRTHDAY: { label: 'Cumpleaños', icon: 'cake', tone: 'bg-pink-500/15 text-pink-200' },
  REFERRAL_BONUS: { label: 'Invitar amigos', icon: 'person_add', tone: 'bg-emerald-500/15 text-emerald-200' },
  REFERRAL_WELCOME: { label: 'Bienvenida (llegó invitado)', icon: 'how_to_reg', tone: 'bg-emerald-500/15 text-emerald-200' },
  ACTIVITY: { label: 'Actividades especiales', icon: 'sports_score', tone: 'bg-sky-500/15 text-sky-200' },
  FORM_RESPONSE: { label: 'Formularios de eventos', icon: 'fact_check', tone: 'bg-brand-amber/15 text-brand-amber' },
};

const formatDay = (date: string) => {
  const text = new Date(date).toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// Explicación en lenguaje sencillo de cada movimiento de puntos.
const describeItem = (item: IPublicPointsItem): { title: string; detail: string } => {
  switch (item.type) {
    case 'ATTENDANCE': {
      if (item.speedBonus > 0) {
        return {
          title: 'Asistencia con QR',
          detail: `${item.basePoints} base + ⚡ ${item.speedBonus} por velocidad${
            item.minutesToScan !== null ? ` (escaneó en el minuto ${item.minutesToScan})` : ''
          }`,
        };
      }
      return {
        title: 'Asistencia con QR',
        detail:
          item.minutesToScan !== null && item.minutesToScan >= 30
            ? `${item.basePoints} base · escaneó a los ${item.minutesToScan} min, el bonus ⚡ ya había terminado`
            : `${item.basePoints} puntos base`,
      };
    }
    case 'BONUS':
      return {
        title: 'Llama Violeta',
        detail:
          item.description?.includes('Llama Violeta')
            ? 'Asistió 4 sábados de culto joven seguidos (se gana 1 vez por temporada)'
            : item.description || 'Bonus',
      };
    case 'BIRTHDAY':
      return { title: 'Cumpleaños', detail: 'Regalo de cumpleaños (1 vez al año)' };
    case 'REFERRAL_BONUS':
      return { title: 'Invitó a un amigo', detail: 'Un amigo se registró con su placa' };
    case 'REFERRAL_WELCOME':
      return { title: 'Bienvenida', detail: 'Se registró invitado por otro joven' };
    case 'ACTIVITY':
      return {
        title: 'Actividad especial',
        detail: `${item.description || 'Actividad'} · asignado por un líder`,
      };
    case 'FORM_RESPONSE':
      return {
        title: 'Respondió un formulario',
        detail: item.description?.replace(/^Formulario: /, '') || 'Confirmó su asistencia',
      };
    default:
      return { title: 'Puntos', detail: item.description || '' };
  }
};

// Historial de puntos de cualquier participante del ranking: muestra de dónde
// sale cada punto para que el ranking sea transparente para todos.
const ParticipantHistoryModal: React.FC<ParticipantHistoryModalProps> = ({
  youngId,
  youngName,
  profileImage,
  seasonId,
  isCurrentUser = false,
  onClose,
}) => {
  const [history, setHistory] = useState<IPublicPointsHistory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHistory(null);
    setError(null);
    pointsService
      .getPublicHistory(youngId, seasonId)
      .then(data => !cancelled && setHistory(data))
      .catch(err => !cancelled && setError(err instanceof Error ? err.message : 'No se pudo cargar el historial'));
    return () => {
      cancelled = true;
    };
  }, [youngId, seasonId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const breakdown = history
    ? (Object.entries(history.byType) as [PublicPointsType, number][])
        .filter(([, pts]) => pts > 0)
        .sort((a, b) => b[1] - a[1])
    : [];
  const maxPts = breakdown.length > 0 ? breakdown[0]![1] : 1;

  // Agrupar movimientos por día (zona horaria de Colombia)
  const groups: { day: string; items: IPublicPointsItem[] }[] = [];
  history?.items.forEach(item => {
    const day = formatDay(item.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(item);
    else groups.push({ day, items: [item] });
  });

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-[#0C0609]/80 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
        className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-ink-950 text-white shadow-[0_60px_120px_-40px_rgba(0,0,0,0.8)] sm:rounded-[28px]"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Historial de puntos de ${youngName}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <AvatarPhoto name={youngName} image={profileImage} className="h-11 w-11 border border-white/10 text-sm" />
            <div className="min-w-0">
              <h2 className="m-0 truncate font-display text-xl font-semibold uppercase leading-tight">
                {youngName}
                {isCurrentUser && (
                  <span className="ml-2 rounded-full bg-amber-400 px-1.5 py-0.5 align-middle font-sans text-[10px] font-extrabold text-gray-900">
                    TÚ
                  </span>
                )}
              </h2>
              <p className="m-0 text-[13px] text-white/55">
                Historial de puntos{history ? ` · ${history.season.name}` : ''}
              </p>
            </div>
          </div>
          <button
            aria-label="Cerrar historial"
            onClick={onClose}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 [scrollbar-color:rgba(255,255,255,0.2)_transparent]">
          {error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-300">
              {error}
            </div>
          ) : !history ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/15 border-t-brand-orange" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
                  <div className="font-display text-3xl font-bold leading-none text-brand-amber">{history.total}</div>
                  <div className="mt-1 text-[11px] text-white/55">puntos</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
                  <div className="font-display text-3xl font-bold leading-none">{history.attendanceCount}</div>
                  <div className="mt-1 text-[11px] text-white/55">asistencias</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
                  <div
                    className={`font-display text-3xl font-bold leading-none ${
                      history.streak.currentWeeks >= 4 ? 'text-violet-300' : ''
                    }`}
                  >
                    {history.streak.currentWeeks}
                  </div>
                  <div className="mt-1 text-[11px] text-white/55">sábados de racha</div>
                </div>
              </div>

              {breakdown.length > 0 && (
                <section>
                  <h3 className="m-0 mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-amber">
                    ¿De dónde salen sus puntos?
                  </h3>
                  <ul className="m-0 list-none space-y-2.5 p-0">
                    {breakdown.map(([type, pts]) => (
                      <li key={type}>
                        <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                          <span className="text-white/85">{TYPE_INFO[type]?.label ?? type}</span>
                          <span className="font-semibold text-white">
                            {pts} pts{' '}
                            <span className="text-xs font-normal text-white/45">
                              ({Math.round((pts / Math.max(history.total, 1)) * 100)}%)
                            </span>
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-brand-amber"
                            style={{ width: `${Math.max(2, (pts / maxPts) * 100)}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <h3 className="m-0 mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-amber">
                  Movimiento por movimiento
                </h3>
                {groups.length === 0 ? (
                  <p className="text-sm text-white/55">Aún no tiene puntos en esta temporada.</p>
                ) : (
                  <div className="space-y-4">
                    {groups.map(group => (
                      <div key={group.day}>
                        <div className="mb-1.5 text-xs font-semibold text-white/45">{group.day}</div>
                        <ul className="m-0 list-none space-y-1.5 p-0">
                          {group.items.map(item => {
                            const info = TYPE_INFO[item.type];
                            const { title, detail } = describeItem(item);
                            return (
                              <li
                                key={item.id}
                                className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5"
                              >
                                <span
                                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${info?.tone ?? 'bg-white/10 text-white'}`}
                                >
                                  <span className="material-symbols-rounded text-[20px]" aria-hidden="true">
                                    {info?.icon ?? 'star'}
                                  </span>
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-semibold text-white">{title}</span>
                                  <span className="block text-xs text-white/55">{detail}</span>
                                </span>
                                <span className="flex-shrink-0 font-display text-lg font-semibold text-brand-amber">
                                  +{item.points}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <p className="m-0 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-white/55">
                Los puntos se calculan solos con las mismas reglas para todos: asistencia con QR, bonus ⚡ por
                llegar temprano, Llama Violeta por 4 sábados seguidos, cumpleaños e invitados. Solo las
                “actividades especiales” las asigna un líder, y quedan aquí a la vista.
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default ParticipantHistoryModal;
