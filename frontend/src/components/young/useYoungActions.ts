import { useState } from 'react';
import type { IYoung } from '../../types';
import { generatePlaca } from '../../services/api';
import { authService } from '../../services/auth';

export interface YoungActionCallbacks {
  onDelete: (id: string) => void | Promise<void>;
  onEdit: (young: IYoung) => void;
  onYoungUpdate?: ((updatedYoung: IYoung) => void) | undefined;
  onShowSuccess?: ((message: string) => void) | undefined;
  onShowError?: ((message: string) => void) | undefined;
}

// Estado y acciones de un joven, compartidos por la tarjeta y la fila de la lista.
export const useYoungActions = (
  young: IYoung,
  { onDelete, onEdit, onYoungUpdate, onShowSuccess, onShowError }: YoungActionCallbacks
) => {
  const [showImage, setShowImage] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const [showAssignPoints, setShowAssignPoints] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [isGeneratingPlaca, setIsGeneratingPlaca] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentUser = authService.getUserInfo();
  const isAdmin = currentUser?.role_name === 'Super Admin';

  const confirmDelete = async () => {
    if (!young.id) return;
    setIsDeleting(true);
    try {
      // El padre (HomePage) maneja la eliminación completa y los toasts
      await onDelete(young.id);
      setShowDelete(false);
    } catch (error) {
      console.error('Error al eliminar joven:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const passwordGenerated = (newPassword: string) => {
    setShowPassword(false);
    onShowSuccess?.(
      `Nueva contraseña generada para ${young.fullName}: ${newPassword}`
    );
  };

  const createPlaca = async () => {
    if (!young.id) return;
    setIsGeneratingPlaca(true);
    try {
      const response = await generatePlaca(young.id);
      if (response.success && response.data) {
        onYoungUpdate?.({ ...young, placa: response.data.placa });
        onShowSuccess?.(`Placa generada exitosamente: ${response.data.placa}`);
      }
    } catch (error: any) {
      console.error('Error al generar placa:', error);
      onShowError?.(`Error al generar placa: ${error.message}`);
    } finally {
      setIsGeneratingPlaca(false);
    }
  };

  const copyPlaca = async () => {
    if (!young.placa) return;
    try {
      await navigator.clipboard.writeText(young.placa);
      onShowSuccess?.(`Placa copiada: ${young.placa}`);
    } catch (error) {
      console.error('Error al copiar placa:', error);
      onShowError?.('Error al copiar placa al portapapeles');
    }
  };

  return {
    isAdmin,
    edit: () => onEdit(young),
    openImage: () => young.profileImage && setShowImage(true),
    openPassword: () => setShowPassword(true),
    openDelete: () => setShowDelete(true),
    openPoints: () => setShowPoints(true),
    openAssignPoints: () => setShowAssignPoints(true),
    openWelcome: () => setShowWelcome(true),
    openReferral: () => setShowReferral(true),
    createPlaca,
    copyPlaca,
    isGeneratingPlaca,
    // Para YoungActionModals
    modals: {
      showImage,
      setShowImage,
      showPassword,
      setShowPassword,
      showDelete,
      setShowDelete,
      showPoints,
      setShowPoints,
      showAssignPoints,
      setShowAssignPoints,
      showWelcome,
      setShowWelcome,
      showReferral,
      setShowReferral,
      isDeleting,
      confirmDelete,
      passwordGenerated,
    },
  };
};

export type YoungActions = ReturnType<typeof useYoungActions>;

// Colores por grupo (se mantienen para que los admins los reconozcan)
export const getGroupColor = (group?: number | null): string => {
  switch (group) {
    case 1:
      return '#34C759';
    case 2:
      return '#FF9500';
    case 3:
      return '#FFCC00';
    case 4:
      return '#0EA5E9';
    case 5:
      return '#9CA3AF';
    default:
      return '#7C3AED';
  }
};

export const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('');

export const capitalizeRole = (role: string) =>
  role
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
