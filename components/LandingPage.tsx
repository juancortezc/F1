import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface LandingPageProps {
  onRoleSelect: (role: 'organizer' | 'player' | 'spectator' | 'guest') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onRoleSelect }) => {
  const [selectedRole, setSelectedRole] = useState<'piloto' | 'espectador' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelect = (role: 'piloto' | 'espectador') => {
    setSelectedRole(role);
    setIsLoading(true);

    // Map roles - Piloto can be either player or organizer (determined by PIN)
    const mappedRole = role === 'piloto' ? 'player' : 'spectator';
    setTimeout(() => onRoleSelect(mappedRole), 800);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black opacity-50"></div>

      {/* Content */}
      <div className="relative z-10 max-w-sm mx-auto w-full">
        {/* Logo Section */}
        <div className="text-center mb-12">
          <img
            src="https://www.formula1.com/etc/designs/fom-website/images/f1_logo.svg"
            alt="F1"
            className="h-12 w-auto mx-auto mb-8 opacity-90"
          />

          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-wide mb-2">
            F1 NIGHT
          </h1>

          <div className="h-1 w-24 bg-gradient-to-r from-transparent via-red-600 to-transparent mx-auto mb-3"></div>

          <p className="text-zinc-400 text-sm font-light tracking-widest uppercase">
            Racing Experience
          </p>
        </div>

        {/* Buttons with descriptions */}
        <div className="space-y-6">
          {/* LIVE Button - Spectator access */}
          <div className="space-y-2">
            <button
              onClick={() => handleRoleSelect('espectador')}
              disabled={isLoading}
              aria-label="Acceder a timing en vivo sin contraseña"
              className={`
                w-full relative overflow-hidden group
                min-h-[64px]
                ${selectedRole === 'espectador'
                  ? 'bg-zinc-700 border-zinc-500'
                  : 'bg-zinc-900/50 border-zinc-700 hover:border-zinc-500 active:bg-zinc-800'
                }
                border-2 backdrop-blur-sm
                rounded-xl py-5 px-6
                transition-all duration-200
                active:scale-[0.98]
                focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-black
                disabled:cursor-not-allowed disabled:opacity-50
              `}
            >
              <div className="relative flex items-center justify-center">
                {selectedRole === 'espectador' && isLoading ? (
                  <div className="flex items-center justify-center gap-3">
                    <LoadingSpinner size="sm" />
                    <span className="text-white font-semibold text-lg animate-pulse">
                      Conectando...
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <svg className="w-7 h-7 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="text-2xl font-bold text-white">
                      LIVE
                    </span>
                  </div>
                )}
              </div>
            </button>
            <p className="text-center text-zinc-500 text-sm px-4">
              Ver timing en vivo • Sin contraseña
            </p>
          </div>

          {/* PARC FERMÉ Button - Pilot access */}
          <div className="space-y-2">
            <button
              onClick={() => handleRoleSelect('piloto')}
              disabled={isLoading}
              aria-label="Acceso de piloto, requiere PIN"
              className={`
                w-full relative overflow-hidden group
                min-h-[64px]
                ${selectedRole === 'piloto'
                  ? 'bg-red-600 border-red-400'
                  : 'bg-red-600/20 border-red-600/50 hover:border-red-500 hover:bg-red-600/30 active:bg-red-600/40'
                }
                border-2 backdrop-blur-sm
                rounded-xl py-5 px-6
                transition-all duration-200
                active:scale-[0.98]
                focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black
                disabled:cursor-not-allowed disabled:opacity-50
              `}
            >
              <div className="relative flex items-center justify-center">
                {selectedRole === 'piloto' && isLoading ? (
                  <div className="flex items-center justify-center gap-3">
                    <LoadingSpinner size="sm" />
                    <span className="text-white font-semibold text-lg animate-pulse">
                      Accediendo...
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-2xl font-bold text-white">
                      PARC FERMÉ
                    </span>
                  </div>
                )}
              </div>
            </button>
            <p className="text-center text-zinc-500 text-sm px-4">
              Acceso de piloto • Requiere PIN
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16">
          <div className="flex items-center justify-center gap-2 text-zinc-600 text-xs">
            <div className="w-8 h-px bg-zinc-800"></div>
            <span className="font-mono tracking-wider">BLACK MAMBA</span>
            <div className="w-8 h-px bg-zinc-800"></div>
          </div>
          <div className="text-zinc-700 text-xs font-mono mt-1">2025</div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-red-600/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-red-600/5 rounded-full blur-3xl"></div>
    </div>
  );
};

export default LandingPage;
