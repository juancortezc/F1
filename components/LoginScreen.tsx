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
            {selectedRole === 'organizer' ? 'ORGANIZADOR' : 'JUGADOR'}
          </p>
        </div>
        
        {/* Login Form */}
        <div className="space-y-8">
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
        </div>
        
        {/* Footer Info */}
        <div className="text-center mt-12">
          <p className="text-zinc-600 text-xs">
            {selectedRole === 'organizer' 
              ? 'PIN de administrador'
              : 'PIN personal de 4 dígitos'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;