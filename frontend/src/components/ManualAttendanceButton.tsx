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
      className={`btn-fire relative h-12 px-6 text-sm disabled:cursor-not-allowed ${className}`}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      title={reasonDisabled}
    >
      <UserPlusIcon className="h-5 w-5" />
      <span>Registro manual</span>
    </motion.button>
  );
};

export default ManualAttendanceButton;
