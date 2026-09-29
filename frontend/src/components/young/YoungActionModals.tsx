import React from 'react';
import type { IYoung } from '../../types';
import ImageModal from '../ImageModal';
import GeneratePasswordModal from '../GeneratePasswordModal';
import DeleteConfirmModal from '../DeleteConfirmModal';
import PointsBreakdownModal from '../PointsBreakdownModal';
import AssignPointsModal from '../AssignPointsModal';
import WelcomeCard from '../WelcomeCard';
import ReferralShareModal from '../ReferralShareModal';
import type { YoungActions } from './useYoungActions';

interface YoungActionModalsProps {
  young: IYoung;
  actions: YoungActions;
  referralPoints: number;
  onShowSuccess?: ((message: string) => void) | undefined;
  onShowError?: ((message: string) => void) | undefined;
}

// Los modales de un joven (foto, contraseña, eliminar, puntos, bienvenida, invitar).
const YoungActionModals: React.FC<YoungActionModalsProps> = ({
  young,
  actions,
  referralPoints,
  onShowSuccess,
  onShowError,
}) => {
  const m = actions.modals;
  return (
    <>
      {young.profileImage && (
        <ImageModal
          isOpen={m.showImage}
          onClose={() => m.setShowImage(false)}
          imageUrl={young.profileImage}
          altText={`Foto de perfil de ${young.fullName}`}
        />
      )}

      <GeneratePasswordModal
        isOpen={m.showPassword}
        onClose={() => m.setShowPassword(false)}
        onSuccess={m.passwordGenerated}
        youngId={young.id || ''}
        youngName={young.fullName}
      />

      <DeleteConfirmModal
        isOpen={m.showDelete}
        onClose={() => m.setShowDelete(false)}
        onConfirm={m.confirmDelete}
        youngName={young.fullName}
        loading={m.isDeleting}
      />

      {m.showWelcome && young.placa && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0C0609]/75 backdrop-blur-sm p-4"
          onClick={() => m.setShowWelcome(false)}
        >
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => m.setShowWelcome(false)}
              aria-label="Cerrar"
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-ink-950/60 text-white hover:border-white/50"
            >
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <WelcomeCard young={young} />
          </div>
        </div>
      )}

      <PointsBreakdownModal
        young={young}
        isOpen={m.showPoints}
        onClose={() => m.setShowPoints(false)}
        isAdmin={actions.isAdmin}
        onAssignPoints={() => m.setShowAssignPoints(true)}
      />

      {onShowSuccess && onShowError && (
        <AssignPointsModal
          young={young}
          isOpen={m.showAssignPoints}
          onClose={() => m.setShowAssignPoints(false)}
          onSuccess={onShowSuccess}
          onError={onShowError}
        />
      )}

      {young.placa && (
        <ReferralShareModal
          isOpen={m.showReferral}
          onClose={() => m.setShowReferral(false)}
          userPlaca={young.placa}
          referralPoints={referralPoints}
        />
      )}
    </>
  );
};

export default YoungActionModals;
