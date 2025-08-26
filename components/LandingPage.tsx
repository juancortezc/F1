import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface LandingPageProps {
  onRoleSelect: (role: 'organizer' | 'player' | 'spectator' | 'guest') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onRoleSelect }) => {
  const [selectedRole, setSelectedRole] = useState<'piloto' | 'espectador' | 'invitado' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelect = (role: 'piloto' | 'espectador' | 'invitado') => {
    setSelectedRole(role);
    setIsLoading(true);
    
    // Map roles - Piloto can be either player or organizer (determined by PIN)
    const mappedRole = role === 'piloto' ? 'player' : role === 'espectador' ? 'spectator' : 'guest';
    setTimeout(() => onRoleSelect(mappedRole), 800);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black opacity-50"></div>
      
      {/* Content */}
      <div className="relative z-10 max-w-sm mx-auto w-full">
        {/* Logo Section */}
        <div className="text-center mb-12">
          <img 
            src="https://www.formula1.com/etc/designs/fom-website/images/f1_logo.svg" 
            alt="F1" 
            className="h-16 mx-auto mb-8 opacity-90"
          />
          
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-wide mb-2">
            F1 NIGHT
          </h1>
          
          <div className="h-1 w-24 bg-gradient-to-r from-transparent via-red-600 to-transparent mx-auto mb-3"></div>
          
          <p className="text-zinc-400 text-sm font-light tracking-widest uppercase">
            Racing Experience
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-4">
          <button
            onClick={() => handleRoleSelect('espectador')}
            disabled={isLoading}
            className={`
              w-full relative overflow-hidden group
              ${selectedRole === 'espectador' 
                ? 'bg-zinc-700 border-zinc-600' 
                : 'bg-zinc-900/30 border-zinc-800/50 hover:border-zinc-600/50'
              }
              border backdrop-blur-sm
              rounded-lg py-6 px-8
              transition-all duration-300 ease-out
              transform hover:scale-[1.02] active:scale-[0.98]
              disabled:cursor-not-allowed disabled:opacity-50
            `}
          >
            {/* Hover effect */}
            <div className={`
              absolute inset-0 bg-gradient-to-r from-zinc-600/0 via-zinc-600/10 to-zinc-600/0
              translate-x-[-100%] group-hover:translate-x-[100%]
              transition-transform duration-1000
              ${selectedRole === 'espectador' ? 'opacity-0' : ''}
            `}></div>
            
            <div className="relative">
              {selectedRole === 'espectador' && isLoading ? (
                <div className="flex items-center justify-center gap-3">
                  <LoadingSpinner size="sm" />
                  <span className="text-white font-semibold text-lg animate-pulse">
                    Conectando a live timing...
                  </span>
                </div>
              ) : (
                <div className="text-2xl font-bold text-zinc-100">
                  LIVE
                </div>
              )}
            </div>
          </button>

          <button
            onClick={() => handleRoleSelect('piloto')}
            disabled={isLoading}
            className={`
              w-full relative overflow-hidden group
              ${selectedRole === 'piloto' 
                ? 'bg-red-600 border-red-500' 
                : 'bg-zinc-900/50 border-zinc-800 hover:border-red-600/50'
              }
              border backdrop-blur-sm
              rounded-lg py-6 px-8
              transition-all duration-300 ease-out
              transform hover:scale-[1.02] active:scale-[0.98]
              disabled:cursor-not-allowed disabled:opacity-50
            `}
          >
            {/* Hover effect */}
            <div className={`
              absolute inset-0 bg-gradient-to-r from-red-600/0 via-red-600/20 to-red-600/0
              translate-x-[-100%] group-hover:translate-x-[100%]
              transition-transform duration-1000
              ${selectedRole === 'piloto' ? 'opacity-0' : ''}
            `}></div>
            
            <div className="relative">
              {selectedRole === 'piloto' && isLoading ? (
                <div className="flex items-center justify-center gap-3">
                  <LoadingSpinner size="sm" />
                  <span className="text-white font-semibold text-lg animate-pulse">
                    Accediendo al Parc Fermé...
                  </span>
                </div>
              ) : (
                <div className="text-2xl font-bold text-white">
                  PARC FERMÉ
                </div>
              )}
            </div>
          </button>
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