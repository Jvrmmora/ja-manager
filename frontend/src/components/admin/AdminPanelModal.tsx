import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import BrandModalHeader from '../ui/BrandModalHeader';

interface AdminPanelModalProps {
  title: string;
  subtitle?: React.ReactNode;
  icon: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
  actions?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}

const SIZES = { md: 'sm:max-w-3xl', lg: 'sm:max-w-5xl', xl: 'sm:max-w-6xl' };

// Marco común de las secciones del admin (QR, asistencias, temporadas, solicitudes, contactos).
// En móvil sube como hoja inferior.
const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  title,
  subtitle,
  icon,
  size = 'lg',
  actions,
  onClose,
  children,
}) => {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      // Un modal anidado puede llamar preventDefault() para no cerrar el panel
      if (e.key === 'Escape' && !e.defaultPrevented) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-[#0C0609]/75 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
        className={`flex max-h-[94vh] sm:max-h-[90vh] w-full ${SIZES[size]} flex-col overflow-hidden rounded-t-[28px] sm:rounded-[30px] bg-cream dark:bg-ink-900 shadow-[0_60px_120px_-40px_rgba(0,0,0,0.8)]`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <BrandModalHeader
          title={title}
          subtitle={subtitle}
          icon={icon}
          actions={actions}
          onClose={onClose}
        />
        <div className="flex-1 overflow-y-auto p-4 sm:p-7">{children}</div>
      </motion.div>
    </div>
  );
};

export default AdminPanelModal;
