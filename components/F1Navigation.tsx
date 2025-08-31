import React from 'react';
import { UserSession, Player } from '../types';

type F1Tab = 'tiempos-historicos' | 'live' | 'hall-of-fame' | 'tiempos';

interface F1NavigationProps {
  activeTab: F1Tab;
  onTabChange: (tab: F1Tab) => void;
  hasActiveGame: boolean;
  hasAdminPrivileges: boolean;
}

const F1Navigation: React.FC<F1NavigationProps> = ({
  activeTab,
  onTabChange,
  hasActiveGame,
  hasAdminPrivileges
}) => {
  const sideButtons: Array<{id: F1Tab, icon: React.ReactNode, position: 'left' | 'right', label: string, adminOnly?: boolean}> = [
    {
      id: 'tiempos-historicos',
      position: 'left',
      label: 'HISTÓRICO',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'hall-of-fame',
      position: 'left',
      label: 'HALL OF FAME',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    {
      id: 'tiempos',
      position: 'right',
      label: 'TIEMPOS',
      adminOnly: true,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    }
  ];

  // Filter buttons based on admin privileges
  const visibleButtons = sideButtons.filter(button => !button.adminOnly || hasAdminPrivileges);

  const getLiveButtonColor = () => {
    return hasActiveGame ? 'bg-f1-red text-white' : 'bg-zinc-600 text-white';
  };

  const leftButtons = visibleButtons.filter(btn => btn.position === 'left');
  const rightButtons = visibleButtons.filter(btn => btn.position === 'right');

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div 
        className="border-t border-zinc-700 px-4 py-3 backdrop-blur-md"
        style={{ 
          background: 'linear-gradient(to top, #000000 0%, #1A1A1A 100%)',
          boxShadow: '0 -4px 6px -1px rgb(0 0 0 / 0.3)'
        }}
      >
        <div className="flex justify-between items-center max-w-lg mx-auto">
          {/* Left side buttons */}
          <div className="flex gap-4">
            {leftButtons.map((button) => {
              const isActive = activeTab === button.id;
              return (
                <button
                  key={button.id}
                  onClick={() => onTabChange(button.id)}
                  title={button.label}
                  className={`
                    p-3 rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-zinc-700 text-white transform scale-105' 
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                    }
                  `}
                >
                  {button.icon}
                </button>
              );
            })}
          </div>

          {/* Center LIVE button */}
          <button
            onClick={() => onTabChange('live')}
            title="LIVE TIMING"
            className={`
              relative w-20 h-20 rounded-full font-bold text-base transition-all duration-300 transform
              ${getLiveButtonColor()}
              ${activeTab === 'live' ? 'scale-110 shadow-lg' : 'hover:scale-105'}
              ${hasActiveGame ? 'shadow-red-500/30' : 'shadow-zinc-800/50'}
            `}
          >
            {/* Pulse effect when active game */}
            {hasActiveGame && (
              <div className="absolute inset-0 rounded-full bg-f1-red opacity-30 animate-pulse"></div>
            )}
            <div className="relative flex items-center justify-center">
              <span className="font-bold tracking-wider">LIVE</span>
            </div>
          </button>

          {/* Right side buttons */}
          <div className="flex gap-4">
            {rightButtons.map((button) => {
              const isActive = activeTab === button.id;
              return (
                <button
                  key={button.id}
                  onClick={() => onTabChange(button.id)}
                  title={button.label}
                  className={`
                    p-3 rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-zinc-700 text-white transform scale-105'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                    }
                  `}
                >
                  {button.icon}
                </button>
              );
            })}
            {/* Spacer if no right buttons to maintain symmetry */}
            {rightButtons.length === 0 && (
              <div className="w-12"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default F1Navigation;