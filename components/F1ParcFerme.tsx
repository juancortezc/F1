import React from 'react';
import { useRouter } from 'next/router';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action?: () => void;
  disabled?: boolean;
}

interface F1ParcFermeProps {
  onNavigate: (destination: string) => void;
}

const F1ParcFerme: React.FC<F1ParcFermeProps> = ({ onNavigate }) => {
  const router = useRouter();

  const menuItems: MenuItem[] = [
    {
      id: 'quick',
      label: 'Quick',
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      disabled: false,
      action: () => onNavigate('quick')
    },
    {
      id: 'continue',
      label: 'Continue',
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          <circle cx="12" cy="12" r="3" strokeWidth={2} />
        </svg>
      ),
      disabled: true,
      action: () => console.log('Continue - Coming soon')
    },
    {
      id: 'custom',
      label: 'Custom',
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
      disabled: false,
      action: () => onNavigate('custom')
    },
    {
      id: 'torneo',
      label: 'Torneo',
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      disabled: true,
      action: () => console.log('Torneo - Coming soon')
    },
    {
      id: 'admin',
      label: 'Admin',
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      disabled: false,
      action: () => onNavigate('admin')
    },
    {
      id: 'peligro',
      label: 'Peligro',
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      disabled: false,
      action: () => onNavigate('peligro')
    }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1A1A1A' }}>
      <div className="max-w-4xl mx-auto px-4 pt-8 pb-24">
        {/* PARC FERMÉ Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-wider">PARC FERMÉ</h1>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              disabled={item.disabled}
              className={`
                relative overflow-hidden rounded-lg p-6 md:p-8
                transition-all duration-200 transform
                ${item.disabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:scale-105 active:scale-95 cursor-pointer'
                }
                min-h-[140px] md:min-h-[160px]
              `}
              style={{
                background: item.disabled 
                  ? 'linear-gradient(135deg, #3A3A3A 0%, #2A2A2A 100%)'
                  : 'linear-gradient(135deg, #E10600 0%, #AA0400 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: item.disabled 
                  ? 'none' 
                  : '0 4px 15px rgba(225, 6, 0, 0.3)'
              }}
            >
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div className="text-white">
                  {item.icon}
                </div>
                <span className="text-white font-bold text-base md:text-lg uppercase tracking-wide">
                  {item.label}
                </span>
              </div>
              
              {/* Gradient overlay for depth */}
              {!item.disabled && (
                <div 
                  className="absolute inset-0 opacity-0 hover:opacity-20 transition-opacity duration-200"
                  style={{
                    background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.1))'
                  }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Coming Soon Notice */}
        <div className="mt-8 text-center">
          <p className="text-zinc-500 text-sm">
            Solo <span className="text-white font-semibold">Admin</span> y <span className="text-white font-semibold">Peligro</span> están disponibles actualmente
          </p>
        </div>
      </div>
    </div>
  );
};

export default F1ParcFerme;