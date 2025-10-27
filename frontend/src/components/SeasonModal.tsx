import React, { useState, useEffect } from 'react';
import { seasonService } from '../services/seasonService';
import type { ISeason, ISeasonCreate, ISeasonUpdate } from '../types';

interface SeasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  season?: ISeason | null; // Si existe, es edición
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const SeasonModal: React.FC<SeasonModalProps> = ({
  isOpen,
  onClose,
  season,
  onSuccess,
  onError,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    attendancePoints: 10,
    activityPoints: 10,
    referrerPoints: 30,
    referredPoints: 10,
  });
  const [loading, setLoading] = useState(false);

  const isEditing = !!season;

  useEffect(() => {
    if (isOpen && season) {
      // Cargar datos de la temporada para editar
      setFormData({
        name: season.name,
        description: season.description || '',
        startDate: formatDateForInput(season.startDate),
        endDate: formatDateForInput(season.endDate),
        attendancePoints: season.pointsSettings.attendancePoints,
        activityPoints: season.pointsSettings.activityPoints,
        referrerPoints: season.pointsSettings.referrerPoints,
        referredPoints: season.pointsSettings.referredPoints,
      });
    } else if (isOpen && !season) {
      // Reset para nueva temporada
      setFormData({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        attendancePoints: 10,
        activityPoints: 10,
        referrerPoints: 30,
        referredPoints: 10,
      });
    }
  }, [isOpen, season]);

  const formatDateForInput = (date: string | Date): string => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.name.trim()) {
      onError('El nombre de la temporada es obligatorio');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      onError('Las fechas de inicio y fin son obligatorias');
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      onError('La fecha de inicio debe ser anterior a la fecha de fin');
      return;
    }

    try {
      setLoading(true);

      if (isEditing && season?.id) {
        // Actualizar temporada existente
        const updateData: ISeasonUpdate = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          startDate: formData.startDate,
          endDate: formData.endDate,
          pointsSettings: {
            attendancePoints: formData.attendancePoints,
            activityPoints: formData.activityPoints,
            referrerPoints: formData.referrerPoints,
            referredPoints: formData.referredPoints,
          },
        };

        await seasonService.update(season.id, updateData);
        onSuccess('Temporada actualizada exitosamente');
      } else {
        // Crear nueva temporada
        const createData: ISeasonCreate = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          startDate: formData.startDate,
          endDate: formData.endDate,
          pointsSettings: {
            attendancePoints: formData.attendancePoints,
            activityPoints: formData.activityPoints,
            referrerPoints: formData.referrerPoints,
            referredPoints: formData.referredPoints,
          },
        };

        await seasonService.create(createData);
        onSuccess('Temporada creada exitosamente');
      }

      handleClose();
    } catch (err: any) {
      console.error('Error saving season:', err);
      onError(err.message || 'Error al guardar la temporada');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      attendancePoints: 10,
      activityPoints: 10,
      referrerPoints: 30,
      referredPoints: 10,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="material-symbols-rounded text-primary text-2xl">
              calendar_today
            </span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {isEditing ? 'Editar Temporada' : 'Nueva Temporada'}
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
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-5"
        >
          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-rounded text-primary">
                info
              </span>
              Información Básica
            </h3>

            {/* Nombre */}
            <div>
              <label className="form-label">
                Nombre de la Temporada <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="form-input"
                placeholder="Ej: Temporada Q1 2024"
                disabled={loading}
                required
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="form-label">Descripción</label>
              <textarea
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="form-input resize-none"
                rows={3}
                placeholder="Descripción opcional de la temporada"
                disabled={loading}
              />
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  Fecha de Inicio <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={e =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  className="form-input"
                  disabled={loading}
                  required
                />
              </div>
              <div>
                <label className="form-label">
                  Fecha de Fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={e =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  className="form-input"
                  disabled={loading}
                  required
                />
              </div>
            </div>
          </div>

          {/* Configuración de puntos */}
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-rounded text-amber-500">
                star
              </span>
              Configuración de Puntos
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Puntos por asistencia */}
              <div>
                <label className="form-label flex items-center gap-2">
                  <span className="material-symbols-rounded text-sm text-gray-500">
                    event_available
                  </span>
                  Puntos por Asistencia
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.attendancePoints}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      attendancePoints: parseInt(e.target.value) || 0,
                    })
                  }
                  className="form-input"
                  disabled={loading}
                  required
                />
              </div>

              {/* Puntos por actividad */}
              <div>
                <label className="form-label flex items-center gap-2">
                  <span className="material-symbols-rounded text-sm text-gray-500">
                    sports_score
                  </span>
                  Puntos por Actividad
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.activityPoints}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      activityPoints: parseInt(e.target.value) || 0,
                    })
                  }
                  className="form-input"
                  disabled={loading}
                  required
                />
              </div>

              {/* Puntos para referidor */}
              <div>
                <label className="form-label flex items-center gap-2">
                  <span className="material-symbols-rounded text-sm text-gray-500">
                    person_add
                  </span>
                  Puntos Referidor
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.referrerPoints}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      referrerPoints: parseInt(e.target.value) || 0,
                    })
                  }
                  className="form-input"
                  disabled={loading}
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Para quien invita a un nuevo joven
                </p>
              </div>

              {/* Puntos para referido */}
              <div>
                <label className="form-label flex items-center gap-2">
                  <span className="material-symbols-rounded text-sm text-gray-500">
                    how_to_reg
                  </span>
                  Puntos Referido
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.referredPoints}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      referredPoints: parseInt(e.target.value) || 0,
                    })
                  }
                  className="form-input"
                  disabled={loading}
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Bono de bienvenida para el referido
                </p>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 bg-primary hover:bg-primary-dark text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{isEditing ? 'Actualizando...' : 'Creando...'}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-rounded text-lg">
                    {isEditing ? 'edit' : 'add_circle'}
                  </span>
                  <span>{isEditing ? 'Actualizar' : 'Crear Temporada'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeasonModal;
