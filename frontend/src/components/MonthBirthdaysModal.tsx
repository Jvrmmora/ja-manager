import React, { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import type { IYoung } from '../types';
import { formatBirthday, parseYYYYMMDD } from '../utils/dateUtils';
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-600 dark:from-violet-600 dark:via-fuchsia-600 dark:to-indigo-700 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-rounded text-2xl">cake</span>
              Jóvenes cumpleaños mes{' '}
              {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
            </h2>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              title="Cerrar"
            >
              <span className="material-symbols-rounded text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="py-10 text-center">
              <div className="mx-auto mb-4 w-10 h-10 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Cargando cumpleaños...
              </p>
            </div>
          )}
          {error && !loading && (
            <div className="py-6 text-center text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          {!loading && !error && birthdays.length === 0 && (
            <div className="py-10 text-center">
              <span className="material-symbols-rounded text-5xl text-purple-400 mb-3">
                cake
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                No hay cumpleaños este mes.
              </p>
            </div>
          )}
          {!loading && !error && birthdays.length > 0 && (
            <ul className="space-y-4">
              {birthdays.map(b => {
                // Determinar día
                const dateDisplay = formatBirthday(b.birthday);
                return (
                  <li
                    key={b.id}
                    className="flex items-center gap-4 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 border border-purple-100 dark:border-gray-700"
                  >
                    <div
                      className="w-14 h-14 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center relative cursor-pointer"
                      onClick={() => {
                        if (b.profileImage) {
                          setImageModal({
                            open: true,
                            url: b.profileImage!,
                            name: b.fullName,
                          });
                        }
                      }}
                      title={b.profileImage ? 'Ver foto en grande' : ''}
                    >
                      {b.profileImage ? (
                        <img
                          src={b.profileImage}
                          alt={b.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="material-symbols-rounded text-purple-500 dark:text-purple-300 text-3xl">
                          person
                        </span>
                      )}
                      {b.profileImage && (
                        <div className="absolute inset-0 bg-black/35 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="material-symbols-rounded text-white text-xl">
                            visibility
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {b.fullName}
                      </p>
                      <p className="text-sm text-purple-700 dark:text-purple-300 font-medium flex items-center gap-1">
                        <span className="material-symbols-rounded text-base">
                          event
                        </span>
                        {dateDisplay}
                      </p>
                    </div>
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-300">
                      {(() => {
                        let date: Date;
                        if (
                          typeof b.birthday === 'string' &&
                          /^\d{4}-\d{2}-\d{2}/.test(b.birthday)
                        ) {
                          date = parseYYYYMMDD(b.birthday.split('T')[0]);
                        } else {
                          date = new Date(b.birthday);
                        }
                        return date.getDate();
                      })()}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 flex justify-between items-center">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {birthdays.length} cumpleaños este mes
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
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
