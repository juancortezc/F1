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
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <button
          onClick={onBack}
          className="mb-8 text-zinc-300 hover:text-zinc-100 transition-colors flex items-center gap-2 text-f1-lg touch-target"
        >
          ← Volver
        </button>
        
        <div className="text-center mb-8">
          <img 
            src="https://www.formula1.com/etc/designs/fom-website/images/f1_logo.svg" 
            alt="F1" 
            className="h-24 mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold text-zinc-100 mb-3">F1 NIGHT</h1>
          <p className="text-f1-xl text-zinc-300">
            {selectedRole === 'organizer' ? 'Organizador' : 'Jugador'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-zinc-300 text-f1-lg mb-3">
              Ingresa tu PIN
            </label>
            <input
              type="password"
              value={pin}
              onChange={handlePinChange}
              maxLength={4}
              className="w-full text-4xl tracking-[1em] text-center bg-zinc-900 border-2 border-zinc-700 rounded-md p-4 text-zinc-100 focus:border-red-500 transition-colors touch-target"
              placeholder="----"
              autoFocus
            />
          </div>
          
          {error && (
            <p className="text-red-500 text-f1-lg text-center font-semibold">{error}</p>
          )}
          
          <button
            type="submit"
            disabled={pin.length !== 4 || isLoading}
            className="w-full touch-target bg-red-600 text-white font-bold text-f1-xl rounded-md py-4 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:bg-red-700"
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
        
        <p className="text-center text-f1-base text-zinc-400 mt-8">
          {selectedRole === 'organizer' 
            ? 'PIN de administrador requerido'
            : 'PIN personal de jugador'}
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;