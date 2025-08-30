import React from 'react';
import { UserSession, Player } from '../types';

type F1Tab = 'tiempos' | 'live' | 'hall-of-fame' | 'registro';

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
  const tabs: Array<{id: F1Tab, label: string, icon: React.ReactNode, isLive?: boolean}> = [
    {
      id: 'tiempos',
      label: 'TIEMPOS',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'live',
      label: 'LIVE',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      isLive: true
    },
    {
      id: 'hall-of-fame',
      label: 'HALL OF FAME',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      )
    }
  ];

  // Add registro tab only for admin users
  if (hasAdminPrivileges) {
    tabs.push({
      id: 'registro',
      label: 'REGISTRO',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    });
  }

  const getLiveButtonColor = () => {
    if (activeTab === 'live') {
      return hasActiveGame ? 'bg-f1-red text-white' : 'bg-zinc-600 text-white';
    }
    return hasActiveGame ? 'text-f1-red' : 'text-zinc-500';
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div style={{ backgroundColor: '#1A1A1A' }} className="border-t border-zinc-800 px-2 py-2">
        <div className="flex justify-center items-center max-w-lg mx-auto">
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            const isLive = tab.isLive;
            const isRegistro = tab.id === 'registro';
            
            if (isLive) {
              // LIVE button - centered and prominent
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`
                    mx-2 px-6 py-3 rounded-full font-bold text-sm transition-all duration-200
                    ${getLiveButtonColor()}
                    ${isActive ? 'transform scale-105' : 'hover:scale-105'}
                    min-w-[80px]
                  `}
                  title={tab.label}
                >
                  <div className="flex flex-col items-center">
                    {tab.icon}
                    <span className="text-xs mt-1">{tab.label}</span>
                  </div>
                </button>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex-1 max-w-[100px] px-3 py-3 transition-colors duration-200
                  ${isActive 
                    ? isRegistro 
                      ? 'text-orange-500' 
                      : 'text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                  }
                `}
                title={tab.label}
              >
                <div className="flex flex-col items-center">
                  {tab.icon}
                  <span className="text-xs mt-1 font-medium">{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default F1Navigation;