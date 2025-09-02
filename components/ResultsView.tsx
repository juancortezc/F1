import React, { useState, useMemo } from 'react';
import { GameState, NightlyResult, Player, PlayerStats, Circuit, GameHistoryEntry } from '../types';
import { ScoreCalculator } from '../utils/ScoreCalculator';
import UserAvatar from './UserAvatar';

interface ResultsViewProps {
  gameState: GameState;
  players: Player[];
  circuits: Circuit[];
  gameHistory: GameHistoryEntry[];
  activeGame?: { id: string; state: GameState } | null;
  onNewGame: () => void;
}

const formatTime = (ms: number | null | undefined): string => {
    if (ms === null || ms === undefined || ms === Infinity || !isFinite(ms)) return '-:--.---';
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor(ms % 1000); // Ensure it's an integer
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0').substring(0, 3)}`; // Ensure max 3 digits
};

// F1 Podium Cards Component - Similar to F1HallOfFame but with current championship points
const PodiumCards: React.FC<{ 
  gameState: GameState; 
  players: Player[]; 
  isActive: boolean;
}> = ({ gameState, players, isActive }) => {
  // Get standings from current gameState
  const standings = useMemo(() => {
    if (!gameState?.playerStats) return [];
    
    return Object.entries(gameState.playerStats)
      .map(([playerId, stats]) => ({
        player: players.find(p => p.id === playerId)!,
        ...(stats as PlayerStats)
      }))
      .filter(s => s.player)
      .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  }, [gameState, players]);

  const [first, second, third] = standings;
  const remainingPlayers = standings.slice(3);

  if (standings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🏁</div>
        <h2 className="text-2xl font-bold text-white mb-2">No hay datos disponibles</h2>
        <p className="text-zinc-400">
          {isActive ? 'El campeonato aún no ha comenzado' : 'No se encontraron resultados históricos'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Championship Status Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          {isActive ? 'CAMPEONATO ACTIVO' : 'ÚLTIMO CAMPEONATO'}
        </h1>
        <div className="w-20 h-1 bg-f1-red mx-auto"></div>
      </div>

      {/* Podium Cards */}
      <div className="flex justify-center items-end gap-4 mb-8">
        {/* Second Place - Left */}
        {second && (
          <div 
            className="relative rounded-lg border-2 border-f1-red p-4 text-center bg-black"
            style={{ minHeight: '140px', width: '100px' }}
          >
            {/* Position Badge */}
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-zinc-300 rounded-full flex items-center justify-center z-10 border-2 border-black">
              <span className="font-mono font-bold text-sm text-black">2</span>
            </div>
            <div className="relative inline-block">
              <UserAvatar
                imageUrl={second.player.imageUrl}
                name={second.player.name}
                className="w-16 h-16 mx-auto mb-2 ring-2 ring-f1-red"
              />
            </div>
            <h3 className="text-white font-bold text-sm mb-1">{second.player.name}</h3>
            <div className="text-zinc-300 font-mono font-bold text-lg">{second.totalScore}</div>
            <div className="text-zinc-400 text-xs">PUNTOS</div>
          </div>
        )}

        {/* First Place - Center (Larger) */}
        {first && (
          <div 
            className="relative rounded-lg border-2 border-f1-red p-6 text-center bg-black"
            style={{ minHeight: '160px', width: '120px' }}
          >
            {/* Position Badge */}
            <div className="absolute -top-3 -right-3 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center z-10 border-2 border-black shadow-lg">
              <span className="font-mono font-bold text-base text-black">1</span>
            </div>
            <div className="relative inline-block">
              <UserAvatar
                imageUrl={first.player.imageUrl}
                name={first.player.name}
                className="w-20 h-20 mx-auto mb-3 ring-2 ring-f1-red"
              />
            </div>
            <h3 className="text-white font-bold text-base mb-2">{first.player.name}</h3>
            <div className="text-white font-mono font-bold text-xl">{first.totalScore}</div>
            <div className="text-zinc-400 text-xs">PUNTOS</div>
          </div>
        )}

        {/* Third Place - Right */}
        {third && (
          <div 
            className="relative rounded-lg border-2 border-f1-red p-4 text-center bg-black"
            style={{ minHeight: '140px', width: '100px' }}
          >
            {/* Position Badge */}
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center z-10 border-2 border-black">
              <span className="font-mono font-bold text-sm text-black">3</span>
            </div>
            <div className="relative inline-block">
              <UserAvatar
                imageUrl={third.player.imageUrl}
                name={third.player.name}
                className="w-16 h-16 mx-auto mb-2 ring-2 ring-f1-red"
              />
            </div>
            <h3 className="text-white font-bold text-sm mb-1">{third.player.name}</h3>
            <div className="text-zinc-300 font-mono font-bold text-lg">{third.totalScore}</div>
            <div className="text-zinc-400 text-xs">PUNTOS</div>
          </div>
        )}
      </div>

      {/* Remaining Players Table (4th place and below) */}
      {remainingPlayers.length > 0 && (
        <div className="bg-black border-2 border-f1-red rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-zinc-900 border-b border-f1-red">
            <h4 className="text-white font-bold font-mono uppercase tracking-wide">
              RESTO DE CLASIFICACIÓN
            </h4>
          </div>
          <div className="divide-y divide-zinc-800">
            {/* Show only 4th place and below */}
            {remainingPlayers.map((playerData, index) => (
              <div key={playerData.player.id} className="px-4 py-3 flex justify-between items-center bg-black hover:bg-zinc-900 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="font-bold font-mono text-lg w-8 text-zinc-400">
                    {index + 4}
                  </span>
                  <span className="text-white font-bold">{playerData.player.name}</span>
                </div>
                <span className="text-white font-mono font-bold text-lg">{playerData.totalScore || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


const ResultsView: React.FC<ResultsViewProps> = ({ 
  gameState, 
  players, 
  circuits, 
  gameHistory, 
  activeGame,
  onNewGame 
}) => {
    // Get the appropriate game state to display
    const getDisplayGameState = () => {
      // If there's an active game, use its state
      if (activeGame && activeGame.state && Object.keys(activeGame.state.playerStats || {}).length > 0) {
        return { gameState: activeGame.state, isActive: true };
      }
      
      // Otherwise, find the last completed championship
      const lastGame = gameHistory
        .filter(g => g.state?.playerStats && Object.keys(g.state.playerStats).length > 0)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
        
      if (lastGame && lastGame.state) {
        return { gameState: lastGame.state as GameState, isActive: false };
      }
      
      // Fallback - no data available
      return { gameState: null, isActive: false };
    };

    const { gameState: displayGameState, isActive } = getDisplayGameState();

    // If no data available, show empty state
    if (!displayGameState) {
      return (
        <div className="min-h-screen bg-black">
          <div className="p-4">
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🏁</div>
              <h2 className="text-2xl font-bold text-white mb-2">No hay datos disponibles</h2>
              <p className="text-zinc-400">No se encontraron campeonatos para mostrar</p>
            </div>
          </div>
        </div>
      );
    }

    return (
        <div className="min-h-screen bg-black">
            <div className="p-4">
                <div className="space-y-8">
                    <PodiumCards gameState={displayGameState} players={players} isActive={isActive} />
                </div>
            </div>
        </div>
    );
};

export default ResultsView;