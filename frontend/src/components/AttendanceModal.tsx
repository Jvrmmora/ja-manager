import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon, XCircleIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/solid';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  success: boolean;
  message: string;
  subtitle?: string | undefined;
  date?: string | undefined;
}

const AttendanceModal: React.FC<AttendanceModalProps> = ({
  isOpen,
  onClose,
  success,
  message,
  subtitle,
  date
}) => {
  React.useEffect(() => {
    if (isOpen) {
      // Auto-close después de 3 segundos
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />
        
        {/* Modal */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.7, opacity: 0, y: 20 }}
          className={`relative w-full max-w-sm mx-auto ${
            success 
              ? 'bg-emerald-500' 
              : 'bg-red-500'
          } rounded-2xl p-8 text-white text-center shadow-2xl`}
        >
          {/* Icono */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex justify-center mb-6"
          >
            <div className="relative">
              <DevicePhoneMobileIcon className="w-16 h-16 text-white" />
              <div className="absolute inset-0 flex items-center justify-center">
                {success ? (
                  <CheckCircleIcon className="w-8 h-8 text-white" />
                ) : (
                  <XCircleIcon className="w-8 h-8 text-white" />
                )}
              </div>
            </div>
          </motion.div>

          {/* Mensaje principal */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-bold mb-2"
          >
            {message}
          </motion.h2>

          {/* Subtítulo */}
          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-white/90 text-sm mb-2"
            >
              {subtitle}
            </motion.p>
          )}

          {/* Fecha */}
          {date && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-white/80 text-xs font-medium"
            >
              {date}
            </motion.p>
          )}

          {/* Barra de progreso para auto-close */}
          <motion.div
            className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-2xl"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 3, ease: "linear" }}
          />

          {/* Botón de cerrar */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors"
          >
            <XCircleIcon className="w-5 h-5" />
          </button>

          {/* Efecto de confeti para éxito */}
          {success && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="absolute inset-0 pointer-events-none"
            >
              {/* Partículas de confeti */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-white/50 rounded-full"
                  initial={{ 
                    x: "50%", 
                    y: "50%", 
                    scale: 0 
                  }}
                  animate={{
                    x: [
                      "50%",
                      `${50 + (Math.random() - 0.5) * 200}%`,
                      `${50 + (Math.random() - 0.5) * 300}%`
                    ],
                    y: [
                      "50%",
                      `${50 + (Math.random() - 0.5) * 200}%`,
                      "150%"
                    ],
                    scale: [0, 1, 0],
                    rotate: [0, 360, 720]
                  }}
                  transition={{
                    duration: 2,
                    delay: 0.6 + i * 0.1,
                    ease: "easeOut"
                  }}
                />
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AttendanceModal;