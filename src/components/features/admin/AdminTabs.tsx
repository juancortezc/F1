'use client';

/**
 * AdminTabs Component
 * Tab navigation for admin panel sections
 */

import React from 'react';

export type AdminTabType = 'players' | 'circuits' | 'guests' | 'tournaments';

export interface AdminTabsProps {
  activeTab: AdminTabType;
  onTabChange: (tab: AdminTabType) => void;
  playerCount?: number;
  circuitCount?: number;
  guestCount?: number;
  tournamentCount?: number;
}

const tabs: Array<{ value: AdminTabType; label: string; icon: React.ReactNode }> = [
  {
    value: 'players',
    label: 'Jugadores',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    ),
  },
  {
    value: 'guests',
    label: 'Invitados',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7H15C14.45 7 14 7.45 14 8V10C14 10.55 14.45 11 15 11H16V19H8V11H9C9.55 11 10 10.55 10 10V8C10 7.45 9.55 7 9 7H3V9H8V19H6V21H18V19H16V9H21Z" />
      </svg>
    ),
  },
  {
    value: 'circuits',
    label: 'Circuitos',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C17.52 2 22 6.48 22 12C22 17.52 17.52 22 12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2ZM12 4C7.59 4 4 7.59 4 12C4 16.41 7.59 20 12 20C16.41 20 20 16.41 20 12C20 7.59 16.41 4 12 4ZM12 6C15.31 6 18 8.69 18 12C18 15.31 15.31 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6Z" />
      </svg>
    ),
  },
  {
    value: 'tournaments',
    label: 'Torneos',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C13.1 2 14 2.9 14 4V5H18C19.1 5 20 5.9 20 7V9C20 10.86 18.73 12.43 17 12.87L16.83 16.29C16.74 17.38 15.84 18.24 14.75 18.25V20H16C16.55 20 17 20.45 17 21C17 21.55 16.55 22 16 22H8C7.45 22 7 21.55 7 21C7 20.45 7.45 20 8 20H9.25V18.25C8.16 18.24 7.26 17.38 7.17 16.29L7 12.87C5.27 12.43 4 10.86 4 9V7C4 5.9 4.9 5 6 5H10V4C10 2.9 10.9 2 12 2ZM15 12H9V16C9 16.55 9.45 17 10 17H14C14.55 17 15 16.55 15 16V12Z" />
      </svg>
    ),
  },
];

export function AdminTabs({
  activeTab,
  onTabChange,
  playerCount,
  circuitCount,
  guestCount,
  tournamentCount,
}: AdminTabsProps) {
  const getCounts = (tabValue: AdminTabType): number | undefined => {
    switch (tabValue) {
      case 'players':
        return playerCount;
      case 'circuits':
        return circuitCount;
      case 'guests':
        return guestCount;
      case 'tournaments':
        return tournamentCount;
      default:
        return undefined;
    }
  };

  return (
    <div className="flex bg-zinc-800 rounded-lg p-1">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        const count = getCounts(tab.value);

        return (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`
              flex-1 flex items-center justify-center gap-1.5
              px-2 py-2
              text-xs font-bold
              rounded-md
              transition-colors
              ${isActive
                ? 'bg-zinc-700 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
              }
            `}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {count !== undefined && (
              <span className={`
                text-[10px] px-1.5 py-0.5 rounded-full
                ${isActive ? 'bg-zinc-600' : 'bg-zinc-700'}
              `}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default AdminTabs;
