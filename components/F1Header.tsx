import React from 'react';
import { UserSession, Player } from '../types';
import UserAvatar from './UserAvatar';

interface F1HeaderProps {
  currentUser?: UserSession | null;
  currentPlayer?: Player | null;
  onLogout?: () => void;
  onCancelGame?: () => void;
  onAdminAccess?: () => void;
  hasActiveGame?: boolean | null;
  hasAdminPrivileges?: boolean;
}

const F1Header: React.FC<F1HeaderProps> = ({
  currentUser,
  currentPlayer,
  onLogout,
  onCancelGame,
  onAdminAccess,
  hasActiveGame = false,
  hasAdminPrivileges = false
}) => {
  return (
    <div 
      className="w-full border-b border-zinc-800 safe-top bg-f1-background z-navigation-bar"
      style={{ 
        background: 'linear-gradient(to bottom, #1A1A1A, #2A2A2A)',
        backdropFilter: 'blur(8px)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 safe-left safe-right">
        <div className="flex justify-between items-center">
          {/* Left - Logo and Title */}
          <div className="flex items-center gap-3">
            <img 
              src="https://www.formula1.com/etc/designs/fom-website/images/f1_logo.svg" 
              alt="F1 Logo" 
              className="w-8 h-6 md:w-10 md:h-8 object-contain"
            />
            <h1 className="text-lg md:text-xl font-bold text-white">F1 Night</h1>
          </div>

          {/* Right - Avatar and Admin Controls */}
          <div className="flex items-center gap-3">
            {/* Admin Access Button - For admins */}
            {hasAdminPrivileges && onAdminAccess && (
              <button
                onClick={onAdminAccess}
                className="p-2 text-zinc-400 hover:text-f1-red rounded-md transition-colors"
                title="PARC FERMÉ - Administración"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}

            {/* User Avatar */}
            {currentUser && onLogout && (
              <UserAvatar
                imageUrl={currentPlayer?.imageUrl}
                name={currentPlayer?.name || currentUser.name}
                className="w-8 h-8 md:w-10 md:h-10"
                onClick={() => {
                  if (window.confirm('¿Cerrar sesión?')) {
                    onLogout();
                  }
                }}
                title="Cerrar Sesión"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default F1Header;