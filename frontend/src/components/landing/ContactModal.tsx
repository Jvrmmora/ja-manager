import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { contactService } from '../../services/contactService';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_FORM = {
  fullName: '',
  email: '',
  message: '',
};

const VALIDATION_MESSAGES = {
  fullName: {
    required: 'El nombre es requerido',
    minLength: 'El nombre debe tener al menos 2 caracteres',
    maxLength: 'El nombre no puede exceder 100 caracteres',
  },
  email: {
    required: 'El correo es requerido',
    invalid: 'Ingresa un correo válido',
  },
  message: {
    required: 'El mensaje es requerido',
    minLength: 'El mensaje debe tener al menos 10 caracteres',
    maxLength: 'El mensaje no puede exceder 2000 caracteres',
  },
};

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose, submitting]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = (): string | null => {
    const { fullName, email, message } = formData;

    if (!fullName.trim()) {
      return VALIDATION_MESSAGES.fullName.required;
    }
    if (fullName.trim().length < 2) {
      return VALIDATION_MESSAGES.fullName.minLength;
    }
    if (fullName.length > 100) {
      return VALIDATION_MESSAGES.fullName.maxLength;
    }

    if (!email.trim()) {
      return VALIDATION_MESSAGES.email.required;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return VALIDATION_MESSAGES.email.invalid;
    }

    if (!message.trim()) {
      return VALIDATION_MESSAGES.message.required;
    }
    if (message.trim().length < 10) {
      return VALIDATION_MESSAGES.message.minLength;
    }
    if (message.length > 2000) {
      return VALIDATION_MESSAGES.message.maxLength;
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setSubmitting(false);
      return;
    }

    try {
      await contactService.submitContact(formData);
      setShowSuccessAnimation(true);
      setFormData(INITIAL_FORM);
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
        setShowSuccessAnimation(false);
      }, 2000);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo enviar tu mensaje'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && !showSuccessAnimation && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-[#0C0609]/75 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-xl overflow-hidden rounded-[28px] bg-white dark:bg-ink-900 shadow-[0_60px_120px_-40px_rgba(0,0,0,0.8)]"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-fire-bright flex items-center justify-between px-6 py-5 text-white">
                <h3 className="m-0 font-display text-2xl font-semibold uppercase text-white">
                  Contáctanos
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-950/25 text-white hover:bg-ink-950/40 transition"
                  aria-label="Cerrar modal de contacto"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <p className="text-sm text-cocoa-500 dark:text-white/70">
                  Envía tu mensaje y nuestro equipo te responderá pronto.
                </p>

                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-semibold text-cocoa-700 dark:text-white/85 mb-1.5"
                  >
                    Nombre
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="field-brand h-12"
                    placeholder="Tu nombre completo"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-cocoa-700 dark:text-white/85 mb-1.5"
                  >
                    Correo
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="text"
                    value={formData.email}
                    onChange={handleChange}
                    className="field-brand h-12"
                    placeholder="tunombre@correo.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-semibold text-cocoa-700 dark:text-white/85 mb-1.5"
                  >
                    Mensaje
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={5}
                    className="field-brand py-3 resize-y"
                    placeholder="Escribe aquí tu mensaje..."
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300 flex items-center gap-2 shadow-sm">
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="h-12 px-5 rounded-full border border-sand-300 text-cocoa-900 font-semibold hover:bg-sand-50 dark:border-white/20 dark:text-white dark:hover:bg-white/5 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-fire h-12 px-6 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Enviar mensaje
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}

      {showSuccessAnimation && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0C0609]/75 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.7, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm mx-auto bg-ink-950 border border-white/10 rounded-[28px] p-8 text-white text-center shadow-2xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="flex justify-center mb-6"
            >
              <CheckCircleIcon className="w-16 h-16 text-brand-amber" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="font-display text-3xl font-semibold uppercase mb-2"
            >
              ¡Gracias!
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-white/90 text-base"
            >
              Tu mensaje fue enviado correctamente. Nos pondremos en contacto pronto.
            </motion.p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
