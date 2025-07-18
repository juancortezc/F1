import React, { useState } from 'react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  pinCode: string;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, pinCode }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && value.length <= 4) {
      setPin(value);
      setError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === pinCode) {
      onLoginSuccess();
    } else {
      setError('Invalid PIN. Please try again.');
      setPin('');
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
        <h1 className="text-4xl font-bold mt-4 text-slate-100">F1 Night Tracker</h1>
        <p className="text-slate-400 mt-2 mb-8">Enter the 4-digit PIN to continue.</p>
        
        <form onSubmit={handleSubmit}>
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
            disabled={pin.length !== 4}
            className="w-full bg-[#FF1801] text-white font-bold py-3 px-4 rounded-lg mt-6 hover:bg-[#E61601] disabled:bg-slate-700 disabled:cursor-not-allowed transition-all"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;