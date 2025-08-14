import React, { useState } from 'react';

interface LoginScreenProps {
  onLoginSuccess: (user: { id: string; name: string }) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [pin, setPin] = useState('');
  const [adminName, setAdminName] = useState('');
  const [showAdminName, setShowAdminName] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && value.length <= 4) {
      setPin(value);
      setError('');
      // Check if this might be admin PIN (2024 is common default)
      if (value === '2024' && value.length === 4) {
        setShowAdminName(true);
      } else {
        setShowAdminName(false);
        setAdminName('');
      }
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm text-center">
        <img 
          src="https://www.formula1.com/etc/designs/fom-website/images/f1_logo.svg" 
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
          
          {showAdminName && (
            <div className="space-y-2">
              <label className="block text-slate-300 text-sm font-medium">
                Nombre de administrador:
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