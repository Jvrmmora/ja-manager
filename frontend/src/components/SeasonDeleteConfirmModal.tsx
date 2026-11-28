import React from 'react';
import ConfirmDangerModal from './ui/ConfirmDangerModal';

interface SeasonDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  seasonName: string;
  loading?: boolean;
}

// Solo se pueden eliminar temporadas próximas sin datos
const SeasonDeleteConfirmModal: React.FC<SeasonDeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  seasonName,
  loading = false,
}) => (
  <ConfirmDangerModal
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    loading={loading}
    title="Eliminar temporada"
    question="¿Estás seguro de que deseas eliminar la temporada"
    subject={seasonName}
    warnings={[
      'Esta acción no se puede deshacer',
      'Solo se eliminan temporadas próximas que no tengan puntos ni rachas',
    ]}
    confirmLabel="Confirmar eliminación"
  />
);

export default SeasonDeleteConfirmModal;
