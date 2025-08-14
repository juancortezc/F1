import React, { useState } from 'react';
import { UserRole, UserSession } from '../types';

interface LoginScreenProps {
  selectedRole: UserRole;
  onLoginSuccess: (user: UserSession) => void;
  onBack: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ selectedRole, onLoginSuccess, onBack }) => {
  const [pin, setPin] = useState('');
  const [adminName, setAdminName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const showAdminName = selectedRole === 'organizer';

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
      setError('Por favor ingresa un PIN de 4 dígitos.');
      return;
    }
    
    if (showAdminName && !adminName.trim()) {
      setError('Por favor ingresa tu nombre de administrador.');
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
          role: selectedRole,
          ...(showAdminName && adminName.trim() && { adminName: adminName.trim() })
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        onLoginSuccess(data.user);
      } else {
        setError(data.error || 'PIN inválido. Inténtalo de nuevo.');
        setPin('');
      }
    } catch (err) {
      setError('Error de conexión. Inténtalo de nuevo.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleTitle = () => {
    return selectedRole === 'organizer' ? 'Organizador' : 'Jugador';
  };

  const getRoleDescription = () => {
    return selectedRole === 'organizer' 
      ? 'Ingrese el PIN de administrador para crear campeonatos.'
      : 'Ingrese su PIN personal para unirse a la competencia.';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm text-center">
        <button
          onClick={onBack}
          className="mb-6 text-slate-400 hover:text-white transition-colors flex items-center gap-2 mx-auto"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Cambiar rol
        </button>
        
        <img 
          src="https://www.formula1.com/etc/designs/fom-website/images/f1_logo.svg" 
          alt="F1 Logo" 
          className="w-32 h-24 mx-auto object-contain"
        />
        <h1 className="text-4xl font-bold mt-4 text-slate-100">F1 Night</h1>
        <div className="mt-2 mb-8">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-2 ${
            selectedRole === 'organizer' 
              ? 'bg-[#FF1801]/20 text-[#FF1801]' 
              : 'bg-blue-500/20 text-blue-400'
          }`}>
            {getRoleTitle()}
          </div>
          <p className="text-slate-400 text-sm">{getRoleDescription()}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={pin}
            onChange={handlePinChange}
            maxLength={4}
            className="w-full text-4xl tracking-[1em] text-center bg-slate-800 border-2 border-slate-600 rounded-lg p-4 text-slate-100 focus:border-[#FF1801] focus:outline-none transition-colors"
            placeholder="----"
            autoFocus
          />
          
          {showAdminName && (
            <div className="space-y-2">
              <label className="block text-slate-300 text-sm font-medium">
                Nombre del organizador:
              </label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full text-lg text-center bg-slate-800 border-2 border-slate-600 rounded-lg p-3 text-slate-100 focus:border-[#FF1801] focus:outline-none transition-colors"
                placeholder="Ingresa tu nombre"
                maxLength={20}
              />
            </div>
          )}
          
          {error && <p className="text-red-500 mt-4">{error}</p>}
          <button
            type="submit"
            disabled={pin.length !== 4 || isLoading || (showAdminName && !adminName.trim())}
            className="w-full bg-[#FF1801] text-white font-bold py-3 px-4 rounded-lg mt-6 hover:bg-[#E61601] disabled:bg-slate-700 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? 'Verificando...' : 'INGRESAR'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;