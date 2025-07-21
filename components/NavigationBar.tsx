import React from 'react';

interface NavigationBarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onCancel?: () => void;
  showAdmin?: boolean;
  onAdmin?: () => void;
  children?: React.ReactNode;
}

const NavigationBar: React.FC<NavigationBarProps> = ({
  title,
  subtitle,
  onBack,
  onCancel,
  showAdmin = false,
  onAdmin,
  children
}) => {
  return (
    <div className="bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10 shadow-lg border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          {/* Left: Back button or Logo */}
          <div className="flex items-center gap-3">
            {onBack ? (
              <button
                onClick={onBack}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                title="Regresar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            ) : (
              <img 
                src="https://storage.googleapis.com/poker-enfermos/f1-logo.png" 
                alt="F1 Logo" 
                className="w-8 h-6 md:w-10 md:h-8 object-contain"
              />
            )}
            <div>
              <h1 className="text-lg md:text-xl font-bold text-white">{title}</h1>
              {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
            </div>
          </div>

          {/* Center: Custom content */}
          {children && (
            <div className="flex-1 flex justify-center">
              {children}
            </div>
          )}

          {/* Right: Action buttons */}
          <div className="flex items-center gap-2">
            {showAdmin && onAdmin && (
              <button
                onClick={onAdmin}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                title="Admin Panel"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
            {onCancel && (
              <button
                onClick={() => {
                  if (window.confirm('¿Estás seguro de que quieres cancelar? Se perderá el progreso.')) {
                    onCancel();
                  }
                }}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
                title="Cancelar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavigationBar;