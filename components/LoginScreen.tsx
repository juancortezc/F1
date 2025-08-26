import React, { useState } from 'react';
import { UserRole, UserSession } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface LoginScreenProps {
  selectedRole: UserRole;
  onLoginSuccess: (user: UserSession) => void;
  onBack: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ selectedRole, onLoginSuccess, onBack }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-login for spectators and guests
  React.useEffect(() => {
    if (selectedRole === 'spectator') {
      handleSpectatorLogin();
    } else if (selectedRole === 'guest') {
      handleGuestLogin();
    }
  }, [selectedRole]);

  const handleSpectatorLogin = async () => {
    setIsLoading(true);
    // Create a spectator session without PIN
    const spectatorSession: UserSession = {
      userId: 'spectator',
      name: 'Espectador',
      role: 'spectator'
    };
    
    // Small delay for UX
    setTimeout(() => {
      onLoginSuccess(spectatorSession);
    }, 500);
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    try {
      // Fetch guest players from API
      const response = await fetch('/api/players');
      if (!response.ok) {
        throw new Error('Failed to load players');
      }
      
      const players = await response.json();
      const guestPlayers = players.filter((p: any) => p.isGuest);
      
      if (guestPlayers.length === 0) {
        setError('No hay invitados registrados. Contacta un administrador.');
        setIsLoading(false);
        return;
      }
      
      // For now, if there's only one guest, auto-select it
      // If multiple guests, we'd need a selection screen
      if (guestPlayers.length === 1) {
        const guestSession: UserSession = {
          userId: guestPlayers[0].id,
          name: guestPlayers[0].name,
          role: 'guest'
        };
        
        setTimeout(() => {
          onLoginSuccess(guestSession);
        }, 500);
      } else {
        // Show guest selection (we'll implement this later if needed)
        setError('Múltiples invitados disponibles. Implementar selección.');
        setIsLoading(false);
      }
    } catch (error) {
      setError('Error al cargar invitados');
      setIsLoading(false);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && value.length <= 4) {
      setPin(value);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setError('PIN de 4 dígitos requerido');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pin,
          role: selectedRole
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        onLoginSuccess(data.user);
      } else {
        setError(data.error || 'PIN inválido');
        setPin('');
      }
    } catch (err) {
      setError('Error de conexión');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-sm w-full">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="mb-12 flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors text-sm"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </button>
        
        {/* Header */}
        <div className="text-center mb-16">
          <img 
            src="https://www.formula1.com/etc/designs/fom-website/images/f1_logo.svg" 
            alt="F1" 
            className="h-12 mx-auto mb-8 brightness-0 invert opacity-80"
          />
          <h1 className="text-2xl font-bold text-zinc-100 mb-6 tracking-wider">F1 NIGHT</h1>
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">
            {selectedRole === 'organizer' ? 'ORGANIZADOR' : 
             selectedRole === 'player' ? 'JUGADOR' : 'ESPECTADOR'}
          </p>
        </div>
        
        {/* Login Form or Loading for Spectators */}
        <div className="space-y-8">
          {selectedRole === 'spectator' ? (
            <div className="text-center py-12">
              <LoadingSpinner size="lg" className="mx-auto mb-6" />
              <p className="text-zinc-400 text-sm">Ingresando como espectador...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-zinc-500 font-mono text-xs uppercase tracking-wider mb-3">
                  PIN
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={handlePinChange}
                  maxLength={4}
                  className="w-full text-3xl font-mono tracking-[0.8em] text-center bg-transparent border-b-2 border-zinc-700 py-3 text-zinc-100 focus:border-f1-red focus:outline-none transition-colors"
                  placeholder="————"
                  autoFocus
                />
              </div>
              
              {error && (
                <div className="py-2">
                  <p className="text-red-400 text-center text-sm">{error}</p>
                </div>
              )}
              
              <button
                type="submit"
                disabled={pin.length !== 4 || isLoading}
                className="w-full bg-f1-red text-white font-semibold text-sm py-3 disabled:bg-zinc-700 disabled:cursor-not-allowed transition-colors hover:bg-red-700 tracking-wider"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" />
                    VERIFICANDO
                  </span>
                ) : (
                  'INGRESAR'
                )}
              </button>
            </form>
          )}
        </div>
        
        {/* Footer Info */}
        {selectedRole !== 'spectator' && (
          <div className="text-center mt-12">
            <p className="text-zinc-600 text-xs">
              {selectedRole === 'organizer' 
                ? 'PIN de administrador'
                : 'PIN personal de 4 dígitos'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;