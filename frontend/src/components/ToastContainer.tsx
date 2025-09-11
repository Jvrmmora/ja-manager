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
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50"
          style={{ 
            bottom: `${16 + (index * 70)}px` // Stack toasts vertically
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
