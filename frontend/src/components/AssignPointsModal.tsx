import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { pointsService } from '../services/pointsService';
import type { IYoung, TransactionType } from '../types';
import { POINTS_PRESETS } from '../constants/points';

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

    try {
      setLoading(true);
      await pointsService.assign({
        youngId: young.id,
        points,
        type,
        description: description.trim(),
      });

      onSuccess?.(
        `${points} puntos asignados exitosamente a ${young.fullName}`
      );
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
    setType('ACTIVITY');
    setPoints(10);
    setDescription('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
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

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              <option value="ATTENDANCE">Asistencia</option>
              <option value="REFERRER_BONUS">
                Bono Referido (quien refiere)
              </option>
              <option value="REFERRED_BONUS">Bono Referido (referido)</option>
            </select>
            <div className="mt-1 flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="material-symbols-rounded text-sm">
                {type === 'ACTIVITY'
                  ? 'sports_score'
                  : type === 'ATTENDANCE'
                    ? 'event_available'
                    : type === 'REFERRER_BONUS'
                      ? 'person_add'
                      : 'how_to_reg'}
              </span>
              <span>
                {type === 'ACTIVITY' &&
                  'Puntos por participar en actividades especiales'}
                {type === 'ATTENDANCE' &&
                  'Puntos por asistencia (normalmente asignados automáticamente)'}
                {type === 'REFERRER_BONUS' &&
                  'Puntos para quien invita a un nuevo joven'}
                {type === 'REFERRED_BONUS' &&
                  'Puntos de bienvenida para el joven referido'}
              </span>
            </div>
          </div>

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
                  {(type === 'REFERRER_BONUS' || type === 'REFERRED_BONUS') && (
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
          <div className="flex gap-3 pt-4">
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
