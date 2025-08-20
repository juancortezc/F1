import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = 'md' 
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const viewport = document.querySelector('meta[name=viewport]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }
    } else {
      document.body.style.overflow = 'unset';
      const viewport = document.querySelector('meta[name=viewport]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
      const viewport = document.querySelector('meta[name=viewport]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      }
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
      style={{
        touchAction: 'none',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
      onClick={onClose}
    >
      <div 
        className={`bg-zinc-900 border border-zinc-700 rounded-md p-6 w-full ${maxWidthClasses[maxWidth]} max-h-[90vh] overflow-y-auto`}
        style={{
          marginBottom: 'env(safe-area-inset-bottom)',
          marginTop: 'env(safe-area-inset-top)',
          WebkitOverflowScrolling: 'touch',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-100">{title}</h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-100 transition-colors duration-200 w-8 h-8 flex items-center justify-center rounded hover:bg-zinc-800 touch-target"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        )}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;