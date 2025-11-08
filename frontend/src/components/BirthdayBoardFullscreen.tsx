import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { apiRequest } from '../services/api';
import type { IYoung } from '../types';
import { formatBirthday, parseYYYYMMDD } from '../utils/dateUtils';
import ImageModal from './ImageModal';

interface BirthdayBoardFullscreenProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGroup?: number; // Grupo inicial (nivel)
  currentMonthOnly?: boolean; // Bloquear a mes actual (oculta selector)
  fixedGroup?: number; // Fijar grupo y ocultar selector
}

// Vista de "tarjeta" pantalla completa con selección de mes y grupo.
// Muestra solo: foto perfil, nombre y fecha (día y mes).
// Confetti periódico y título "Feliz Cumpleaños!!".
const BirthdayBoardFullscreen: React.FC<BirthdayBoardFullscreenProps> = ({
  isOpen,
  onClose,
  defaultGroup = 1,
  currentMonthOnly = false,
  fixedGroup,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [allYoung, setAllYoung] = useState<IYoung[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );
  const [selectedGroup, setSelectedGroup] = useState<number>(
    fixedGroup ?? defaultGroup
  );
  const [imageModal, setImageModal] = useState<{
    open: boolean;
    url: string;
    name: string;
  }>({ open: false, url: '', name: '' });
  const confettiIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  useEffect(() => {
    if (!isOpen) return;
    // Lock month to current if requested
    if (currentMonthOnly) {
      setSelectedMonth(new Date().getMonth());
    }
    // Lock group if fixed
    if (typeof fixedGroup === 'number') {
      setSelectedGroup(fixedGroup);
    }
    fetchGroupData(typeof fixedGroup === 'number' ? fixedGroup : selectedGroup);
    startConfettiLoop();
    return () => stopConfettiLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Refetch when group changes (if open)
  useEffect(() => {
    if (!isOpen) return;
    if (typeof fixedGroup === 'number') {
      // When fixed, refetch if prop changes
      fetchGroupData(fixedGroup);
    } else {
      fetchGroupData(selectedGroup);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup]);

  const fetchGroupData = async (group: number) => {
    setLoading(true);
    setError('');
    try {
      const perPage = 100; // backend limit
      let page = 1;
      let hasNext = true;
      const acc: IYoung[] = [];

      while (hasNext) {
        const response = await apiRequest(
          `young?page=${page}&limit=${perPage}&groups=${group}`
        );
        const json = await response.json();
        if (!response.ok || !json.success) {
          throw new Error(json.message || 'Error obteniendo jóvenes');
        }
        const chunk: IYoung[] = json.data?.data || [];
        acc.push(...chunk);
        const pag = json.data?.pagination || {};
        hasNext = Boolean(pag.hasNextPage || pag.hasNext || false);
        page += 1;
        if (page > 50) break; // safety
      }

      setAllYoung(acc);
    } catch (e: any) {
      setError(e.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const startConfettiLoop = () => {
    launchConfetti();
    confettiIntervalRef.current = setInterval(() => launchConfetti(), 9000);
  };

  const stopConfettiLoop = () => {
    if (confettiIntervalRef.current) {
      clearInterval(confettiIntervalRef.current);
      confettiIntervalRef.current = null;
    }
  };

  const launchConfetti = () => {
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { x: 0.5, y: 0.2 },
      colors: [
        '#FFB6C1',
        '#FFD700',
        '#FF69B4',
        '#FFA07A',
        '#87CEEB',
        '#DDA0DD',
      ],
      gravity: 0.6,
      scalar: 0.9,
      ticks: 250,
      startVelocity: 30,
      disableForReducedMotion: true,
    });
  };

  if (!isOpen) return null;

  const monthNames = [
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

  const filteredBirthdays = allYoung
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
        return date.getMonth() === selectedMonth;
      } catch {
        return false;
      }
    })
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

  return (
    <div className="fixed inset-0 z-[60] bg-gradient-to-br from-indigo-800 via-purple-800 to-fuchsia-700 dark:from-indigo-900 dark:via-purple-900 dark:to-fuchsia-900 text-white flex flex-col">
      {/* Header */}
      <div className="relative px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-rounded text-4xl">cake</span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Feliz Cumpleaños!!
            </h1>
            <p className="text-sm sm:text-base font-medium opacity-90">
              Mes: {monthNames[selectedMonth]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Selector de grupo (oculto si fixedGroup) */}
          {typeof fixedGroup !== 'number' && (
            <select
              value={selectedGroup}
              onChange={e => setSelectedGroup(Number(e.target.value))}
              className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
              title="Filtrar por grupo"
            >
              {[1, 2, 3, 4, 5].map(g => (
                <option key={g} value={g}>
                  Grupo {g}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            title="Cerrar"
          >
            <span className="material-symbols-rounded text-2xl">close</span>
          </button>
        </div>
      </div>

      {/* Meses (oculto si currentMonthOnly) */}
      {!currentMonthOnly && (
        <div className="px-6 pb-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
          {monthNames.map((m, idx) => {
            const active = idx === selectedMonth;
            return (
              <button
                key={m}
                onClick={() => setSelectedMonth(idx)}
                className={`relative px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 border border-white/20 ${active ? 'bg-white text-indigo-700 shadow-lg' : 'bg-white/10 hover:bg-white/20 text-white'}`}
              >
                {m}
                {active && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        {loading && (
          <div className="py-24 text-center">
            <div className="mx-auto mb-6 w-16 h-16 border-8 border-pink-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm opacity-80">Cargando cumpleaños...</p>
          </div>
        )}
        {error && !loading && (
          <div className="py-12 text-center text-red-200 font-medium">
            {error}
          </div>
        )}
        {!loading && !error && filteredBirthdays.length === 0 && (
          <div className="py-24 text-center flex flex-col items-center gap-4">
            <span className="material-symbols-rounded text-6xl opacity-50">
              cake
            </span>
            <p className="text-base font-medium">
              No hay cumpleaños en {monthNames[selectedMonth]} para este grupo.
            </p>
          </div>
        )}
        {!loading && !error && filteredBirthdays.length > 0 && (
          <div className="grid gap-4 sm:gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredBirthdays.map(y => {
              const dateDisplay = formatBirthday(y.birthday); // "19 de abril"
              // Obtener solo día para badge
              const dayNumber: number = (() => {
                let date: Date;
                if (
                  typeof y.birthday === 'string' &&
                  /^\d{4}-\d{2}-\d{2}/.test(y.birthday)
                ) {
                  date = parseYYYYMMDD(y.birthday.split('T')[0]);
                } else {
                  date = new Date(y.birthday);
                }
                return date.getDate();
              })();
              return (
                <div
                  key={y.id}
                  className="group relative rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-4 flex flex-col items-center text-center shadow-lg hover:bg-white/15 transition-colors"
                >
                  <div
                    className="w-20 h-20 rounded-full overflow-hidden mb-3 ring-2 ring-white/40 flex items-center justify-center bg-white/20 relative cursor-pointer"
                    onClick={() => {
                      if (y.profileImage) {
                        setImageModal({
                          open: true,
                          url: y.profileImage!,
                          name: y.fullName,
                        });
                      }
                    }}
                    title={y.profileImage ? 'Ver foto en grande' : ''}
                  >
                    {y.profileImage ? (
                      <img
                        src={y.profileImage}
                        alt={y.fullName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <span className="material-symbols-rounded text-4xl">
                        person
                      </span>
                    )}
                    {y.profileImage && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="material-symbols-rounded text-white text-2xl">
                          visibility
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base tracking-tight leading-snug line-clamp-2">
                    {y.fullName}
                  </h3>
                  <p className="text-xs sm:text-sm mt-1 font-medium opacity-90 flex items-center justify-center gap-1">
                    <span className="material-symbols-rounded text-sm sm:text-base">
                      event
                    </span>
                    {dateDisplay}
                  </p>
                  <div className="absolute top-2 left-2 w-9 h-9 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
                    {dayNumber}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-black/20 backdrop-blur-md flex items-center justify-between text-sm">
        <p className="opacity-80">
          {filteredBirthdays.length} cumpleaños en {monthNames[selectedMonth]}{' '}
          {typeof fixedGroup === 'number'
            ? `(Grupo ${fixedGroup})`
            : `(Grupo ${selectedGroup})`}
        </p>
        <button
          onClick={() => {
            // Refresco manual de datos del grupo actual
            fetchGroupData(
              typeof fixedGroup === 'number' ? fixedGroup : selectedGroup
            );
          }}
          className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors font-semibold"
        >
          Refrescar
        </button>
      </div>

      {/* Modal para ver foto en grande */}
      {imageModal.open && (
        <ImageModal
          isOpen={imageModal.open}
          onClose={() => setImageModal({ open: false, url: '', name: '' })}
          imageUrl={imageModal.url}
          altText={`Foto de perfil de ${imageModal.name}`}
        />
      )}
    </div>
  );
};

export default BirthdayBoardFullscreen;
