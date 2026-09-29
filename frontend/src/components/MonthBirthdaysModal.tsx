import React, { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import type { IYoung } from '../types';
import {
  formatBirthday,
  parseYYYYMMDD,
  getCurrentDateTimeColombia,
} from '../utils/dateUtils';
import BrandModalHeader from './ui/BrandModalHeader';
import { initialsOf } from './young/useYoungActions';
import ImageModal from './ImageModal';

interface MonthBirthdaysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Modal simplificado: muestra solo foto, nombre y fecha de cumpleaños
// Filtra por mes actual y solo grupo 1 (nivel 1)
const MonthBirthdaysModal: React.FC<MonthBirthdaysModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [birthdays, setBirthdays] = useState<IYoung[]>([]);
  const [imageModal, setImageModal] = useState<{
    open: boolean;
    url: string;
    name: string;
  }>({ open: false, url: '', name: '' });

  useEffect(() => {
    if (!isOpen) return;
    fetchBirthdays();
  }, [isOpen]);

  const fetchBirthdays = async () => {
    setLoading(true);
    setError('');
    try {
      // La API limita limit<=100, así que paginamos y acumulamos
      const perPage = 100;
      let page = 1;
      let hasNext = true;
      const all: IYoung[] = [];

      while (hasNext) {
        const response = await apiRequest(
          `young?page=${page}&limit=${perPage}&groups=1`
        );
        const json = await response.json();
        if (!response.ok || !json.success) {
          throw new Error(json.message || 'Error obteniendo jóvenes');
        }
        const chunk: IYoung[] = json.data?.data || [];
        all.push(...chunk);
        const pag = json.data?.pagination || {};
        hasNext = Boolean(pag.hasNextPage || pag.hasNext || false);
        page += 1;
        // Evitar loops infinitos en caso de datos corruptos
        if (page > 50) break;
      }

      const now = new Date();
      const month = now.getMonth();
      // Filtrar por mes de cumpleaños actual
      const filtered = all
        .filter(y => {
          if (!y.birthday) return false;
          try {
            let date: Date;
            if (
              typeof y.birthday === 'string' &&
              /^\d{4}-\d{2}-\d{2}/.test(y.birthday)
            ) {
              date = parseYYYYMMDD(y.birthday.split('T')[0]);
            } else {
              date = new Date(y.birthday);
            }
            return date.getMonth() === month;
          } catch {
            return false;
          }
        })
        // Ordenar por día
        .sort((a, b) => {
          const getDay = (d: Date | string): number => {
            let dt: Date;
            if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
              dt = parseYYYYMMDD(d.split('T')[0]);
            } else {
              dt = new Date(d);
            }
            return dt.getDate();
          };
          return getDay(a.birthday) - getDay(b.birthday);
        });

      setBirthdays(filtered);
    } catch (e: any) {
      setError(e.message || 'Error cargando cumpleaños');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(
    new Date()
  );
  const monthTitle = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const monthAbbr = monthName.slice(0, 3).toUpperCase();
  const today = getCurrentDateTimeColombia().getDate();

  const dayOf = (value: Date | string) =>
    (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)
      ? parseYYYYMMDD(value.split('T')[0] as string)
      : new Date(value)
    ).getDate();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0C0609]/75 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full sm:max-w-xl flex-col overflow-hidden rounded-t-[28px] sm:rounded-[30px] bg-white shadow-[0_60px_120px_-40px_rgba(0,0,0,0.8)] dark:bg-ink-900"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Cumpleaños de ${monthName}`}
      >
        <BrandModalHeader
          title={`Cumpleaños de ${monthTitle}`}
          subtitle={loading ? 'Cargando…' : `${birthdays.length} ${birthdays.length === 1 ? 'joven' : 'jóvenes'}`}
          icon={
            <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1M2 21h20M7 8v3M12 8v3M17 8v3M7 4h.01M12 4h.01M17 4h.01" />
            </svg>
          }
          iconTone="wine"
          onClose={onClose}
        />

        <div className="flex-1 overflow-y-auto px-3 py-2 sm:px-5">
          {loading && (
            <div className="py-10 text-center">
              <span className="mx-auto mb-4 block h-10 w-10 animate-spin rounded-full border-4 border-sand-200 border-t-brand-ember" />
              <p className="m-0 text-sm text-cocoa-500 dark:text-white/60">Cargando cumpleaños...</p>
            </div>
          )}
          {error && !loading && (
            <div className="py-6 text-center text-sm text-red-600 dark:text-red-400">{error}</div>
          )}
          {!loading && !error && birthdays.length === 0 && (
            <p className="m-0 py-10 text-center text-sm text-cocoa-500 dark:text-white/60">
              No hay cumpleaños este mes.
            </p>
          )}
          {!loading && !error && birthdays.length > 0 && (
            <ul className="m-0 list-none p-0">
              {birthdays.map(b => {
                const day = dayOf(b.birthday);
                const diff = day - today;
                const isToday = diff === 0;
                const past = diff < 0;
                return (
                  <li
                    key={b.id}
                    className="grid grid-cols-[52px_44px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border-b border-sand-100 px-1.5 py-3 last:border-b-0 hover:bg-cream dark:border-white/5 dark:hover:bg-white/[0.03]"
                  >
                    <span
                      className={`flex h-[50px] w-[50px] flex-col items-center justify-center rounded-[14px] leading-none ${
                        isToday
                          ? 'bg-ink-950 text-white dark:bg-white dark:text-ink-950'
                          : past
                            ? 'bg-[#F5EFEA] text-cocoa-400 dark:bg-white/5 dark:text-white/45'
                            : 'bg-sand-50 text-cocoa-900 dark:bg-white/5 dark:text-white'
                      }`}
                    >
                      <span className="font-display text-[19px] font-semibold">{day}</span>
                      <span className={`text-[9px] font-bold tracking-[0.1em] ${isToday ? 'text-brand-amber dark:text-brand-ember' : past ? '' : 'text-brand-deep dark:text-brand-amber'}`}>
                        {monthAbbr}
                      </span>
                    </span>
                    <button
                      type="button"
                      className={`h-11 w-11 rounded-full bg-[linear-gradient(135deg,#F9A23B,#DC3340,#8A1C45)] p-[2px] ${b.profileImage ? 'group/photo cursor-pointer' : 'cursor-default'}`}
                      onClick={() => {
                        if (b.profileImage) {
                          setImageModal({ open: true, url: b.profileImage, name: b.fullName });
                        }
                      }}
                      title={b.profileImage ? 'Ver foto en grande' : ''}
                      aria-label={b.profileImage ? `Ver foto de ${b.fullName}` : b.fullName}
                    >
                      <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-white bg-sand-100 text-cocoa-600 dark:bg-white/10 dark:text-white/85 text-xs font-bold dark:border-ink-900">
                        {b.profileImage ? (
                          <>
                            <img src={b.profileImage} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover/photo:scale-110" />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover/photo:bg-black/50 group-focus-visible/photo:bg-black/50">
                            <svg className="h-4 w-4 text-white opacity-0 transition-opacity duration-300 group-hover/photo:opacity-100 group-focus-visible/photo:opacity-100" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </span>
                          </>
                        ) : (
                          initialsOf(b.fullName)
                        )}
                      </span>
                    </button>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-bold text-cocoa-900 dark:text-white">{b.fullName}</span>
                      <span className="truncate text-xs text-cocoa-400 dark:text-white/55">
                        {formatBirthday(b.birthday)}
                      </span>
                    </span>
                    {isToday ? (
                      <span className="bg-fire inline-flex h-[26px] items-center rounded-full px-2.5 text-xs font-bold text-white">
                        ¡Hoy!
                      </span>
                    ) : (
                      <span className={`text-xs font-semibold ${past ? 'text-cocoa-400 dark:text-white/45' : 'text-brand-deep dark:text-brand-amber'}`}>
                        {past ? 'Ya pasó' : diff === 1 ? 'Mañana' : `En ${diff} días`}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center justify-between border-t border-sand-200 bg-cream px-5 py-3.5 text-xs text-cocoa-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/55">
          <span>Grupo 1 · toca una foto para ampliarla</span>
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-full bg-ink-950 px-4 text-[13px] font-semibold text-white dark:bg-white dark:text-ink-950"
          >
            Cerrar
          </button>
        </div>

        {imageModal.open && (
          <ImageModal
            isOpen={imageModal.open}
            onClose={() => setImageModal({ open: false, url: '', name: '' })}
            imageUrl={imageModal.url}
            altText={`Foto de perfil de ${imageModal.name}`}
          />
        )}
      </div>
    </div>
  );
};

export default MonthBirthdaysModal;
