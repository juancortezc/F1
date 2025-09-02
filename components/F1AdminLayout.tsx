import React, { useState } from 'react';
import { UserSession, Player, Circuit } from '../types';
import F1Header from './F1Header';
import F1Navigation from './F1Navigation';
import F1ParcFerme from './F1ParcFerme';
import F1QuickRace from './F1QuickRace';
import F1CustomChampionship from './F1CustomChampionship';
import AdminView from './AdminView';
import F1DangerZone from './F1DangerZone';

interface F1AdminLayoutProps {
  currentUser: UserSession;
  currentPlayer?: Player | null;
  players: Player[];
  circuits: Circuit[];
  onLogout: () => void;
  onBack: () => void;
  onRecalculateScores?: () => Promise<void>;
  onCancelGame?: () => Promise<void>;
  onNavigateToTab?: (tab: 'tiempos-historicos' | 'live' | 'hall-of-fame' | 'tiempos') => void;
  onStartQuickRace?: (selectedPlayers: Player[], selectedCircuits: Circuit[]) => void;
  onStartCustomRace?: (settings: any) => void;
}

type AdminSection = 'menu' | 'admin' | 'peligro' | 'quick' | 'custom';

const F1AdminLayout: React.FC<F1AdminLayoutProps> = ({
  currentUser,
  currentPlayer,
  players,
  circuits,
  onLogout,
  onBack,
  onRecalculateScores,
  onCancelGame,
  onNavigateToTab,
  onStartQuickRace,
  onStartCustomRace
}) => {
  const [currentSection, setCurrentSection] = useState<AdminSection>('menu');
  const [activeAdminTab, setActiveAdminTab] = useState<'players' | 'circuits'>('players');

  const handleNavigate = (destination: string) => {
    switch (destination) {
      case 'admin':
        setCurrentSection('admin');
        setActiveAdminTab('players');
        break;
      case 'peligro':
        setCurrentSection('peligro');
        break;
      case 'quick':
        setCurrentSection('quick');
        break;
      case 'custom':
        setCurrentSection('custom');
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
      
      case 'custom':
        return (
          <F1CustomChampionship
            players={players}
            circuits={circuits}
            onBack={handleBackToMenu}
            onStartRace={(settings) => {
              if (onStartCustomRace) {
                onStartCustomRace(settings);
              }
            }}
          />
        );
      
      case 'admin':
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
      
      case 'peligro':
        return (
          <F1DangerZone
            onBack={handleBackToMenu}
            onRecalculateScores={onRecalculateScores}
            onCancelGame={onCancelGame}
          />
        );
      
      default:
        return <F1ParcFerme onNavigate={handleNavigate} />;
    }
  };

  const handleTabChange = (tab: 'tiempos-historicos' | 'live' | 'hall-of-fame' | 'tiempos') => {
    if (tab === 'tiempos') {
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
        onAdminAccess={onBack}
        hasActiveGame={false}
        hasAdminPrivileges={true}
      />

      {/* Main Content */}
      <main className="pb-20">
        {renderContent()}
      </main>

      {/* F1 Bottom Navigation */}
      <F1Navigation
        activeTab={'tiempos'}
        onTabChange={handleTabChange}
        hasActiveGame={false}
        hasAdminPrivileges={true}
      />
    </div>
  );
};

export default F1AdminLayout;