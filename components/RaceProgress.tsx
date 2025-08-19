import React from 'react';
import { GameState, Player } from '../types';

interface RaceProgressProps {
  gameState: GameState;
  players: Player[];
}

// Calculate turn positions for each player per circuit
const calculateTurnPositions = (gameState: GameState, players: Player[]) => {
  const playerTurnPositions: Record<string, { firsts: number; seconds: number; thirds: number }> = {};
  
  // Initialize counters
  players.forEach(player => {
    playerTurnPositions[player.id] = { firsts: 0, seconds: 0, thirds: 0 };
  });

  // Process each circuit's results
  gameState.circuitResults.forEach(circuit => {
    circuit.turns.forEach(turn => {
      // Sort players by turn score for this specific turn
      const turnStandings = [...turn].sort((a, b) => b.turnScore - a.turnScore);
      
      // Award positions (only top 3)
      if (turnStandings[0]) playerTurnPositions[turnStandings[0].playerId].firsts++;
      if (turnStandings[1]) playerTurnPositions[turnStandings[1].playerId].seconds++;
      if (turnStandings[2]) playerTurnPositions[turnStandings[2].playerId].thirds++;
    });
  });

  return playerTurnPositions;
};

const RaceProgress: React.FC<RaceProgressProps> = ({ gameState, players }) => {
  const { settings, currentCircuitIndex, currentTurn } = gameState;
  const totalCircuits = settings.circuits.length;
  const totalTurns = settings.turnsPerCircuit;
  
  // Calculate overall progress
  const completedCircuits = currentCircuitIndex;
  const completedTurns = completedCircuits * totalTurns + (currentTurn - 1);
  const totalProgressTurns = totalCircuits * totalTurns;
  const overallProgress = Math.round((completedTurns / totalProgressTurns) * 100);
  
  // Get current standings with additional stats
  const turnPositions = calculateTurnPositions(gameState, players);
  
  const standings = Object.entries(gameState.playerStats)
    .map(([playerId, stats]) => {
      const player = players.find(p => p.id === playerId)!;
      const positions = turnPositions[playerId] || { firsts: 0, seconds: 0, thirds: 0 };
      
      return {
        player,
        score: stats.totalScore,
        bestLaps: stats.bestLaps || 0,
        bestAverages: stats.bestAverages || 0,
        firsts: positions.firsts,
        seconds: positions.seconds,
        thirds: positions.thirds
      };
    })
    .filter(s => s.player)
    .sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-6">
      {/* Points Section - Mobile optimized */}
      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-md">
        <h3 className="text-lg font-bold text-zinc-100 mb-3">Puntuación Actual</h3>
        <div className="space-y-2">
          {standings.map((standing, index) => (
            <div key={standing.player.id} className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className={`font-bold text-sm w-6 ${
                  index === 0 ? 'text-yellow-400' :
                  index === 1 ? 'text-zinc-300' :
                  index === 2 ? 'text-amber-600' :
                  'text-zinc-400'
                }`}>
                  {index + 1}
                </span>
                <span className="text-zinc-100 font-semibold">{standing.player.name}</span>
              </div>
              <span className="font-bold text-zinc-100 font-mono">{standing.score} pts</span>
            </div>
          ))}
        </div>
      </div>

      {/* Classification Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="text-xl font-bold text-zinc-100">Resultados</h3>
        </div>
        
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead className="bg-zinc-800">
              <tr className="text-left">
                <th className="px-3 py-2 text-zinc-400 font-semibold text-xs uppercase tracking-wide">POS</th>
                <th className="px-3 py-2 text-zinc-400 font-semibold text-xs uppercase tracking-wide">JUGADOR</th>
                <th className="px-3 py-2 text-zinc-400 font-semibold text-xs uppercase tracking-wide text-center">PTS</th>
                <th className="px-3 py-2 text-zinc-400 font-semibold text-xs uppercase tracking-wide text-center">VR</th>
                <th className="px-3 py-2 text-zinc-400 font-semibold text-xs uppercase tracking-wide text-center">PR</th>
                <th className="px-3 py-2 text-zinc-400 font-semibold text-xs uppercase tracking-wide text-center">1º</th>
                <th className="px-3 py-2 text-zinc-400 font-semibold text-xs uppercase tracking-wide text-center">2º</th>
                <th className="px-3 py-2 text-zinc-400 font-semibold text-xs uppercase tracking-wide text-center">3º</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing, index) => (
                <tr key={standing.player.id} className="border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-3 py-2">
                    <span className={`font-bold ${
                      index === 0 ? 'text-yellow-400' :
                      index === 1 ? 'text-zinc-300' :
                      index === 2 ? 'text-amber-600' :
                      'text-zinc-400'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-semibold text-zinc-100">{standing.player.name}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="font-bold text-zinc-100">{standing.score}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-zinc-100 font-bold">{standing.bestLaps}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-zinc-100 font-bold">{standing.bestAverages}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-yellow-400 font-bold">{standing.firsts}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-zinc-300 font-bold">{standing.seconds}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-amber-600 font-bold">{standing.thirds}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Table */}
        <div className="md:hidden">
          {/* Mobile Header */}
          <div className="grid grid-cols-9 gap-1 px-3 py-2 bg-zinc-800 text-xs font-mono uppercase tracking-wide border-b border-zinc-800">
            <div className="text-zinc-400">POS</div>
            <div className="text-zinc-400 col-span-3">JUGADOR</div>
            <div className="text-zinc-400 text-center">VR</div>
            <div className="text-zinc-400 text-center">PR</div>
            <div className="text-zinc-400 text-center">1º</div>
            <div className="text-zinc-400 text-center">2º</div>
            <div className="text-zinc-400 text-center">3º</div>
          </div>
          
          {/* Mobile Data Rows */}
          {standings.map((standing, index) => (
            <div key={standing.player.id} className="grid grid-cols-9 gap-1 px-3 py-2 border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors text-sm font-mono">
              <div className={`font-bold ${
                index === 0 ? 'text-yellow-400' :
                index === 1 ? 'text-zinc-300' :
                index === 2 ? 'text-amber-600' :
                'text-zinc-400'
              }`}>
                {index + 1}
              </div>
              <div className="text-zinc-100 font-semibold col-span-3 truncate">{standing.player.name}</div>
              <div className="text-zinc-100 font-bold text-center">{standing.bestLaps}</div>
              <div className="text-zinc-100 font-bold text-center">{standing.bestAverages}</div>
              <div className="text-yellow-400 font-bold text-center">{standing.firsts}</div>
              <div className="text-zinc-300 font-bold text-center">{standing.seconds}</div>
              <div className="text-amber-600 font-bold text-center">{standing.thirds}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Section - Now at the bottom */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-zinc-100">Progreso del Campeonato</h3>
          <span className="text-zinc-300">
            Circuito {currentCircuitIndex + 1} de {totalCircuits}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-zinc-700 rounded-full h-3 mb-4">
          <div 
            className="bg-red-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-zinc-400">
          <span>Turno {currentTurn} de {totalTurns}</span>
          <span>{overallProgress}% Completado</span>
        </div>
      </div>
    </div>
  );
};

export default RaceProgress;