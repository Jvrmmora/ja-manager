import React, { useState, useEffect } from 'react';
import type { IYoung } from '../types';
import BrandModalHeader, { headerActionCls } from './ui/BrandModalHeader';
import { getGroupColor, initialsOf } from './young/useYoungActions';
import BirthdayBoardFullscreen from './BirthdayBoardFullscreen';
import {
  getCurrentMonthColombia,
  getCurrentYearColombia,
  getCurrentDateTimeColombia,
  parseYYYYMMDD,
  formatBirthday,
} from '../utils/dateUtils';

interface BirthdayDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  youngList: IYoung[];
  onOpenStats?: () => void;
}

const BirthdayDashboard: React.FC<BirthdayDashboardProps> = ({
  isOpen,
  onClose,
  youngList,
  onOpenStats,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(
    getCurrentMonthColombia()
  );
  const [filteredYoung, setFilteredYoung] = useState<IYoung[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [showFullscreenBoard, setShowFullscreenBoard] = useState(false);

  const months = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  // Resetear filtro de grupos cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setSelectedGroups([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Filtrar jóvenes por mes de cumpleaños y grupo
      const filtered = youngList.filter(young => {
        try {
          // Filtro por mes de cumpleaños
          if (!young.birthday) return false;

          // Parsear fecha correctamente sin problemas de timezone
          const birthday =
            typeof young.birthday === 'string' &&
            /^\d{4}-\d{2}-\d{2}/.test(young.birthday)
              ? parseYYYYMMDD(young.birthday.split('T')[0])
              : new Date(young.birthday);

          const monthMatch = birthday.getMonth() === selectedMonth;

          // Filtro por grupo (si hay grupos seleccionados)
          let groupMatch = true;
          if (selectedGroups.length > 0) {
            groupMatch =
              young.group !== undefined &&
              selectedGroups.includes(young.group.toString());
          }

          return monthMatch && groupMatch;
        } catch (err) {
          console.error('Error filtering birthdays:', err);
          return false;
        }
      });

      // Ordenar por día de cumpleaños
      filtered.sort((a, b) => {
        const dayA =
          typeof a.birthday === 'string' &&
          /^\d{4}-\d{2}-\d{2}/.test(a.birthday)
            ? parseYYYYMMDD(a.birthday.split('T')[0]).getDate()
            : new Date(a.birthday).getDate();
        const dayB =
          typeof b.birthday === 'string' &&
          /^\d{4}-\d{2}-\d{2}/.test(b.birthday)
            ? parseYYYYMMDD(b.birthday.split('T')[0]).getDate()
            : new Date(b.birthday).getDate();
        return dayA - dayB;
      });

      setFilteredYoung(filtered);
    }
  }, [isOpen, selectedMonth, selectedGroups, youngList]);

  // Función para formatear el número de teléfono para WhatsApp
  const formatPhoneForWhatsApp = (phone: string) => {
    // Remover espacios, guiones y otros caracteres especiales
    let cleanPhone = phone.replace(/[\s-()]/g, '');

    // Si no empieza con +, agregar +57 (Colombia por defecto)
    if (!cleanPhone.startsWith('+')) {
      // Si empieza con 57, agregar el +
      if (cleanPhone.startsWith('57')) {
        cleanPhone = '+' + cleanPhone;
      } else {
        // Si es un número colombiano de 10 dígitos, agregar +57
        if (cleanPhone.length === 10) {
          cleanPhone = '+57' + cleanPhone;
        } else {
          cleanPhone = '+57' + cleanPhone;
        }
      }
    }

    return cleanPhone;
  };

  const openWhatsApp = (phone: string, name: string) => {
    const formattedPhone = formatPhoneForWhatsApp(phone);

    // Mensaje personalizado de cumpleaños - versión sin emojis problemáticos
    const message = `¡Feliz cumpleaños ${name}!

Desde el Ministerio Juvenil Modelia te enviamos un fuerte abrazo y nuestros mejores deseos en este día tan especial.

Que Dios siga guiando tu vida y llenándola de bendiciones.

¡Disfruta tu día al máximo! :)`;

    // Codificar el mensaje para URL
    const encodedMessage = encodeURIComponent(message);

    const url = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodedMessage}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showFullscreenBoard) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, showFullscreenBoard]);

  if (!isOpen) return null;

  const birthDate = (value: Date | string) =>
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)
      ? parseYYYYMMDD(value.split('T')[0] as string)
      : new Date(value);

  const todayColombia = getCurrentDateTimeColombia();
  const isCurrentMonth = selectedMonth === getCurrentMonthColombia();
  const monthAbbr = months[selectedMonth]?.slice(0, 3).toUpperCase();

  const toggleGroup = (g: string) =>
    setSelectedGroups(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    );

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0C0609]/75 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] sm:max-h-[90vh] w-full sm:max-w-3xl flex-col overflow-hidden rounded-t-[28px] sm:rounded-[30px] bg-white shadow-[0_60px_120px_-40px_rgba(0,0,0,0.8)] dark:bg-ink-900"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Cumpleaños de ${months[selectedMonth]}`}
      >
        <BrandModalHeader
          title={`Cumpleaños de ${months[selectedMonth]}`}
          subtitle={`${filteredYoung.length} ${filteredYoung.length === 1 ? 'joven' : 'jóvenes'}${
            selectedGroups.length > 0
              ? ` · ${selectedGroups.map(g => `Grupo ${g}`).join(', ')}`
              : ''
          }`}
          icon={<CakeIcon />}
          iconTone="wine"
          onClose={onClose}
          actions={
            <>
              {onOpenStats && (
                <button type="button" onClick={onOpenStats} className={headerActionCls} aria-label="Estadísticas">
                  <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 3v18h18M7 15l4-4 3 3 5-6" />
                  </svg>
                  <span className="hidden md:inline">Estadísticas</span>
                </button>
              )}
              <button type="button" onClick={() => setShowFullscreenBoard(true)} className={headerActionCls} aria-label="Pantalla completa">
                <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
                </svg>
                <span className="hidden md:inline">Pantalla completa</span>
              </button>
            </>
          }
        />

        {/* Filtros: mes y grupo */}
        <div className="flex flex-shrink-0 flex-col gap-3 border-b border-sand-200 px-5 py-4 sm:px-7 dark:border-white/10">
          <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-7 sm:px-7">
            {months.map((month, index) => (
              <button
                key={month}
                type="button"
                onClick={() => setSelectedMonth(index)}
                aria-pressed={selectedMonth === index}
                className={`relative h-9 flex-shrink-0 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
                  selectedMonth === index
                    ? 'border-ink-950 bg-ink-950 text-white dark:border-white dark:bg-white dark:text-ink-950'
                    : 'border-sand-300 bg-white text-cocoa-600 hover:border-cocoa-400 dark:border-white/15 dark:bg-transparent dark:text-white/75'
                }`}
              >
                {month.slice(0, 3)}
                {index === getCurrentMonthColombia() && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-brand-orange" />
                )}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-cocoa-400 dark:text-white/50">
              Grupos
            </span>
            <button
              type="button"
              onClick={() => setSelectedGroups([])}
              aria-pressed={selectedGroups.length === 0}
              className={`h-8 rounded-full border px-3 text-[13px] font-semibold ${
                selectedGroups.length === 0
                  ? 'border-brand-ember bg-sand-100 text-[#9A3412] dark:bg-brand-orange/15 dark:text-brand-amber'
                  : 'border-sand-300 text-cocoa-600 dark:border-white/15 dark:text-white/75'
              }`}
            >
              Todos
            </button>
            {['1', '2', '3', '4', '5'].map(g => {
              const on = selectedGroups.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGroup(g)}
                  aria-pressed={on}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold ${
                    on
                      ? 'border-brand-ember bg-sand-100 text-[#9A3412] dark:bg-brand-orange/15 dark:text-brand-amber'
                      : 'border-sand-300 text-cocoa-600 dark:border-white/15 dark:text-white/75'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getGroupColor(Number(g)) }} />
                  Grupo {g}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-3 py-2 sm:px-5">
          {filteredYoung.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F6E1E8] text-brand-wine dark:bg-brand-wine/25 dark:text-[#F4A3C0]">
                <CakeIcon />
              </span>
              <h3 className="m-0 font-display text-lg font-semibold uppercase text-cocoa-900 dark:text-white">
                No hay cumpleaños en {months[selectedMonth]}
              </h3>
              <p className="m-0 text-sm text-cocoa-500 dark:text-white/60">
                Selecciona otro mes para ver los cumpleaños programados.
              </p>
            </div>
          ) : (
            <ul className="m-0 list-none p-0">
              {filteredYoung.map(young => {
                const day = birthDate(young.birthday).getDate();
                const diff = isCurrentMonth ? day - todayColombia.getDate() : null;
                const isToday = diff === 0;
                const past = diff !== null && diff < 0;
                return (
                  <li
                    key={young.id}
                    className="grid grid-cols-[52px_44px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border-b border-sand-100 px-2 py-3 last:border-b-0 hover:bg-cream sm:grid-cols-[56px_48px_minmax(0,1fr)_auto] sm:gap-4 dark:border-white/5 dark:hover:bg-white/[0.03]"
                  >
                    <span
                      className={`flex h-[50px] w-[50px] flex-col items-center justify-center rounded-[15px] leading-none sm:h-[52px] sm:w-[52px] ${
                        isToday
                          ? 'bg-ink-950 text-white dark:bg-white dark:text-ink-950'
                          : past
                            ? 'bg-[#F5EFEA] text-cocoa-400 dark:bg-white/5 dark:text-white/45'
                            : 'bg-sand-50 text-cocoa-900 dark:bg-white/5 dark:text-white'
                      }`}
                    >
                      <span className="font-display text-xl font-semibold">{day}</span>
                      <span
                        className={`text-[9px] font-bold tracking-[0.1em] ${
                          isToday ? 'text-brand-amber dark:text-brand-ember' : past ? '' : 'text-brand-deep dark:text-brand-amber'
                        }`}
                      >
                        {monthAbbr}
                      </span>
                    </span>
                    <span className="h-11 w-11 rounded-full bg-[linear-gradient(135deg,#F9A23B,#DC3340,#8A1C45)] p-[2px] sm:h-12 sm:w-12">
                      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-white bg-sand-100 text-cocoa-600 dark:bg-white/10 dark:text-white/85 text-[13px] font-bold dark:border-ink-900">
                        {young.profileImage ? (
                          <img src={young.profileImage} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initialsOf(young.fullName)
                        )}
                      </span>
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-[15px] font-bold text-cocoa-900 dark:text-white">
                        {young.fullName}
                      </span>
                      <span className="truncate text-xs text-cocoa-400 dark:text-white/55">
                        {young.group ? `Grupo ${young.group} · ` : ''}cumple {getCurrentYearColombia() - birthDate(young.birthday).getFullYear()} años
                        <span className="hidden sm:inline"> · {formatBirthday(young.birthday)}</span>
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      {isToday ? (
                        <span className="bg-fire inline-flex h-7 items-center rounded-full px-3 text-xs font-bold text-white">
                          ¡Hoy!
                        </span>
                      ) : diff !== null ? (
                        <span className={`hidden text-[13px] font-semibold sm:inline ${past ? 'text-cocoa-400 dark:text-white/45' : 'text-brand-deep dark:text-brand-amber'}`}>
                          {past ? 'Ya pasó' : diff === 1 ? 'Mañana' : `En ${diff} días`}
                        </span>
                      ) : null}
                      {young.phone && young.phone.trim() && (
                        <button
                          type="button"
                          onClick={() => openWhatsApp(young.phone, young.fullName)}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white transition-transform hover:scale-105"
                          title="Enviar mensaje por WhatsApp"
                          aria-label={`Felicitar a ${young.fullName} por WhatsApp`}
                        >
                          <svg className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.525 3.488" />
                          </svg>
                        </button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-sand-200 bg-cream px-5 py-3.5 text-xs text-cocoa-500 sm:px-7 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/55">
          <span>
            Total de jóvenes: {youngList.length} · {months[selectedMonth]} {getCurrentYearColombia()}: {filteredYoung.length}
          </span>
        </div>
      </div>
    </div>
    {/* Fuera del overlay: si no, sus clics burbujean a onClose y cierran todo */}
    {showFullscreenBoard && (
      <BirthdayBoardFullscreen
        isOpen={showFullscreenBoard}
        onClose={() => setShowFullscreenBoard(false)}
        defaultGroup={Number(selectedGroups[0] ?? 1)}
      />
    )}
    </>
  );
};

const CakeIcon = () => (
  <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1M2 21h20M7 8v3M12 8v3M17 8v3M7 4h.01M12 4h.01M17 4h.01" />
  </svg>
);

export default BirthdayDashboard;
