import React, { useState } from 'react';
import type { IYoung } from '../types';
import ImageModal from './ImageModal';
import Tooltip from './Tooltip';
import GeneratePasswordModal from './GeneratePasswordModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import PointsCard from './PointsCard';
import PointsBreakdownModal from './PointsBreakdownModal';
import AssignPointsModal from './AssignPointsModal';
import { generatePlaca } from '../services/api';
import { authService } from '../services/auth';

// Mapeo de colores por grupo
const getGroupColor = (group?: number | null): string => {
  switch (group) {
    case 1:
      return '#34C759'; // green
    case 2:
      return '#FF9500'; // orange
    case 3:
      return '#FFCC00'; // yellow
    case 4:
      return '#0EA5E9'; // blue-ish
    case 5:
      return '#9CA3AF'; // gray
    default:
      return '#7C3AED'; // violet for unspecified
  }
};

interface YoungCardProps {
  young: IYoung;
  onDelete: (id: string) => void;
  onEdit: (young: IYoung) => void;
  onYoungUpdate?: (updatedYoung: IYoung) => void; // Callback para actualizar el joven
  onShowSuccess?: (message: string) => void; // Callback para mostrar toast de éxito
  onShowError?: (message: string) => void; // Callback para mostrar toast de error
}

const YoungCard: React.FC<YoungCardProps> = ({
  young,
  onDelete,
  onEdit,
  onYoungUpdate,
  onShowSuccess,
  onShowError,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingPlaca, setIsGeneratingPlaca] = useState(false);
  const [showGeneratePasswordModal, setShowGeneratePasswordModal] =
    useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [showAssignPointsModal, setShowAssignPointsModal] = useState(false);

  // Obtener información del usuario actual
  const currentUser = authService.getUserInfo();
  const isAdmin = currentUser?.role_name === 'Super Admin';

  // Función para abrir modal de confirmación de eliminación
  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  // Función para confirmar y ejecutar la eliminación
  const handleConfirmDelete = async () => {
    if (!young.id) return;

    setIsDeleting(true);
    try {
      // Llamar a la función onDelete del padre que maneja la eliminación completa
      await onDelete(young.id);
      setShowDeleteModal(false);
    } catch (error: any) {
      console.error('Error al eliminar joven:', error);
      // El error ya se maneja en el componente padre (HomePage)
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    onEdit(young);
  };

  const handleImageClick = () => {
    if (young.profileImage) {
      setIsModalOpen(true);
    }
  };

  // Función para abrir modal de generar contraseña
  const handleOpenGeneratePassword = () => {
    setShowGeneratePasswordModal(true);
  };

  // Función para manejar éxito de generación de contraseña
  const handlePasswordGenerated = (newPassword: string) => {
    setShowGeneratePasswordModal(false);
    onShowSuccess?.(
      `Nueva contraseña generada para ${young.fullName}: ${newPassword}`
    );
  };

  // Función para generar placa
  const handleGeneratePlaca = async () => {
    if (!young.id) return;

    setIsGeneratingPlaca(true);
    try {
      const response = await generatePlaca(young.id);

      if (response.success && response.data) {
        // Actualizar el joven con la nueva placa
        const updatedYoung = { ...young, placa: response.data.placa };
        if (onYoungUpdate) {
          onYoungUpdate(updatedYoung);
        }
        if (onShowSuccess) {
          onShowSuccess(`Placa generada exitosamente: ${response.data.placa}`);
        }
      }
    } catch (error: any) {
      console.error('Error al generar placa:', error);
      if (onShowError) {
        onShowError(`Error al generar placa: ${error.message}`);
      }
    } finally {
      setIsGeneratingPlaca(false);
    }
  };

  // Función para copiar placa al portapapeles
  const handleCopyPlaca = async (placa: string) => {
    try {
      await navigator.clipboard.writeText(placa);
      if (onShowSuccess) {
        onShowSuccess(`Placa copiada: ${placa}`);
      }
    } catch (error) {
      console.error('Error al copiar placa:', error);
      if (onShowError) {
        onShowError('Error al copiar placa al portapapeles');
      }
    }
  };

  const formatDate = (date: Date | string) => {
    // Si viene como string, parsearlo correctamente evitando problemas de zona horaria
    let d: Date;
    if (typeof date === 'string') {
      // Para fechas en formato YYYY-MM-DD, agregar la hora local para evitar problemas de zona horaria
      const dateParts = date.split('T')[0]; // Tomar solo la parte de fecha
      d = new Date(dateParts + 'T12:00:00'); // Agregar mediodía para evitar cambios de zona horaria
    } else {
      d = new Date(date);
    }

    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const capitalizeRole = (role: string) => {
    return role
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-xl transition-shadow">
      {/* Header con imagen de perfil */}
      <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 p-4 sm:p-6 text-white min-h-[120px] sm:min-h-[130px]">
        <div className="flex items-start justify-between gap-3 h-full">
          <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
            <div className="relative" style={{ width: 56, height: 56 }}>
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center ${
                  young.profileImage ? 'cursor-pointer' : ''
                } overflow-hidden group`}
                onClick={handleImageClick}
                style={{ width: 56, height: 56 }}
              >
                {young.profileImage ? (
                  <>
                    <img
                      src={young.profileImage}
                      alt={young.fullName}
                      className="w-full h-full object-cover rounded-full transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center rounded-full">
                      <svg
                        className="w-5 h-5 sm:w-6 sm:h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    </div>
                  </>
                ) : (
                  <svg
                    className="w-6 h-6 sm:w-8 sm:h-8 text-white"
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

              <div
                style={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  zIndex: 30,
                }}
              >
                <span
                  title={young.group ? `Grupo ${young.group}` : 'Sin grupo'}
                  className={`inline-block w-3 h-3 rounded-full border-2 border-white`}
                  style={{ backgroundColor: getGroupColor(young.group) }}
                />
              </div>
            </div>

            <div className="flex-1 min-w-0 pr-3">
              <h3
                className="text-lg sm:text-xl font-semibold text-white leading-tight break-words"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                  hyphens: 'auto',
                }}
                title={young.fullName}
              >
                {young.fullName}
              </h3>
              <p className="text-blue-100 text-sm sm:text-base truncate mt-1">
                {capitalizeRole(young.role)}
              </p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleEdit}
              className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors flex-shrink-0"
              title="Editar joven"
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors flex-shrink-0"
              title="Eliminar joven"
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Cuerpo con información */}
      <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        {/* Información básica */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400 font-medium">
              Edad:
            </span>
            <span className="ml-2 text-gray-800 dark:text-gray-200">
              {young.ageRange} años
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 font-medium">
              Género:
            </span>
            <span className="ml-2 text-gray-800 dark:text-gray-200 capitalize">
              {young.gender || 'No especificado'}
            </span>
          </div>
        </div>

        {/* Contacto */}
        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <svg
              className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            <span className="text-gray-800 dark:text-gray-200 truncate">
              {young.phone}
            </span>
          </div>

          <div className="flex items-center text-sm">
            <svg
              className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
              />
            </svg>
            <span className="text-gray-800 dark:text-gray-200 truncate">
              {young.email}
            </span>
          </div>

          <div className="flex items-center text-sm">
            <svg
              className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0l1 12a2 2 0 002 2h2a2 2 0 002-2l1-12m-6 0H6a2 2 0 00-2 2v0a2 2 0 002 2h1"
              />
            </svg>
            <span className="text-gray-800">{formatDate(young.birthday)}</span>
          </div>
        </div>

        {/* Habilidades */}
        <div>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-2">
            Habilidades:
          </span>
          <div className="flex flex-wrap gap-1 sm:gap-2">
            {young.skills && young.skills.length > 0 ? (
              young.skills.map((skill, index) => (
                <span
                  key={index}
                  className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full text-xs font-medium"
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full text-xs font-medium">
                Sin asignar
              </span>
            )}
          </div>
        </div>

        {/* Línea divisoria */}
        <div className="border-t border-gray-100 dark:border-gray-700"></div>

        {/* Puntos del joven */}
        {young.id && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Puntos:
            </span>
            <div className="flex items-center gap-2">
              <PointsCard
                youngId={young.id}
                onClick={() => setShowPointsModal(true)}
              />
              {/* Botón para asignar puntos (solo admins) */}
              {isAdmin && (
                <Tooltip content="Asignar puntos" position="left">
                  <button
                    onClick={() => setShowAssignPointsModal(true)}
                    className="p-2 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 rounded-lg transition-colors border border-amber-200 dark:border-amber-700"
                  >
                    <span className="material-symbols-rounded text-sm">
                      add_circle
                    </span>
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
        )}

        {/* Línea divisoria */}
        <div className="border-t border-gray-100 dark:border-gray-700"></div>

        {/* Placa */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Tu Placa:
          </span>

          <div className="flex items-center gap-2">
            {young.placa ? (
              <>
                <Tooltip content="Clic para copiar" position="top">
                  <button
                    onClick={() => handleCopyPlaca(young.placa!)}
                    className="bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-lg text-sm font-medium transition-colors cursor-pointer border border-blue-200 dark:border-blue-700"
                  >
                    {young.placa}
                  </button>
                </Tooltip>
                {/* Botón para generar nueva contraseña (solo admins) */}
                {isAdmin && (
                  <Tooltip content="Generar contraseña" position="left">
                    <button
                      onClick={handleOpenGeneratePassword}
                      className="bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-800 dark:text-green-300 px-2 py-1 rounded-lg text-sm font-medium transition-colors border border-green-200 dark:border-green-700"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </button>
                  </Tooltip>
                )}
              </>
            ) : (
              <Tooltip content="Generar placa" position="top">
                <button
                  onClick={handleGeneratePlaca}
                  disabled={isGeneratingPlaca}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    isGeneratingPlaca
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-700'
                  }`}
                >
                  {isGeneratingPlaca ? (
                    <>
                      <svg
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Generando...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      Sin placa
                    </>
                  )}
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Fecha de registro */}
        {/* Fecha de registro */}
        <div className="pt-2">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Registrado el {formatDate(young.createdAt || new Date())}
          </span>
        </div>
      </div>

      {/* Modal para mostrar imagen */}
      {young.profileImage && (
        <ImageModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          imageUrl={young.profileImage}
          altText={`Foto de perfil de ${young.fullName}`}
        />
      )}

      {/* Modal para generar nueva contraseña */}
      <GeneratePasswordModal
        isOpen={showGeneratePasswordModal}
        onClose={() => setShowGeneratePasswordModal(false)}
        onSuccess={handlePasswordGenerated}
        youngId={young.id || ''}
        youngName={young.fullName}
      />

      {/* Modal de confirmación para eliminar */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        youngName={young.fullName}
        loading={isDeleting}
      />

      {/* Modal de desglose de puntos */}
      <PointsBreakdownModal
        young={young}
        isOpen={showPointsModal}
        onClose={() => setShowPointsModal(false)}
      />

      {/* Modal para asignar puntos (admin) */}
      {onShowSuccess && onShowError && (
        <AssignPointsModal
          young={young}
          isOpen={showAssignPointsModal}
          onClose={() => setShowAssignPointsModal(false)}
          onSuccess={onShowSuccess}
          onError={onShowError}
        />
      )}
    </div>
  );
};

export default YoungCard;
