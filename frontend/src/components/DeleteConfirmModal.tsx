import React from 'react';
import ConfirmDangerModal from './ui/ConfirmDangerModal';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  youngName: string;
  loading?: boolean;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  youngName,
  loading = false,
}) => (
  <ConfirmDangerModal
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    loading={loading}
    title="Confirmar eliminación"
    question="¿Estás seguro de que deseas eliminar a"
    subject={youngName}
    warnings={[
      'Esta acción no se puede deshacer',
      'Se eliminará toda la información del joven',
      'Se eliminará su foto de perfil si la tiene',
      'Se perderán todos sus datos permanentemente',
    ]}
    confirmLabel="Eliminar"
  />
);

export default DeleteConfirmModal;
