import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface FullscreenShowcaseProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

const FullscreenShowcase: React.FC<FullscreenShowcaseProps> = ({
  isOpen,
  onClose,
  title = 'Presentación',
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[120]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900" />
          {/* Accent blobs */}
          <motion.div
            className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-blue-400/20 blur-3xl"
            animate={{ y: [0, 12, 0] }}
            transition={{ repeat: Infinity, duration: 6 }}
          />
          <motion.div
            className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-fuchsia-400/20 blur-3xl"
            animate={{ y: [0, -12, 0] }}
            transition={{ repeat: Infinity, duration: 7 }}
          />

          {/* Content */}
          <motion.div
            className="relative h-full flex items-center justify-center p-6"
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 120, damping: 16 }}
          >
            <div className="w-full max-w-5xl">
              <div className="rounded-3xl shadow-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/60 dark:border-gray-700 overflow-hidden">
                <div className="px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-rounded text-2xl">
                      slideshow
                    </span>
                    <h2 className="text-xl font-bold">{title}</h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    aria-label="Cerrar"
                  >
                    <span className="material-symbols-rounded">close</span>
                  </button>
                </div>

                {/* Showcase body */}
                <div className="px-8 py-10">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow">
                      <span className="material-symbols-rounded">
                        military_tech
                      </span>
                      <span className="text-sm font-semibold">Top 3</span>
                    </div>
                    <h3 className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-white">
                      Líderes de la temporada
                    </h3>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">
                      Muestra tus logros en pantalla completa con un diseño
                      limpio y moderno.
                    </p>
                  </div>

                  {/* Simple animated placeholders */}
                  <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i, idx) => (
                      <motion.div
                        key={i}
                        className="rounded-2xl p-6 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 text-center"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 * idx }}
                      >
                        <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                          #{i}
                        </div>
                        <div className="mt-4 text-gray-900 dark:text-white font-semibold">
                          Participante {i}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-300">
                          Grupo 1
                        </div>
                        <div className="mt-2 text-lg font-bold text-amber-600 dark:text-amber-400">
                          {500 - i * 50} pts
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FullscreenShowcase;
