import React, { useState, useEffect } from 'react';
import type { IYoung } from '../types';
import MultiGroupSelect from './MultiGroupSelect';
import {
  getCurrentMonthColombia,
  getCurrentYearColombia,
  parseYYYYMMDD,
  formatBirthday,
} from '../utils/dateUtils';

interface BirthdayDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  youngList: IYoung[];
}

const BirthdayDashboard: React.FC<BirthdayDashboardProps> = ({
  isOpen,
  onClose,
  youngList,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(
    getCurrentMonthColombia()
  );
  const [filteredYoung, setFilteredYoung] = useState<IYoung[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

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

  const currentMonth = months[getCurrentMonthColombia()];

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

  const calculateAge = (birthday: Date | string) => {
    // Parsear fecha correctamente sin problemas de timezone
    const birth =
      typeof birthday === 'string' && /^\d{4}-\d{2}-\d{2}/.test(birthday)
        ? parseYYYYMMDD(birthday.split('T')[0])
        : new Date(birthday);

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    return age;
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 dark:from-violet-600 dark:to-fuchsia-600 text-white p-6 relative overflow-hidden">
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="material-symbols-rounded text-3xl">cake</span>
                Dashboard de Cumpleaños
              </h2>
              <p className="text-white/80 mt-1">
                Cumpleaños de este mes:{' '}
                <span className="font-semibold">{currentMonth}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-white/90 transition-colors p-2 bg-white/20 rounded-full"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] bg-white dark:bg-gray-800">
          {/* Selector de mes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Selecciona un mes para ver los cumpleaños:
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {months.map((month, index) => (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(index)}
                  className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedMonth === index
                      ? 'bg-indigo-600 text-white shadow-lg transform scale-105'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300'
                  }`}
                >
                  <span className="align-middle">{month}</span>
                  {index === getCurrentMonthColombia() && (
                    <span className="ml-1 text-xs align-middle material-symbols-rounded">
                      event
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro de grupos */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Filtrar por grupo:
            </label>
            <div className="flex flex-wrap gap-3">
              <MultiGroupSelect
                value={selectedGroups}
                onChange={setSelectedGroups}
              />
              {selectedGroups.length > 0 && (
                <button
                  onClick={() => setSelectedGroups([])}
                  className="px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 border border-indigo-300 dark:border-indigo-600 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-lg transition-colors"
                >
                  Limpiar filtro
                </button>
              )}
            </div>
          </div>

          {/* Estadísticas del mes */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-100 dark:from-violet-900/40 dark:to-fuchsia-900/30 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-indigo-800 dark:text-white">
                  {months[selectedMonth]} {getCurrentYearColombia()}
                </h3>
                <p className="text-indigo-700 dark:text-white/80">
                  {filteredYoung.length} cumpleaños este mes
                  {selectedGroups.length > 0 && (
                    <span className="text-indigo-600 dark:text-indigo-300 text-sm ml-2">
                      (Grupos:{' '}
                      {selectedGroups.map(g => `Nivel ${g}`).join(', ')})
                    </span>
                  )}
                </p>
              </div>
              <span className="material-symbols-rounded text-white/80 text-3xl bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full p-2">
                celebration
              </span>
            </div>
          </div>

          {/* Lista de cumpleañeros */}
          {filteredYoung.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-rounded text-6xl mb-4 text-indigo-500">
                cake
              </span>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay cumpleaños en {months[selectedMonth]}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Selecciona otro mes para ver los cumpleaños programados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredYoung.map(young => (
                <div
                  key={young.id}
                  className="bg-white dark:bg-gray-700 border border-indigo-200 dark:border-indigo-700 rounded-lg p-4 hover:shadow-lg transition-shadow duration-200"
                >
                  {/* Header de la tarjeta */}
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center overflow-hidden">
                      {young.profileImage ? (
                        <img
                          src={young.profileImage}
                          alt={young.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg
                          className="w-6 h-6 text-indigo-600 dark:text-indigo-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {young.fullName}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-white capitalize">
                        {young.role}
                      </p>
                    </div>
                    <span className="material-symbols-rounded text-xl text-indigo-500 dark:text-white">
                      cake
                    </span>
                  </div>

                  {/* Información de cumpleaños */}
                  <div className="bg-indigo-50 dark:bg-violet-900/30 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-indigo-800 dark:text-white flex items-center gap-1">
                          <span className="material-symbols-rounded text-base">
                            event
                          </span>
                          {formatBirthday(young.birthday)}
                        </p>
                        <p className="text-xs text-indigo-700 dark:text-indigo-200">
                          Cumple {calculateAge(young.birthday)} años
                        </p>
                      </div>
                      <div className="text-lg font-bold text-indigo-700 dark:text-white">
                        {(() => {
                          // Parsear la fecha evitando problemas de zona horaria
                          const birthdayStr = young.birthday.toString();
                          let d: Date;
                          if (birthdayStr.includes('T')) {
                            const dateParts = birthdayStr.split('T')[0];
                            d = new Date(dateParts + 'T12:00:00');
                          } else {
                            d = new Date(young.birthday);
                          }
                          return d.getDate();
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Información adicional */}
                  <div className="space-y-2 text-sm text-gray-600 dark:text-white">
                    <div className="flex items-center">
                      <span className="material-symbols-rounded text-base mr-2">
                        person
                      </span>
                      <span className="capitalize">{young.gender}</span>
                      <span className="mx-2">•</span>
                      <span>{young.ageRange} años</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <span className="material-symbols-rounded text-base mr-2">
                          phone_iphone
                        </span>
                        <span className="text-sm">
                          {young.phone || 'No registrado'}
                        </span>
                      </div>
                      {young.phone && young.phone.trim() && (
                        <button
                          onClick={() =>
                            openWhatsApp(young.phone, young.fullName)
                          }
                          className="ml-2 p-1 bg-green-500 hover:bg-green-600 rounded-full transition-colors duration-200 flex items-center justify-center"
                          title="Enviar mensaje por WhatsApp"
                        >
                          <svg
                            className="w-4 h-4 text-white"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.525 3.488" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center">
                      <span className="material-symbols-rounded text-base mr-2">
                        mail
                      </span>
                      <span className="truncate">{young.email}</span>
                    </div>
                  </div>

                  {/* Habilidades */}
                  {young.skills && young.skills.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-indigo-100 dark:border-indigo-800">
                      <div className="flex flex-wrap gap-1">
                        {young.skills.slice(0, 3).map((skill, index) => (
                          <span
                            key={index}
                            className="bg-indigo-100 dark:bg-violet-900/40 text-indigo-700 dark:text-white px-2 py-1 rounded-full text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                        {young.skills.length > 3 && (
                          <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full text-xs">
                            +{young.skills.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t dark:border-gray-600">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total de jóvenes: {youngList.length} | Cumpleaños en{' '}
              {months[selectedMonth]}: {filteredYoung.length}
            </p>
            <button
              onClick={onClose}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BirthdayDashboard;
