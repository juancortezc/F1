import React from 'react';
import { UserSession } from '../types';

interface NavigationBarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onCancel?: () => void;
  showAdmin?: boolean;
  onAdmin?: () => void;
  currentUser?: UserSession | null;
  onLogout?: () => void;
  children?: React.ReactNode;
}

const NavigationBar: React.FC<NavigationBarProps> = ({
  title,
  subtitle,
  onBack,
  onCancel,
  currentUser,
  onLogout,
  children
}) => {
  return (
    <div className="bg-f1-black border-b border-subtle sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Left */}
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 text-secondary hover:text-primary rounded-md transition-colors"
                title="Regresar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-f1-lg font-bold text-primary">{title}</h1>
              {subtitle && <p className="text-f1-sm text-secondary">{subtitle}</p>}
            </div>
          </div>

          {/* Center */}
          {children && (
            <div className="flex-1 flex justify-center">
              {children}
            </div>
          )}

          {/* Right */}
          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                onClick={() => {
                  if (window.confirm('¿Cancelar y perder el progreso?')) {
                    onCancel();
                  }
                }}
                className="p-2 text-secondary hover:text-f1-red rounded-md transition-colors"
                title="Cancelar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {currentUser && onLogout && (
              <button
                onClick={() => {
                  if (window.confirm('¿Cerrar sesión?')) {
                    onLogout();
                  }
                }}
                className="p-2 text-secondary hover:text-f1-red rounded-md transition-colors"
                title="Cerrar Sesión"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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