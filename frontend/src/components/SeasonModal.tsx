import React, { useState, useEffect } from 'react';
import BrandModalHeader from './ui/BrandModalHeader';
import { seasonService } from '../services/seasonService';
import type { ISeason, ISeasonCreate, ISeasonUpdate } from '../types';

interface SeasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  season?: ISeason | null; // Si existe, es edición
  onSuccess: (message: string) => void | Promise<void>;
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
    referralBonusPoints: 30,
    referralWelcomePoints: 10,
    streakMinDays: 3,
    streakLostAfterDays: 2,
    birthdayBonusPoints: 100,
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
        attendancePoints: season.settings?.attendancePoints || 10,
        referralBonusPoints: season.settings?.referralBonusPoints || 30,
        referralWelcomePoints: season.settings?.referralWelcomePoints || 10,
        streakMinDays: season.settings?.streakMinDays || 3,
        streakLostAfterDays: season.settings?.streakLostAfterDays || 2,
        birthdayBonusPoints: season.settings?.birthdayBonusPoints || 100,
      });
    } else if (isOpen && !season) {
      // Reset para nueva temporada
      setFormData({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        attendancePoints: 10,
        referralBonusPoints: 30,
        referralWelcomePoints: 10,
        streakMinDays: 3,
        streakLostAfterDays: 2,
        birthdayBonusPoints: 100,
      });
    }
  }, [isOpen, season]);

  const formatDateForInput = (date: string | Date): string => {
    // Si ya es un string en formato YYYY-MM-DD, devolverlo directamente
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
      return date.split('T')[0];
    }

    // Si es una fecha, formatear correctamente sin conversión de zona horaria
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
          settings: {
            attendancePoints: formData.attendancePoints,
            referralBonusPoints: formData.referralBonusPoints,
            referralWelcomePoints: formData.referralWelcomePoints,
            streakMinDays: formData.streakMinDays,
            streakLostAfterDays: formData.streakLostAfterDays,
            birthdayBonusPoints: formData.birthdayBonusPoints,
          },
        };

        await seasonService.update(season.id, updateData);
        await onSuccess('Temporada actualizada exitosamente');
      } else {
        // Crear nueva temporada
        const createData: ISeasonCreate = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          startDate: formData.startDate,
          endDate: formData.endDate,
          settings: {
            attendancePoints: formData.attendancePoints,
            referralBonusPoints: formData.referralBonusPoints,
            referralWelcomePoints: formData.referralWelcomePoints,
            streakMinDays: formData.streakMinDays,
            streakLostAfterDays: formData.streakLostAfterDays,
            birthdayBonusPoints: formData.birthdayBonusPoints,
          },
        };

        await seasonService.create(createData);
        await onSuccess('Temporada creada exitosamente');
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
      referralBonusPoints: 30,
      referralWelcomePoints: 10,
      streakMinDays: 3,
      streakLostAfterDays: 2,
      birthdayBonusPoints: 100,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0C0609]/75 backdrop-blur-sm sm:p-4">
      <div
        className="flex max-h-[94vh] sm:max-h-[90vh] w-full sm:max-w-2xl flex-col overflow-hidden rounded-t-[28px] sm:rounded-[30px] bg-white shadow-2xl dark:bg-ink-900"
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? 'Editar temporada' : 'Nueva temporada'}
      >
        <BrandModalHeader
          title={isEditing ? 'Editar temporada' : 'Nueva temporada'}
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          }
          onClose={loading ? undefined : handleClose}
        />

        {/* Content */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-5"
        >
          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="eyebrow m-0 flex items-center gap-2 text-[13px] text-brand-deep dark:text-brand-amber">
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
            <h3 className="eyebrow m-0 flex items-center gap-2 text-[13px] text-brand-deep dark:text-brand-amber">
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

              {/* Puntos para referidor */}
              <div>
                <label className="form-label flex items-center gap-2">
                  <span className="material-symbols-rounded text-sm text-gray-500">
                    person_add
                  </span>
                  Puntos Referidor (Bonus)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.referralBonusPoints}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      referralBonusPoints: parseInt(e.target.value) || 0,
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
                  Puntos Referido (Bienvenida)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.referralWelcomePoints}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      referralWelcomePoints: parseInt(e.target.value) || 0,
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

              {/* Días mínimos para racha */}
              <div>
                <label className="form-label flex items-center gap-2">
                  <span className="material-symbols-rounded text-sm text-gray-500">
                    local_fire_department
                  </span>
                  Días Mínimos para Racha
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.streakMinDays}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      streakMinDays: parseInt(e.target.value) || 3,
                    })
                  }
                  className="form-input"
                  disabled={loading}
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Asistencias consecutivas necesarias
                </p>
              </div>

              {/* Días para perder racha */}
              <div>
                <label className="form-label flex items-center gap-2">
                  <span className="material-symbols-rounded text-sm text-gray-500">
                    highlight_off
                  </span>
                  Días para Perder Racha
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.streakLostAfterDays}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      streakLostAfterDays: parseInt(e.target.value) || 2,
                    })
                  }
                  className="form-input"
                  disabled={loading}
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Ausencias consecutivas que rompen la racha
                </p>
              </div>

              {/* Puntos por cumpleaños */}
              <div>
                <label className="form-label flex items-center gap-2">
                  <span className="material-symbols-rounded text-sm text-gray-500">
                    cake
                  </span>
                  Puntos por Cumpleaños
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.birthdayBonusPoints}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      birthdayBonusPoints: parseInt(e.target.value) || 100,
                    })
                  }
                  className="form-input"
                  disabled={loading}
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Puntos otorgados en el cumpleaños del joven
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
              className="h-12 flex-1 rounded-full border-[1.5px] border-sand-300 bg-white text-[15px] font-semibold text-cocoa-600 hover:border-cocoa-400 dark:border-white/15 dark:bg-transparent dark:text-white/80"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="btn-fire h-12 flex-1 text-[15px] disabled:cursor-not-allowed"
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
