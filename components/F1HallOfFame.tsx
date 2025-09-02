import React, { useMemo } from 'react';
import { GameState, Player, Circuit, GameHistoryEntry, PlayerStats } from '../types';
import UserAvatar from './UserAvatar';

interface F1HallOfFameProps {
  gameState: GameState;
  players: Player[];
  circuits: Circuit[];
  gameHistory: GameHistoryEntry[];
}

interface AccumulatedStats {
  player: Player;
  championships: number;
  circuitVictories: number; // VIC: Circuitos donde quedó 1° en campeonatos
  fastestLaps: number;     // VR: Récords de vuelta rápida por circuito
  bestAverages: number;    // PR: Récords de promedio por circuito
  totalScore: number;
  favoriteCircuit: string | null;
}

const F1HallOfFame: React.FC<F1HallOfFameProps> = ({ 
  gameState, 
  players = [], 
  circuits = [], 
  gameHistory = []
}) => {
  const { accumulatedStats } = useMemo(() => {
    // Filter out guest players from stats (same logic as StatsView)
    const eligiblePlayers = players.filter(p => !p.isGuest);
    
    // Initialize accumulated stats for each eligible player
    const playerAccStats: Record<string, AccumulatedStats> = {};
    eligiblePlayers.forEach(player => {
      playerAccStats[player.id] = {
        player,
        championships: 0,
        circuitVictories: 0,
        fastestLaps: 0,
        bestAverages: 0,
        totalScore: 0,
        favoriteCircuit: null
      };
    });

    // Track favorite circuits
    const victoryCount: Record<string, Record<string, number>> = {};
    players.forEach(player => {
      victoryCount[player.id] = {};
      circuits.forEach(circuit => {
        victoryCount[player.id][circuit.id] = 0;
      });
    });

    // Process completed games (same logic as StatsView)
    gameHistory.forEach((game, gameIndex) => {
      if (game.state && game.state.playerStats) {
        // Find winner (player with highest total score)
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

        // Calculate circuit victories and favorite circuits (same complex logic as StatsView)
        if (game.state.circuitResults && Array.isArray(game.state.circuitResults)) {
          game.state.circuitResults.forEach((circuitResult: any, circuitIndex: number) => {
            if (circuitResult.turns && Array.isArray(circuitResult.turns)) {
              const circuitPoints: Record<string, number> = {};
              
              circuitResult.turns.forEach((turn: any) => {
                if (Array.isArray(turn)) {
                  turn.forEach((playerData: any) => {
                    if (!circuitPoints[playerData.playerId]) {
                      circuitPoints[playerData.playerId] = 0;
                    }
                    circuitPoints[playerData.playerId] += playerData.turnScore || 0;
                  });
                }
              });
              
              const circuitWinner = Object.entries(circuitPoints)
                .reduce((winner, [playerId, points]) => 
                  points > winner.points ? { playerId, points } : winner
                , { playerId: '', points: 0 });
              
              if (circuitWinner.playerId && playerAccStats[circuitWinner.playerId]) {
                playerAccStats[circuitWinner.playerId].circuitVictories++;
              }

              // Update victory count for favorite circuit calculation
              const circuitId = game.state.circuits[circuitIndex]?.id;
              if (circuitId && circuitWinner.playerId && 
                  victoryCount[circuitWinner.playerId] && 
                  victoryCount[circuitWinner.playerId][circuitId] !== undefined) {
                victoryCount[circuitWinner.playerId][circuitId]++;
              }
            }
          });
        }

        // Add total scores for ranking
        Object.entries(game.state.playerStats || {}).forEach(([playerId, stats]) => {
          if (playerAccStats[playerId]) {
            playerAccStats[playerId].totalScore += (stats as PlayerStats).totalScore || 0;
          }
        });
      }
    });

    // Count VR and PR from historical circuit records (database records)
    circuits.forEach(circuit => {
      // VR: Count fastest lap records
      if (circuit.bestLapHolderId && playerAccStats[circuit.bestLapHolderId]) {
        playerAccStats[circuit.bestLapHolderId].fastestLaps++;
      }
      
      // PR: Count best average records  
      if (circuit.bestAverageHolderId && playerAccStats[circuit.bestAverageHolderId]) {
        playerAccStats[circuit.bestAverageHolderId].bestAverages++;
      }
    });

    // Add current game stats ONLY if game is still active (not finished)
    const isGameFinished = gameState ? gameState.currentCircuitIndex >= gameState.settings.circuits.length : false;
    
    if (gameState && !isGameFinished && gameState.playerStats) {
      Object.entries(gameState.playerStats).forEach(([playerId, stats]) => {
        if (playerAccStats[playerId]) {
          playerAccStats[playerId].totalScore += (stats as PlayerStats).totalScore || 0;
        }
      });
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

    // Calculate ranking (same formula as StatsView)
    const rankedStats = Object.values(playerAccStats)
      .map(stats => ({
        ...stats,
        rankingScore: stats.championships * 10 + stats.circuitVictories * 3 + stats.fastestLaps * 2 + stats.bestAverages
      }))
      .sort((a, b) => b.rankingScore - a.rankingScore);

    return {
      accumulatedStats: rankedStats
    };
  }, [gameHistory, gameState, players, circuits]);

  // Get top 3 for podium
  const podiumPlayers = accumulatedStats.slice(0, 3);
  const [first, second, third] = podiumPlayers;

  // Safety check for empty data
  if (accumulatedStats.length === 0) {
    return (
      <div className="min-h-screen pb-20" style={{ backgroundColor: '#1A1A1A' }}>
        <div className="max-w-4xl mx-auto px-4 pt-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">HALL OF FAME</h1>
          </div>
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-white mb-2">No hay datos disponibles</h2>
            <p className="text-zinc-400">Aún no se han registrado campeonatos</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#1A1A1A' }}>
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        {/* Hall of Fame Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">HALL OF FAME</h1>
        </div>

        {/* Podium Cards */}
        <div className="flex justify-center items-end gap-4 mb-8">
          {/* Second Place - Left */}
          {second && (
            <div 
              className="relative rounded-lg border border-zinc-700 p-4 text-center"
              style={{ backgroundColor: '#242424', minHeight: '140px', width: '100px' }}
            >
              {/* Position Badge */}
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-zinc-400 rounded-full flex items-center justify-center z-10 border-2 border-zinc-800">
                <span className="font-mono font-bold text-sm text-black">2</span>
              </div>
              <div className="relative inline-block">
                <UserAvatar
                  imageUrl={second.player.imageUrl}
                  name={second.player.name}
                  className="w-16 h-16 mx-auto mb-2 ring-2 ring-f1-red"
                />
              </div>
              <h3 className="text-white font-semibold text-sm">{second.player.name}</h3>
            </div>
          )}

          {/* First Place - Center (Larger) */}
          {first && (
            <div 
              className="relative rounded-lg border border-zinc-600 p-6 text-center"
              style={{ backgroundColor: '#242424', minHeight: '160px', width: '120px' }}
            >
              {/* Position Badge */}
              <div className="absolute -top-3 -right-3 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center z-10 border-2 border-zinc-800 shadow-lg">
                <span className="font-mono font-bold text-base text-black">1</span>
              </div>
              <div className="relative inline-block">
                <UserAvatar
                  imageUrl={first.player.imageUrl}
                  name={first.player.name}
                  className="w-20 h-20 mx-auto mb-3 ring-2 ring-f1-red"
                />
              </div>
              <h3 className="text-white font-bold text-base">{first.player.name}</h3>
            </div>
          )}

          {/* Third Place - Right */}
          {third && (
            <div 
              className="relative rounded-lg border border-zinc-700 p-4 text-center"
              style={{ backgroundColor: '#242424', minHeight: '140px', width: '100px' }}
            >
              {/* Position Badge */}
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center z-10 border-2 border-zinc-800">
                <span className="font-mono font-bold text-sm text-white">3</span>
              </div>
              <div className="relative inline-block">
                <UserAvatar
                  imageUrl={third.player.imageUrl}
                  name={third.player.name}
                  className="w-16 h-16 mx-auto mb-2 ring-2 ring-f1-red"
                />
              </div>
              <h3 className="text-white font-semibold text-sm">{third.player.name}</h3>
            </div>
          )}
        </div>

        {/* Statistics Table */}
        <div className="rounded-lg border border-zinc-800" style={{ backgroundColor: '#242424' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#2A2A2A' }}>
                  <th className="px-1 py-2 text-center text-xs font-mono uppercase tracking-wider text-zinc-400">POS</th>
                  <th className="px-2 py-2 text-left text-xs font-mono uppercase tracking-wider text-zinc-400">JUG</th>
                  <th className="px-2 py-2 text-center text-xs font-mono uppercase tracking-wider text-zinc-400">CMP</th>
                  <th className="px-2 py-2 text-center text-xs font-mono uppercase tracking-wider text-zinc-400">VIC</th>
                  <th className="px-2 py-2 text-center text-xs font-mono uppercase tracking-wider text-zinc-400">VR</th>
                  <th className="px-2 py-2 text-center text-xs font-mono uppercase tracking-wider text-zinc-400">PR</th>
                  <th className="px-2 py-2 text-center text-xs font-mono uppercase tracking-wider text-zinc-400">CRT</th>
                </tr>
              </thead>
              <tbody>
                {accumulatedStats.map((stats, index) => (
                  <tr key={stats.player.id} className="border-t border-zinc-800">
                    <td className="px-1 py-3 text-center">
                      <span className={`font-mono font-bold text-sm
                        ${index === 0 ? 'text-yellow-500' : 
                          index === 1 ? 'text-zinc-400' :
                          index === 2 ? 'text-orange-600' :
                          'text-zinc-300'}
                      `}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <div className="text-white font-semibold text-sm">
                        {stats.player.name}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="font-mono font-bold text-white text-base">
                        {stats.championships}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="font-mono font-bold text-white text-base">
                        {stats.circuitVictories}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="font-mono font-bold text-white text-base">
                        {stats.fastestLaps}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="font-mono font-bold text-white text-base">
                        {stats.bestAverages}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="text-zinc-300 font-medium text-sm">
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
    </div>
  );
};

export default F1HallOfFame;