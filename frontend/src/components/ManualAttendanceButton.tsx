import React from 'react';
import { motion } from 'framer-motion';
import { UserPlusIcon } from '@heroicons/react/24/outline';

interface ManualAttendanceButtonProps {
  onClick: () => void;
  disabled?: boolean;
  reasonDisabled?: string;
  className?: string;
}

const ManualAttendanceButton: React.FC<ManualAttendanceButtonProps> = ({
  onClick,
  disabled = false,
  reasonDisabled,
  className = '',
}) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`relative w-full px-5 py-4 rounded-xl font-semibold shadow-lg flex items-center justify-center gap-3 transition-all duration-300 text-white ${
        disabled
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600 hover:from-indigo-600 hover:to-blue-600'
      } ${className}`}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      title={reasonDisabled}
    >
      <motion.div
        animate={!disabled ? { rotate: [0, 5, -5, 0] } : {}}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <UserPlusIcon className="w-6 h-6" />
      </motion.div>
      <span className="text-sm font-bold tracking-wide">
        Registrar Asistencia Manual
      </span>
      {!disabled && (
        <motion.div
          className="absolute inset-0 rounded-xl border-2 border-white/20"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.button>
  );
};

export default ManualAttendanceButton;
