import React, { useState } from 'react';

interface LoginScreenProps {
  onLoginSuccess: (user: { id: string; name: string }) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
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
      setError('Por favor ingresa un PIN de 4 dígitos.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm text-center">
        <img 
          src="https://storage.googleapis.com/poker-enfermos/f1-logo.png" 
          alt="F1 Logo" 
          className="w-32 h-24 mx-auto object-contain"
        />
        <h1 className="text-4xl font-bold mt-4 text-slate-100">F1 Night </h1>
        <p className="text-slate-400 mt-2 mb-8">Ingrese su PIN personal.</p>
        
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
          {error && <p className="text-red-500 mt-4">{error}</p>}
          <button
            type="submit"
            disabled={pin.length !== 4 || isLoading}
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