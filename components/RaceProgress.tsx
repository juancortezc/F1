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
      {/* Progress Header */}
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

      {/* Classification Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="text-xl font-bold text-zinc-100">Clasificación General</h3>
        </div>
        
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-800">
              <tr className="text-left">
                <th className="p-4 text-zinc-300 font-semibold">POS</th>
                <th className="p-4 text-zinc-300 font-semibold">JUGADOR</th>
                <th className="p-4 text-zinc-300 font-semibold text-center">PTS</th>
                <th className="p-4 text-zinc-300 font-semibold text-center">VR</th>
                <th className="p-4 text-zinc-300 font-semibold text-center">PR</th>
                <th className="p-4 text-zinc-300 font-semibold text-center">1°</th>
                <th className="p-4 text-zinc-300 font-semibold text-center">2°</th>
                <th className="p-4 text-zinc-300 font-semibold text-center">3°</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing, index) => (
                <tr key={standing.player.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                  <td className="p-4">
                    <span className={`font-bold text-lg ${
                      index === 0 ? 'text-yellow-400' :
                      index === 1 ? 'text-zinc-300' :
                      index === 2 ? 'text-amber-600' :
                      'text-zinc-400'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="font-semibold text-zinc-100">{standing.player.name}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="font-bold text-zinc-100">{standing.score}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-zinc-300">{standing.bestLaps}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-zinc-300">{standing.bestAverages}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-yellow-400 font-semibold">{standing.firsts}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-zinc-300 font-semibold">{standing.seconds}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-amber-600 font-semibold">{standing.thirds}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden">
          {standings.map((standing, index) => (
            <div key={standing.player.id} className="p-4 border-b border-zinc-800 last:border-b-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={`font-bold text-xl w-8 text-center ${
                    index === 0 ? 'text-yellow-400' :
                    index === 1 ? 'text-zinc-300' :
                    index === 2 ? 'text-amber-600' :
                    'text-zinc-400'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="font-semibold text-zinc-100 text-lg">{standing.player.name}</span>
                </div>
                <span className="font-bold text-zinc-100 text-xl">{standing.score} pts</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Vueltas Rápidas:</span>
                  <span className="text-zinc-300 font-semibold">{standing.bestLaps}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Mejores Promedios:</span>
                  <span className="text-zinc-300 font-semibold">{standing.bestAverages}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Primeros:</span>
                  <span className="text-yellow-400 font-semibold">{standing.firsts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Segundos:</span>
                  <span className="text-zinc-300 font-semibold">{standing.seconds}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RaceProgress;