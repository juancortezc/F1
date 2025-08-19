import React, { useMemo } from 'react';
import { GameState, Player, Circuit, GameHistoryEntry, PlayerStats } from '../types';
import DataCard from './DataCard';
import StatsGrid from './StatsGrid';

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
  bestLaps: number;
  bestAverages: number;
  totalScore: number;
}

interface BestPerformer {
  player: Player;
  circuit: Circuit;
  count: number;
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
  const { accumulatedStats, bestPerformers } = useMemo(() => {
    // Initialize accumulated stats for each player
    const playerAccStats: Record<string, AccumulatedStats> = {};
    players.forEach(player => {
      playerAccStats[player.id] = {
        player,
        championships: 0,
        bestLaps: 0,
        bestAverages: 0,
        totalScore: 0
      };
    });

    // Track best performers by circuit
    const victoryCount: Record<string, Record<string, number>> = {}; // playerId -> circuitId -> count
    const bestLapCount: Record<string, Record<string, number>> = {};
    const bestAvgCount: Record<string, Record<string, number>> = {};

    // Initialize counters
    players.forEach(player => {
      victoryCount[player.id] = {};
      bestLapCount[player.id] = {};
      bestAvgCount[player.id] = {};
      circuits.forEach(circuit => {
        victoryCount[player.id][circuit.id] = 0;
        bestLapCount[player.id][circuit.id] = 0;
        bestAvgCount[player.id][circuit.id] = 0;
      });
    });

    // Process completed games
    gameHistory.forEach(game => {
      if (game.state && game.state.playerStats) {
        // Find winner (player with highest total score)
        const playerStatsEntries = Object.entries(game.state.playerStats);
        if (playerStatsEntries.length > 0) {
          const winner = playerStatsEntries.reduce((prev, current) => 
            (current[1] as PlayerStats).totalScore > (prev[1] as PlayerStats).totalScore ? current : prev
          );
          
          // Add championship
          if (playerAccStats[winner[0]]) {
            playerAccStats[winner[0]].championships++;
          }
        }

        // Process each player's stats
        Object.entries(game.state.playerStats).forEach(([playerId, stats]) => {
          if (playerAccStats[playerId]) {
            playerAccStats[playerId].bestLaps += (stats as PlayerStats).bestLaps || 0;
            playerAccStats[playerId].bestAverages += (stats as PlayerStats).bestAverages || 0;
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

    // Add current game stats if active
    if (gameState && gameState.playerStats) {
      Object.entries(gameState.playerStats).forEach(([playerId, stats]) => {
        if (playerAccStats[playerId]) {
          playerAccStats[playerId].bestLaps += (stats as PlayerStats).bestLaps || 0;
          playerAccStats[playerId].bestAverages += (stats as PlayerStats).bestAverages || 0;
          playerAccStats[playerId].totalScore += (stats as PlayerStats).totalScore || 0;
        }
      });
    }

    // Calculate ranking (championships * 10 + bestLaps * 2 + bestAverages)
    const rankedStats = Object.values(playerAccStats)
      .map(stats => ({
        ...stats,
        rankingScore: stats.championships * 10 + stats.bestLaps * 2 + stats.bestAverages
      }))
      .sort((a, b) => b.rankingScore - a.rankingScore);

    // Find best performers
    const findBestPerformer = (counts: Record<string, Record<string, number>>): BestPerformer | null => {
      let best: BestPerformer | null = null;
      let maxCount = 0;

      Object.entries(counts).forEach(([playerId, playerCircuits]) => {
        Object.entries(playerCircuits).forEach(([circuitId, count]) => {
          if (count > maxCount) {
            const player = players.find(p => p.id === playerId);
            const circuit = circuits.find(c => c.id === circuitId);
            if (player && circuit) {
              maxCount = count;
              best = { player, circuit, count };
            }
          }
        });
      });

      return best;
    };

    const bestVictories = findBestPerformer(victoryCount);
    const bestVR = findBestPerformer(bestLapCount);
    const bestPR = findBestPerformer(bestAvgCount);

    return {
      accumulatedStats: rankedStats,
      bestPerformers: {
        victories: bestVictories,
        bestLaps: bestVR,
        bestAverages: bestPR
      }
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
                <th className="px-4 py-3 text-center font-bold">POS</th>
                <th className="px-4 py-3 text-left font-bold">JUGADOR</th>
                <th className="px-4 py-3 text-center font-bold">CAMPEONATOS</th>
                <th className="px-4 py-3 text-center font-bold">VR</th>
                <th className="px-4 py-3 text-center font-bold">PR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {accumulatedStats.map((stats, index) => (
                <tr key={stats.player.id} className={`${index % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-950'}`}>
                  <td className="px-4 py-3 text-center">
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
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono font-bold text-f1-yellow text-lg">
                      {stats.championships}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono font-bold text-zinc-100 text-lg">
                      {stats.bestLaps}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono font-bold text-zinc-100 text-lg">
                      {stats.bestAverages}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Best Performers Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-md">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-f1-xl font-bold text-zinc-100">Best</h2>
        </div>
        
        <div className="p-4">
          <StatsGrid columns={1} className="gap-4">
            {bestPerformers.victories && (
              <DataCard
                title="Más Victorias"
                value={`${bestPerformers.victories.player.name} - ${bestPerformers.victories.circuit.name}`}
                subtitle={`${bestPerformers.victories.count} victorias`}
                variant="highlight"
              />
            )}
            
            {bestPerformers.bestLaps && (
              <DataCard
                title="Más Vueltas Rápidas (VR)"
                value={`${bestPerformers.bestLaps.player.name} - ${bestPerformers.bestLaps.circuit.name}`}
                subtitle={`${bestPerformers.bestLaps.count} VR`}
                variant="success"
              />
            )}
            
            {bestPerformers.bestAverages && (
              <DataCard
                title="Más Promedios (PR)"
                value={`${bestPerformers.bestAverages.player.name} - ${bestPerformers.bestAverages.circuit.name}`}
                subtitle={`${bestPerformers.bestAverages.count} PR`}
                variant="success"
              />
            )}
          </StatsGrid>
        </div>
      </div>
    </div>
  );
};

export default StatsView;