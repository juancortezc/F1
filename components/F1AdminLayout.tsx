import React, { useState } from 'react';
import { UserSession, Player, Circuit } from '../types';
import F1Header from './F1Header';
import F1Navigation from './F1Navigation';
import F1ParcFerme from './F1ParcFerme';
import F1QuickRace from './F1QuickRace';
import AdminView from './AdminView';

interface F1AdminLayoutProps {
  currentUser: UserSession;
  currentPlayer?: Player | null;
  players: Player[];
  circuits: Circuit[];
  onLogout: () => void;
  onBack: () => void;
  onRecalculateScores?: () => Promise<void>;
  onNavigateToTab?: (tab: 'tiempos' | 'live' | 'hall-of-fame' | 'registro') => void;
  onStartQuickRace?: (selectedPlayers: Player[], selectedCircuits: Circuit[]) => void;
}

type AdminSection = 'menu' | 'pilotos' | 'circuitos' | 'quick';

const F1AdminLayout: React.FC<F1AdminLayoutProps> = ({
  currentUser,
  currentPlayer,
  players,
  circuits,
  onLogout,
  onBack,
  onRecalculateScores,
  onNavigateToTab,
  onStartQuickRace
}) => {
  const [currentSection, setCurrentSection] = useState<AdminSection>('menu');
  const [activeAdminTab, setActiveAdminTab] = useState<'players' | 'circuits'>('players');

  const handleNavigate = (destination: string) => {
    switch (destination) {
      case 'pilotos':
        setCurrentSection('pilotos');
        setActiveAdminTab('players');
        break;
      case 'circuitos':
        setCurrentSection('circuitos');
        setActiveAdminTab('circuits');
        break;
      case 'quick':
        setCurrentSection('quick');
        break;
      default:
        console.log('Navigate to:', destination);
    }
  };

  const handleBackToMenu = () => {
    setCurrentSection('menu');
  };

  const renderContent = () => {
    switch (currentSection) {
      case 'menu':
        return <F1ParcFerme onNavigate={handleNavigate} />;
      
      case 'quick':
        return (
          <F1QuickRace
            players={players}
            circuits={circuits}
            onBack={handleBackToMenu}
            onStartRace={(selectedPlayers, selectedCircuits) => {
              if (onStartQuickRace) {
                onStartQuickRace(selectedPlayers, selectedCircuits);
              }
            }}
          />
        );
      
      case 'pilotos':
      case 'circuitos':
        return (
          <AdminView
            players={players}
            circuits={circuits}
            currentUser={currentUser}
            onBack={handleBackToMenu}
            onRecalculateScores={onRecalculateScores}
            initialTab={activeAdminTab}
          />
        );
      
      default:
        return <F1ParcFerme onNavigate={handleNavigate} />;
    }
  };

  const handleTabChange = (tab: 'tiempos' | 'live' | 'hall-of-fame' | 'registro') => {
    if (tab === 'registro') {
      // Stay in admin area but ensure we're in menu
      setCurrentSection('menu');
    } else {
      // Navigate to other tabs using the provided handler
      if (onNavigateToTab) {
        onNavigateToTab(tab);
      }
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1A1A1A' }}>
      {/* F1 Header */}
      <F1Header
        currentUser={currentUser}
        currentPlayer={currentPlayer}
        onLogout={onLogout}
        hasActiveGame={false}
        hasAdminPrivileges={true}
      />

      {/* Main Content */}
      <main className="pb-20">
        {renderContent()}
      </main>

      {/* F1 Bottom Navigation */}
      <F1Navigation
        activeTab={'registro'}
        onTabChange={handleTabChange}
        hasActiveGame={false}
        hasAdminPrivileges={true}
      />
    </div>
  );
};

export default F1AdminLayout;