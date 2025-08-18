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
    <div className="min-h-screen bg-f1-black flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <button
          onClick={onBack}
          className="mb-8 text-secondary hover:text-primary transition-colors flex items-center gap-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver
        </button>
        
        <div className="text-center mb-8">
          <img 
            src="/F1-logo.png" 
            alt="F1" 
            className="h-20 mx-auto mb-4"
          />
          <h1 className="text-f1-3xl font-bold text-primary">F1 NIGHT</h1>
          <p className="text-f1-lg text-secondary mt-2">
            {selectedRole === 'organizer' ? 'Organizador' : 'Jugador'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-secondary text-f1-base mb-2">
              Ingresa tu PIN
            </label>
            <input
              type="password"
              value={pin}
              onChange={handlePinChange}
              maxLength={4}
              className="w-full text-f1-3xl tracking-[1em] text-center surface-primary border-2 border-subtle rounded-md p-4 text-primary focus:border-f1-red transition-colors"
              placeholder="----"
              autoFocus
            />
          </div>
          
          {error && (
            <p className="text-f1-red text-f1-base text-center">{error}</p>
          )}
          
          <button
            type="submit"
            disabled={pin.length !== 4 || isLoading}
            className="w-full touch-target bg-f1-red text-white font-bold text-f1-lg rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" />
                Verificando...
              </span>
            ) : (
              'INGRESAR'
            )}
          </button>
        </form>
        
        <p className="text-center text-f1-sm text-muted mt-8">
          {selectedRole === 'organizer' 
            ? 'PIN de administrador requerido'
            : 'PIN personal de jugador'}
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;