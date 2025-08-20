import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface LandingPageProps {
  onRoleSelect: (role: 'organizer' | 'player' | 'spectator') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onRoleSelect }) => {
  const [selectedRole, setSelectedRole] = useState<'organizer' | 'player' | 'spectator' | null>(null);

  const handleRoleSelect = (role: 'organizer' | 'player' | 'spectator') => {
    setSelectedRole(role);
    setTimeout(() => onRoleSelect(role), 100);
  };

  return (
    <div className="min-h-screen bg-f1-black flex items-center justify-center p-4">
      <div className="max-w-md mx-auto w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <img 
            src="https://www.formula1.com/etc/designs/fom-website/images/f1_logo.svg" 
            alt="F1" 
            className="h-20 mx-auto mb-4"
          />
          <h1 className="text-f1-3xl font-bold text-primary">
            F1 NIGHT
          </h1>
        </div>

        {/* Role Selection */}
        <div className="space-y-4">
          <button
            onClick={() => handleRoleSelect('player')}
            disabled={selectedRole === 'player'}
            className={`w-full touch-target surface-primary border-2 rounded-md font-bold text-f1-lg transition-all ${
              selectedRole === 'player' 
                ? 'border-f1-red text-f1-red' 
                : 'border-subtle text-primary hover:border-f1-red'
            } disabled:opacity-50`}
          >
            {selectedRole === 'player' ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" />
                Ingresando...
              </span>
            ) : (
              'JUGADOR'
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-subtle"></div>
            </div>
            <div className="relative flex justify-center text-f1-sm">
              <span className="px-2 bg-f1-black text-secondary">o</span>
            </div>
          </div>

          <button
            onClick={() => handleRoleSelect('organizer')}
            disabled={selectedRole === 'organizer'}
            className={`w-full touch-target surface-secondary border border-subtle rounded-md font-semibold text-f1-base transition-all ${
              selectedRole === 'organizer' 
                ? 'border-f1-red text-f1-red' 
                : 'text-secondary hover:text-primary hover:border-f1-border'
            } disabled:opacity-50`}
          >
            {selectedRole === 'organizer' ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" />
                Ingresando...
              </span>
            ) : (
              'Administrador'
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-subtle"></div>
            </div>
            <div className="relative flex justify-center text-f1-sm">
              <span className="px-2 bg-f1-black text-secondary">o</span>
            </div>
          </div>

          <button
            onClick={() => handleRoleSelect('spectator')}
            disabled={selectedRole === 'spectator'}
            className={`w-full touch-target surface-primary border border-subtle rounded-md font-semibold text-f1-base transition-all ${
              selectedRole === 'spectator' 
                ? 'border-f1-red text-f1-red' 
                : 'text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'
            } disabled:opacity-50`}
          >
            {selectedRole === 'spectator' ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" />
                Ingresando...
              </span>
            ) : (
              'ESPECTADOR'
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center text-f1-sm text-muted pt-8">
          <p>Creado por Black Mamba 2025</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;