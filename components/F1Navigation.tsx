import React from 'react';

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
}) => {
  const tabs: Array<{
    id: F1Tab;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'tiempos-historicos',
      label: 'RESULTADOS',
      icon: (
        <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'hall-of-fame',
      label: 'HOF',
      icon: (
        <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      )
    },
    {
      id: 'live',
      label: 'LIVE',
      icon: (
        <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )
    },
    {
      id: 'tiempos',
      label: 'REGISTRO',
      icon: (
        <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  return (
    <nav
      className="w-full safe-bottom"
      role="tablist"
      aria-label="Navegación principal"
    >
      <div
        className="border-t border-zinc-700 px-2 py-2 backdrop-blur-md safe-left safe-right"
        style={{
          background: 'linear-gradient(to top, #000000 0%, #1A1A1A 100%)',
          boxShadow: '0 -4px 6px -1px rgb(0 0 0 / 0.3)'
        }}
      >
        <div className="flex justify-around items-center max-w-lg mx-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isLive = tab.id === 'live';

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                role="tab"
                aria-selected={isActive}
                aria-label={`${tab.label}${isLive && hasActiveGame ? ' - Carrera en vivo' : ''}`}
                className={`
                  relative flex flex-col items-center justify-center
                  min-w-[72px] min-h-[56px] px-2 py-1.5
                  rounded-xl transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-black
                  active:scale-95
                  ${isLive
                    ? isActive
                      ? hasActiveGame
                        ? 'bg-f1-red text-white shadow-lg shadow-red-500/30'
                        : 'bg-zinc-600 text-white'
                      : hasActiveGame
                        ? 'bg-f1-red/80 text-white hover:bg-f1-red'
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    : isActive
                      ? 'bg-zinc-700 text-white'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 active:bg-zinc-700'
                  }
                `}
              >
                {/* Pulse indicator for LIVE with active game */}
                {isLive && hasActiveGame && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}

                {/* Icon */}
                <span className={`
                  ${isActive ? 'text-white' : isLive && hasActiveGame ? 'text-white' : 'text-current'}
                `}>
                  {tab.icon}
                </span>

                {/* Label - ALWAYS visible */}
                <span className={`
                  mt-1 text-xs font-bold tracking-wide
                  ${isActive
                    ? 'text-white'
                    : isLive && hasActiveGame
                      ? 'text-white'
                      : 'text-zinc-400'
                  }
                `}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default F1Navigation;
