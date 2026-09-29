import React from 'react';
import ConfirmDangerModal from './ui/ConfirmDangerModal';

interface SeasonDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  seasonName: string;
  isActive?: boolean;
  loading?: boolean;
}

const SeasonDeleteConfirmModal: React.FC<SeasonDeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  seasonName,
  isActive = false,
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
    badge={isActive ? 'Esta temporada está ACTIVA actualmente' : undefined}
    warnings={[
      'Esta acción no se puede deshacer',
      'Se eliminarán todos los puntos de esta temporada de cada joven',
      'Se eliminarán todas las rachas de esta temporada',
      'Se eliminarán todas las asistencias registradas en esta temporada',
      'Se perderán todos los datos de la temporada permanentemente',
    ]}
    confirmLabel="Confirmar eliminación"
  />
);

export default SeasonDeleteConfirmModal;
