import React, { useMemo } from 'react';
import { GameState, Player, Circuit, GameHistoryEntry, PlayerStats } from '../types';

interface StatsViewProps {
  gameState: GameState;
  players: Player[];
  circuits: Circuit[];
  gameHistory: GameHistoryEntry[];
  onNewGame: () => void;
}

interface AccumulatedStats {
  player: Player;
  championships: number;
  totalVictories: number;
  bestLaps: number;
  bestAverages: number;
  totalScore: number;
  favoriteCircuit: string | null;
}


const formatTime = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined) return '-:--.---';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

const StatsView: React.FC<StatsViewProps> = ({ 
  gameState, 
  players, 
  circuits, 
  gameHistory, 
  onNewGame 
}) => {
  const { accumulatedStats } = useMemo(() => {
    // Initialize accumulated stats for each player
    const playerAccStats: Record<string, AccumulatedStats> = {};
    players.forEach(player => {
      playerAccStats[player.id] = {
        player,
        championships: 0,
        totalVictories: 0,
        bestLaps: 0,
        bestAverages: 0,
        totalScore: 0,
        favoriteCircuit: null
      };
    });

    // Track favorite circuits
    const victoryCount: Record<string, Record<string, number>> = {}; // playerId -> circuitId -> count

    // Initialize counters
    players.forEach(player => {
      victoryCount[player.id] = {};
      circuits.forEach(circuit => {
        victoryCount[player.id][circuit.id] = 0;
      });
    });

    // Process completed games
    gameHistory.forEach((game, gameIndex) => {
      if (game.state && game.state.playerStats) {
        // Find winner (player with highest total score) - using same logic as API
        const standings = Object.entries(game.state.playerStats)
          .map(([playerId, stats]) => ({
            playerId,
            totalScore: (stats as PlayerStats).totalScore || 0
          }))
          .sort((a, b) => b.totalScore - a.totalScore);
        
        // Add championship to winner (first in standings)
        if (standings.length > 0 && playerAccStats[standings[0].playerId]) {
          playerAccStats[standings[0].playerId].championships++;
        }

        // Calculate victories from circuitResults (correct approach)
        if (game.state.circuitResults && Array.isArray(game.state.circuitResults)) {
          game.state.circuitResults.forEach((circuitResult: any) => {
            if (circuitResult.turns && Array.isArray(circuitResult.turns)) {
              circuitResult.turns.forEach((turn: any) => {
                if (Array.isArray(turn)) {
                  // Count best average victories
                  const sortedByAverage = turn
                    .filter((p: any) => p.averageTime && p.averageTime > 0)
                    .sort((a: any, b: any) => a.averageTime - b.averageTime);
                  
                  if (sortedByAverage.length > 0 && playerAccStats[sortedByAverage[0].playerId]) {
                    playerAccStats[sortedByAverage[0].playerId].bestAverages++;
                    playerAccStats[sortedByAverage[0].playerId].totalVictories++;
                  }
                  
                  // Count best lap victories
                  const sortedByLap = turn
                    .map((p: any) => ({
                      ...p,
                      bestLap: p.lapTimes ? Math.min(...p.lapTimes.filter((t: number) => t > 0)) : Infinity
                    }))
                    .filter((p: any) => p.bestLap !== Infinity)
                    .sort((a: any, b: any) => a.bestLap - b.bestLap);
                  
                  if (sortedByLap.length > 0 && playerAccStats[sortedByLap[0].playerId]) {
                    playerAccStats[sortedByLap[0].playerId].bestLaps++;
                    playerAccStats[sortedByLap[0].playerId].totalVictories++;
                  }
                }
              });
            }
          });
        }

        // Add total scores for ranking
        Object.entries(game.state.playerStats || {}).forEach(([playerId, stats]) => {
          if (playerAccStats[playerId]) {
            playerAccStats[playerId].totalScore += (stats as PlayerStats).totalScore || 0;
          }
        });

        // Process circuit results for best performers
        if (game.state.circuitResults) {
          game.state.circuitResults.forEach((circuitResult, circuitIndex) => {
            const circuitId = game.state.circuits[circuitIndex]?.id;
            if (!circuitId) return;

            circuitResult.turns.forEach(turn => {
              if (turn.length > 0) {
                // Find winner of this turn (highest turnScore)
                const turnWinner = turn.reduce((prev, current) => 
                  current.turnScore > prev.turnScore ? current : prev
                );
                
                if (victoryCount[turnWinner.playerId] && victoryCount[turnWinner.playerId][circuitId] !== undefined) {
                  victoryCount[turnWinner.playerId][circuitId]++;
                }
              }
            });
          });
        }
      }
    });

    // Add current game stats ONLY if game is still active (not finished)
    const isGameFinished = gameState ? gameState.currentCircuitIndex >= gameState.settings.circuits.length : false;
    
    if (gameState && gameState.circuitResults && !isGameFinished) {
      gameState.circuitResults.forEach((circuitResult: any) => {
        if (circuitResult.turns && Array.isArray(circuitResult.turns)) {
          circuitResult.turns.forEach((turn: any) => {
            if (Array.isArray(turn)) {
              // Count best average victories
              const sortedByAverage = turn
                .filter((p: any) => p.averageTime && p.averageTime > 0)
                .sort((a: any, b: any) => a.averageTime - b.averageTime);
              
              if (sortedByAverage.length > 0 && playerAccStats[sortedByAverage[0].playerId]) {
                playerAccStats[sortedByAverage[0].playerId].bestAverages++;
                playerAccStats[sortedByAverage[0].playerId].totalVictories++;
              }
              
              // Count best lap victories
              const sortedByLap = turn
                .map((p: any) => ({
                  ...p,
                  bestLap: p.lapTimes ? Math.min(...p.lapTimes.filter((t: number) => t > 0)) : Infinity
                }))
                .filter((p: any) => p.bestLap !== Infinity)
                .sort((a: any, b: any) => a.bestLap - b.bestLap);
              
              if (sortedByLap.length > 0 && playerAccStats[sortedByLap[0].playerId]) {
                playerAccStats[sortedByLap[0].playerId].bestLaps++;
                playerAccStats[sortedByLap[0].playerId].totalVictories++;
              }
            }
          });
        }
      });
      
      // Add current game total scores (only if game is still active)
      if (gameState.playerStats && !isGameFinished) {
        Object.entries(gameState.playerStats).forEach(([playerId, stats]) => {
          if (playerAccStats[playerId]) {
            playerAccStats[playerId].totalScore += (stats as PlayerStats).totalScore || 0;
          }
        });
      }
    }

    // Calculate favorite circuit for each player
    Object.entries(victoryCount).forEach(([playerId, playerCircuits]) => {
      let maxVictories = 0;
      let favoriteCircuitId: string | null = null;
      
      Object.entries(playerCircuits).forEach(([circuitId, count]) => {
        if (count > maxVictories) {
          maxVictories = count;
          favoriteCircuitId = circuitId;
        }
      });
      
      if (favoriteCircuitId && playerAccStats[playerId]) {
        const circuit = circuits.find(c => c.id === favoriteCircuitId);
        playerAccStats[playerId].favoriteCircuit = circuit ? circuit.name : null;
      }
    });

    // Calculate ranking (championships * 10 + bestLaps * 2 + bestAverages)
    const rankedStats = Object.values(playerAccStats)
      .map(stats => ({
        ...stats,
        rankingScore: stats.championships * 10 + stats.bestLaps * 2 + stats.bestAverages
      }))
      .sort((a, b) => b.rankingScore - a.rankingScore);


    return {
      accumulatedStats: rankedStats
    };
  }, [gameHistory, gameState, players, circuits]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Ranking Acumulado Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-md">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-f1-xl font-bold text-zinc-100">Ranking Acumulado</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-800 text-zinc-200 text-xs uppercase tracking-wide">
                <th className="px-2 py-3 text-center font-bold">POS</th>
                <th className="px-4 py-3 text-left font-bold">JUG</th>
                <th className="px-2 py-3 text-center font-bold">CMP</th>
                <th className="px-2 py-3 text-center font-bold">VIC</th>
                <th className="px-2 py-3 text-center font-bold">VR</th>
                <th className="px-2 py-3 text-center font-bold">PR</th>
                <th className="px-3 py-3 text-center font-bold">CRT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {accumulatedStats.map((stats, index) => (
                <tr key={stats.player.id} className={`${index % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-950'}`}>
                  <td className="px-2 py-3 text-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mx-auto ${
                      index === 0 ? 'bg-f1-yellow text-black' :
                      index <= 2 ? 'bg-zinc-600 text-zinc-100' :
                      'bg-zinc-700 text-zinc-300'
                    }`}>
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-zinc-100 text-base">
                      {stats.player.name}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span className="font-mono font-bold text-zinc-100 text-lg">
                      {stats.championships}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span className="font-mono font-bold text-zinc-100 text-lg">
                      {stats.totalVictories}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span className="font-mono font-bold text-zinc-100 text-lg">
                      {stats.bestLaps}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span className="font-mono font-bold text-zinc-100 text-lg">
                      {stats.bestAverages}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="font-semibold text-zinc-300 text-sm">
                      {stats.favoriteCircuit || '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default StatsView;