import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { pointsService } from '../services/pointsService';
import type { IYoung, TransactionType } from '../types';
import { POINTS_PRESETS } from '../constants/points';
import { apiRequest } from '../services/api';

interface AssignPointsModalProps {
  young: IYoung;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

const AssignPointsModal: React.FC<AssignPointsModalProps> = ({
  young,
  isOpen,
  onClose,
  onSuccess,
  onError,
}) => {
  const [type, setType] = useState<TransactionType>('ACTIVITY');
  const [points, setPoints] = useState<number>(10);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referredYoungId, setReferredYoungId] = useState<string>('');
  const [youngsList, setYoungsList] = useState<IYoung[]>([]);
  const [loadingYoungs, setLoadingYoungs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [selectedYoung, setSelectedYoung] = useState<IYoung | null>(null);
  const [assignBoth, setAssignBoth] = useState<boolean>(false);

  // Cerrar dropdown cuando se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.young-selector')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  // Buscar jóvenes cuando el usuario escribe (debounce)
  useEffect(() => {
    // Limpiar timeout anterior
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Si hay búsqueda, esperar 300ms antes de buscar
    if (searchQuery.trim().length >= 2) {
      const timeout = setTimeout(() => {
        searchYoungs(searchQuery);
      }, 300);
      setSearchTimeout(timeout);
    } else {
      // Limpiar resultados si la búsqueda es muy corta
      setYoungsList([]);
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchQuery]);

  const searchYoungs = async (query: string) => {
    try {
      setLoadingYoungs(true);
      const response = await apiRequest(
        `young?page=1&limit=50&search=${encodeURIComponent(query)}`
      );
      const data = await response.json();

      console.log('🔍 Search response:', data); // Debug

      if (data.success && data.data) {
        // El backend puede devolver:
        // 1) data.data como array directamente
        // 2) data.data como objeto con la lista en data.data.data (con paginación)
        const results = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.data?.data)
            ? data.data.data
            : [];
        setYoungsList(results);
        setShowDropdown(true); // Asegurar que el dropdown se muestre
      } else {
        console.log('❌ No data in response'); // Debug
        setYoungsList([]);
        setShowDropdown(true); // Mostrar dropdown incluso sin resultados
      }
    } catch (error) {
      console.error('Error loading youngs:', error);
      setYoungsList([]);
      setShowDropdown(true);
    } finally {
      setLoadingYoungs(false);
    }
  }; // Filtrar solo para no mostrar al mismo joven
  const filteredYoungs = Array.isArray(youngsList)
    ? youngsList.filter(y => y.id !== young.id)
    : [];

  // Seleccionar un joven
  const handleSelectYoung = (youngEntity: IYoung) => {
    if (!youngEntity?.id) return;
    setReferredYoungId(youngEntity.id);
    setSelectedYoung(youngEntity);
    setShowDropdown(false);
    setSearchQuery('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Limpiar errores previos

    if (!young.id) {
      const errorMsg = 'ID de joven no válido';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (points < 1) {
      const errorMsg = 'Los puntos deben ser mayores a 0';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (!description.trim()) {
      const errorMsg = 'La descripción es obligatoria';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // Validación especial para ATTENDANCE
    if (type === 'ATTENDANCE') {
      const errorMsg =
        'Los puntos por asistencia se asignan automáticamente al escanear el QR. Use otro tipo de puntos para asignación manual.';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // Validación para tipos que requieren joven referido
    if (type === 'REFERRAL' && !referredYoungId) {
      const errorMsg = 'Debe seleccionar el joven referido';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    try {
      setLoading(true);
      const trimmedDescription = description.trim();

      const makeRequest = async (
        targetYoungId: string,
        theType: TransactionType,
        theReferredId?: string
      ) => {
        const payload: any = {
          youngId: targetYoungId,
          points,
          type: theType,
          description: trimmedDescription,
        };
        if (theType === 'REFERRAL_BONUS' || theType === 'REFERRAL_WELCOME') {
          payload.referredYoungId = theReferredId;
        }
        await pointsService.assign(payload);
      };

      if (type === 'REFERRAL') {
        const selectedId = selectedYoung?.id || referredYoungId;
        if (!selectedId) {
          throw new Error('Debe seleccionar el joven referido');
        }

        if (assignBoth) {
          await makeRequest(young.id!, 'REFERRAL_BONUS', selectedId);
          await makeRequest(selectedId, 'REFERRAL_WELCOME', young.id!);
          onSuccess?.(
            `${points} pts a ${young.fullName} (bono) y a ${selectedYoung?.fullName || 'referido'} (bienvenida)`
          );
          // Notificar actualización de puntos para ambos
          window.dispatchEvent(
            new CustomEvent('points:updated', {
              detail: {
                youngId: young.id,
                delta: points,
                type: 'REFERRAL_BONUS',
                description: trimmedDescription,
              },
            })
          );
          window.dispatchEvent(
            new CustomEvent('points:updated', {
              detail: {
                youngId: selectedId,
                delta: points,
                type: 'REFERRAL_WELCOME',
                description: trimmedDescription,
              },
            })
          );
        } else {
          await makeRequest(young.id!, 'REFERRAL_BONUS', selectedId);
          onSuccess?.(`${points} pts de bono asignados a ${young.fullName}`);
          window.dispatchEvent(
            new CustomEvent('points:updated', {
              detail: {
                youngId: young.id,
                delta: points,
                type: 'REFERRAL_BONUS',
                description: trimmedDescription,
              },
            })
          );
        }
      } else {
        await makeRequest(young.id!, type);
        onSuccess?.(
          `${points} puntos asignados exitosamente a ${young.fullName}`
        );
        window.dispatchEvent(
          new CustomEvent('points:updated', {
            detail: {
              youngId: young.id,
              delta: points,
              type,
              description: trimmedDescription,
            },
          })
        );
      }
      handleClose();
    } catch (error: any) {
      console.error('Error assigning points:', error);
      const errorMsg = error.message || 'Error al asignar puntos';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Limpiar timeout de búsqueda
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }

    setType('ACTIVITY');
    setPoints(10);
    setDescription('');
    setReferredYoungId('');
    setSearchQuery('');
    setShowDropdown(false);
    setYoungsList([]);
    setSelectedYoung(null);
    setAssignBoth(false);
    setError(null);
    onClose();
  };

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      // Guardar el overflow original
      const originalOverflow = document.body.style.overflow;
      // Bloquear el scroll del body
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restaurar el overflow original al cerrar
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-rounded text-amber-500 text-2xl">
              add_circle
            </span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Asignar Puntos
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            disabled={loading}
          >
            <span className="material-symbols-rounded text-gray-500 dark:text-gray-400">
              close
            </span>
          </button>
        </div>

        {/* Content - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-rounded text-red-500 text-xl flex-shrink-0">
                  error
                </span>
                <div className="flex-1">
                  <h4 className="font-semibold text-red-800 dark:text-red-300 mb-1">
                    Error al asignar puntos
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {error}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
                >
                  <span className="material-symbols-rounded text-lg">
                    close
                  </span>
                </button>
              </div>
            </div>
          )}

          {(type === 'REFERRAL_BONUS' || type === 'REFERRAL_WELCOME') && (
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={assignBoth}
                onChange={e => setAssignBoth(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
                disabled={loading}
              />
              Asignar ambos (quien refiere y referido)
            </label>
          )}

          {/* Joven info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            {young.profileImage ? (
              <img
                src={young.profileImage}
                alt={young.fullName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                {young.fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {young.fullName}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {young.role}
              </div>
            </div>
          </div>

          {/* Tipo de puntos */}
          <div>
            <label className="form-label">Tipo de Puntos</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as TransactionType)}
              className="form-input"
              disabled={loading}
            >
              <option value="ACTIVITY">Actividad</option>
              <option value="REFERRAL">Bono Referido</option>
            </select>
            <div className="mt-1 flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="material-symbols-rounded text-sm">
                {type === 'ACTIVITY'
                  ? 'sports_score'
                  : type === 'ATTENDANCE'
                    ? 'event_available'
                    : type === 'REFERRAL' || type === 'REFERRAL_BONUS'
                      ? 'person_add'
                      : 'how_to_reg'}
              </span>
              <span>
                {type === 'ACTIVITY' &&
                  'Puntos por participar en actividades especiales'}
                {type === 'ATTENDANCE' &&
                  'Puntos por asistencia (asignados automáticamente vía QR)'}
                {type === 'REFERRAL' &&
                  'Puntos por referidos (puedes asignar a ambos o solo al que refiere)'}
              </span>
            </div>
          </div>

          {/* Selector de Joven Referido - Solo para bonos de referidos */}
          {type === 'REFERRAL' && (
            <div className="relative young-selector">
              <label className="form-label">
                Joven Referido <span className="text-red-500">*</span>
              </label>

              {/* Input de búsqueda / Joven seleccionado */}
              <div className="relative">
                {selectedYoung ? (
                  /* Mostrar joven seleccionado */
                  <div className="form-input flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {selectedYoung.profileImage ? (
                        <img
                          src={selectedYoung.profileImage}
                          alt={selectedYoung.fullName}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {selectedYoung.fullName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {selectedYoung.fullName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setReferredYoungId('');
                        setSearchQuery('');
                        setSelectedYoung(null);
                        setShowDropdown(true);
                      }}
                      className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                      disabled={loading}
                    >
                      <span className="material-symbols-rounded text-gray-500 dark:text-gray-400 text-lg">
                        close
                      </span>
                    </button>
                  </div>
                ) : (
                  /* Input de búsqueda */
                  <div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder={
                        loadingYoungs
                          ? 'Buscando...'
                          : 'Escribe para buscar joven (mín. 2 caracteres)...'
                      }
                      className="form-input pr-10"
                      disabled={loading || loadingYoungs}
                    />
                    {loadingYoungs ? (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <span className="material-symbols-rounded absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        search
                      </span>
                    )}
                  </div>
                )}

                {/* Dropdown de resultados */}
                {showDropdown && !selectedYoung && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {loadingYoungs ? (
                      <div className="px-3 py-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Buscando...
                        </p>
                      </div>
                    ) : filteredYoungs.length > 0 ? (
                      <div className="py-1">
                        {filteredYoungs.slice(0, 50).map(youngItem => (
                          <button
                            key={youngItem.id}
                            type="button"
                            onClick={() => handleSelectYoung(youngItem)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                          >
                            {youngItem.profileImage ? (
                              <img
                                src={youngItem.profileImage}
                                alt={youngItem.fullName}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {youngItem.fullName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {youngItem.fullName}
                              </div>
                              {youngItem.role && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {youngItem.role}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                        {filteredYoungs.length > 50 && (
                          <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 text-center border-t border-gray-200 dark:border-gray-700">
                            Mostrando primeros 50 resultados. Refina tu
                            búsqueda.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                        {searchQuery.trim().length < 2 ? (
                          <>
                            <span className="material-symbols-rounded text-4xl mb-2 block">
                              search
                            </span>
                            <p className="text-sm">
                              Escribe al menos 2 caracteres para buscar
                            </p>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-rounded text-4xl mb-2 block">
                              search_off
                            </span>
                            <p className="text-sm">
                              No se encontraron jóvenes con "{searchQuery}"
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Opción asignar ambos - debajo del input */}
              <label className="mt-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={assignBoth}
                  onChange={e => setAssignBoth(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                  disabled={loading}
                />
                Asignar ambos (quien refiere y referido)
              </label>

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Selecciona a quién refirió este joven
              </p>
            </div>
          )}

          {/* Cantidad de puntos */}
          <div>
            <label className="form-label">Cantidad de Puntos</label>

            {/* Pills Grid */}
            <div className="grid grid-cols-5 gap-2 mt-2">
              {POINTS_PRESETS.map(value => (
                <motion.button
                  key={value}
                  type="button"
                  onClick={() => setPoints(value)}
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.05 }}
                  whileTap={{ scale: loading ? 1 : 0.95 }}
                  className={`
                    relative px-3 py-2.5 rounded-lg font-semibold text-sm
                    transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                    ${
                      points === value
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-800'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  {points === value && (
                    <motion.div
                      layoutId="selectedPill"
                      className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg"
                      transition={{
                        type: 'spring',
                        bounce: 0.2,
                        duration: 0.6,
                      }}
                    />
                  )}
                  <span className="relative z-10">{value}</span>
                </motion.button>
              ))}
            </div>

            {/* Sugerencias según el tipo */}
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="material-symbols-rounded text-blue-500 text-sm mt-0.5">
                  info
                </span>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  <p className="font-semibold mb-1">Valores recomendados:</p>
                  {type === 'ACTIVITY' && (
                    <ul className="space-y-0.5">
                      <li>
                        • <strong>10 pts</strong>: Participación (fogatas,
                        salidas, ideas)
                      </li>
                      <li>
                        • <strong>20 pts</strong>: Liderazgo activo
                      </li>
                      <li>
                        • <strong>30 pts</strong>: Liderazgo en eventos
                        importantes
                      </li>
                    </ul>
                  )}
                  {type === 'ATTENDANCE' && (
                    <ul className="space-y-0.5">
                      <li>
                        • <strong>10 pts</strong>: Asistencia regular (QR
                        estándar)
                      </li>
                      <li>
                        • <strong>20 pts</strong>: Evento especial
                      </li>
                      <li>
                        • <strong>30 pts</strong>: Evento excepcional
                        (campamento)
                      </li>
                    </ul>
                  )}
                  {type === 'REFERRAL' && (
                    <ul className="space-y-0.5">
                      <li>
                        • <strong>70 pts</strong>: Invitar a un amigo (mayor
                        incentivo)
                      </li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="form-label">
              Descripción <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="form-input resize-none"
              rows={3}
              placeholder="Ej: Participación en retiro espiritual del 15 de octubre"
              disabled={loading}
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Explica por qué se asignan estos puntos
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 pb-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary-dark text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Asignando...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-rounded text-lg">send</span>
                  <span>Asignar Puntos</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignPointsModal;
