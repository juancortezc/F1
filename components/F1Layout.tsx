import React, { useState, useEffect } from 'react';
import { UserSession, Player, Circuit, GameState, GameHistoryEntry } from '../types';
import F1Header from './F1Header';
import F1Navigation from './F1Navigation';
import F1HallOfFame from './F1HallOfFame';
import TimesPage from './TimesPage';
import LivePage from './LivePage';
import AdminView from './AdminView';
import ResultsView from './ResultsView';

interface F1LayoutProps {
  currentUser: UserSession;
  currentPlayer?: Player | null;
  players: Player[];
  circuits: Circuit[];
  activeGame?: { id: string; state: GameState } | null;
  gameHistory: GameHistoryEntry[];
  hasAdminPrivileges: boolean;
  onLogout: () => void;
  onCancelGame?: () => void;
  onRecalculateScores?: () => Promise<void>;
  onNavigateToHub?: () => void;
}

type F1Tab = 'tiempos-historicos' | 'live' | 'hall-of-fame' | 'tiempos';

const F1Layout: React.FC<F1LayoutProps> = ({
  currentUser,
  currentPlayer,
  players,
  circuits,
  activeGame,
  gameHistory,
  hasAdminPrivileges,
  onLogout,
  onCancelGame,
  onRecalculateScores,
  onNavigateToHub
}) => {
  const [activeTab, setActiveTab] = useState<F1Tab>('hall-of-fame');

  // Auto-redirect logic based on game state
  useEffect(() => {
    const hasActiveGameRunning = activeGame && activeGame.state && 
      activeGame.state.currentCircuitIndex < activeGame.state.settings.circuits.length;
    
    if (hasActiveGameRunning) {
      // Active game exists - go to LIVE
      setActiveTab('live');
    } else {
      // No active game - go to Hall of Fame
      setActiveTab('hall-of-fame');
    }
  }, [activeGame]);

  const hasActiveGameRunning = activeGame && activeGame.state && 
    activeGame.state.currentCircuitIndex < activeGame.state.settings.circuits.length;

  const handleAdminAccess = () => {
    if (onNavigateToHub) {
      onNavigateToHub();
    }
  };

  const renderContent = () => {
    // Add safety checks for data
    if (!players || !circuits) {
      return (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-white mb-2">Cargando datos...</h2>
          <p className="text-zinc-400">Obteniendo información del sistema</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'tiempos-historicos':
        // Use ResultsView for historical results 
        const historicalGameState = {
          settings: { name: 'Resultados', circuits: [], players: [] },
          currentCircuitIndex: 0,
          playerStats: {},
          circuitResults: []
        } as any;
        
        return (
          <ResultsView
            gameState={activeGame?.state || historicalGameState}
            players={players}
            circuits={circuits}
            gameHistory={gameHistory || []}
            activeGame={activeGame}
            onNewGame={() => {/* No action needed for navigation view */}}
          />
        );
        
      case 'tiempos':
        return (
          <TimesPage 
            players={players} 
            circuits={circuits} 
            currentGameId={activeGame?.id}
          />
        );
        
      case 'live':
        if (activeGame && activeGame.state) {
          return (
            <LivePage 
              gameState={activeGame.state} 
              players={players} 
              circuits={circuits} 
              gameId={activeGame.id}
            />
          );
        } else {
          return (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🏁</div>
              <h2 className="text-2xl font-bold text-white mb-2">No hay campeonato activo</h2>
              <p className="text-zinc-400">No hay datos de timing en vivo para mostrar</p>
            </div>
          );
        }
        
      case 'hall-of-fame':
        // Use the same default structure as StatsView
        const defaultGameState = {
          settings: { name: 'Estadísticas Históricas', circuits: [], players: [] },
          currentCircuitIndex: 0,
          playerStats: {},
          circuitResults: []
        } as any;
        
        return (
          <F1HallOfFame
            gameState={activeGame?.state || defaultGameState}
            players={players}
            circuits={circuits}
            gameHistory={gameHistory || []}
          />
        );
        
      default:
        return (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-white mb-2">Página no encontrada</h2>
            <p className="text-zinc-400">La página solicitada no existe</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1A1A1A' }}>
      {/* F1 Header */}
      <F1Header
        currentUser={currentUser}
        currentPlayer={currentPlayer}
        onLogout={onLogout}
        onCancelGame={onCancelGame}
        onAdminAccess={handleAdminAccess}
        hasActiveGame={hasActiveGameRunning}
        hasAdminPrivileges={hasAdminPrivileges}
      />

      {/* Main Content */}
      <main className="pb-20">
        {renderContent()}
      </main>

      {/* F1 Bottom Navigation */}
      <F1Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasActiveGame={hasActiveGameRunning || false}
        hasAdminPrivileges={hasAdminPrivileges}
      />
    </div>
  );
};

export default F1Layout;