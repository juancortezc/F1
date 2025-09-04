import React, { useState, useEffect } from 'react';
import { UserSession, Player, Circuit, GameState, GameHistoryEntry } from '../types';
import F1Header from './F1Header';
import F1Navigation from './F1Navigation';
import F1HallOfFame from './F1HallOfFame';
import TimesPage from './TimesPage';
import LivePage from './LivePage';
import AdminView from './AdminView';
import ResultsView from './ResultsView';
import RaceView from './RaceView';
import HistoricalTimesView from './HistoricalTimesView';

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
  onTurnComplete?: (playerId: string, lapTimes: number[], newControllerId?: string) => void;
  onNextCircuit?: () => void;
  onGameEnd?: () => void;
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
  onNavigateToHub,
  onTurnComplete,
  onNextCircuit,
  onGameEnd
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
        // Use HistoricalTimesView for organized historical lap times
        return (
          <HistoricalTimesView
            players={players}
            circuits={circuits}
            gameHistory={gameHistory || []}
            activeGame={activeGame}
          />
        );
        
      case 'tiempos':
        // Show RaceView when there's an active game, TimesPage otherwise
        if (activeGame && activeGame.state && onTurnComplete && onNextCircuit && onGameEnd) {
          return (
            <RaceView
              gameState={activeGame.state}
              players={players}
              gameId={activeGame.id}
              onTurnComplete={onTurnComplete}
              onNextCircuit={onNextCircuit}
              onGameEnd={onGameEnd}
              currentUser={{ userId: currentUser.userId, name: currentUser.name }}
            />
          );
        } else {
          return (
            <TimesPage 
              players={players} 
              circuits={circuits} 
              currentGameId={activeGame?.id}
            />
          );
        }
        
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
    <div className="fixed inset-0 flex flex-col" style={{ backgroundColor: '#1A1A1A', height: '100vh', height: 'var(--app-height, 100vh)' }}>
      {/* F1 Header */}
      <div className="fixed-top-nav">
        <F1Header
          currentUser={currentUser}
          currentPlayer={currentPlayer}
          onLogout={onLogout}
          onCancelGame={onCancelGame}
          onAdminAccess={handleAdminAccess}
          hasActiveGame={hasActiveGameRunning}
          hasAdminPrivileges={hasAdminPrivileges}
        />
      </div>

      {/* Main Content - Scrollable with proper padding */}
      <main className="flex-1 main-content content-with-nav ios-scroll-fix">
        <div className="min-h-full">
          {renderContent()}
        </div>
      </main>

      {/* F1 Bottom Navigation */}
      <div className="fixed-bottom-nav z-bottom-nav">
        <F1Navigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hasActiveGame={hasActiveGameRunning || false}
          hasAdminPrivileges={hasAdminPrivileges}
        />
      </div>
    </div>
  );
};

export default F1Layout;