import React from 'react';
import Toast from './Toast';
import type { ToastData } from '../hooks/useToast';

interface ToastContainerProps {
  toasts: ToastData[];
  onRemoveToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemoveToast }) => {
  if (toasts.length === 0) return null;

  return (
    <>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          // z por encima de cualquier modal, panel o pantalla completa (hasta z-[9999])
          className="fixed bottom-4 left-1/2 z-[10000] -translate-x-1/2 transform"
          style={{
            // Apilados verticalmente, respetando el área segura del móvil
            bottom: `calc(${16 + index * 70}px + env(safe-area-inset-bottom))`,
          }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration || 3000}
            onClose={() => onRemoveToast(toast.id)}
          />
        </div>
      ))}
    </>
  );
};

export default ToastContainer;
