import React, { useState } from 'react';
import { UserSession, Player, Circuit } from '../types';
import F1Header from './F1Header';
import F1ParcFerme from './F1ParcFerme';
import AdminView from './AdminView';

interface F1AdminLayoutProps {
  currentUser: UserSession;
  currentPlayer?: Player | null;
  players: Player[];
  circuits: Circuit[];
  onLogout: () => void;
  onBack: () => void;
  onRecalculateScores?: () => Promise<void>;
}

type AdminSection = 'menu' | 'pilotos' | 'circuitos';

const F1AdminLayout: React.FC<F1AdminLayoutProps> = ({
  currentUser,
  currentPlayer,
  players,
  circuits,
  onLogout,
  onBack,
  onRecalculateScores
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
      <main>
        {renderContent()}
      </main>
    </div>
  );
};

export default F1AdminLayout;