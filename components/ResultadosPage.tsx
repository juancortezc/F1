import React, { useState, useMemo } from 'react';
import { GameHistoryEntry, Player, Circuit } from '../types';

interface ResultadosPageProps {
  gameHistory: GameHistoryEntry[];
  players: Player[];
  circuits: Circuit[];
}

const formatTime = (ms: number | null | undefined): string => {
  if (!ms) return '-';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

const ResultadosPage: React.FC<ResultadosPageProps> = ({ gameHistory, players, circuits }) => {
  const [selectedGameId, setSelectedGameId] = useState<string>('all');
  const [expandedCircuits, setExpandedCircuits] = useState<Record<string, boolean>>({});

  // Create player and circuit maps for quick lookup
  const playerMap = useMemo(() => {
    const map: Record<string, string> = {};
    players.forEach(p => map[p.id] = p.name);
    return map;
  }, [players]);

  const circuitMap = useMemo(() => {
    const map: Record<string, Circuit> = {};
    circuits.forEach(c => map[c.id] = c);
    return map;
  }, [circuits]);

  // Filter games by selected filter
  const filteredGames = useMemo(() => {
    if (selectedGameId === 'all') {
      return gameHistory;
    }
    return gameHistory.filter(game => game.id === selectedGameId);
  }, [gameHistory, selectedGameId]);

  // Calculate aggregated stats across filtered games
  const aggregatedStats = useMemo(() => {
    const stats: Record<string, {
      player: string;
      championships: number;
      circuitVictories: number;
      totalPoints: number;
    }> = {};

    // Initialize stats for all players
    players.forEach(player => {
      if (!player.isGuest) {
        stats[player.id] = {
          player: player.name,
          championships: 0,
          circuitVictories: 0,
          totalPoints: 0
        };
      }
    });

    // Process each filtered game
    filteredGames.forEach(game => {
      if (!game.state || typeof game.state !== 'object') return;
      const gameState = game.state as any;

      // Count championships
      if (gameState.playerStats) {
        const standings = Object.entries(gameState.playerStats)
          .map(([playerId, stats]: [string, any]) => ({
            playerId,
            totalScore: stats.totalScore || 0
          }))
          .sort((a, b) => b.totalScore - a.totalScore);

        if (standings.length > 0 && stats[standings[0].playerId]) {
          stats[standings[0].playerId].championships++;
        }

        // Add total points
        standings.forEach(({ playerId, totalScore }) => {
          if (stats[playerId]) {
            stats[playerId].totalPoints += totalScore;
          }
        });
      }

      // Count circuit victories
      if (gameState.circuitResults && Array.isArray(gameState.circuitResults)) {
        gameState.circuitResults.forEach((circuitResult: any) => {
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
            
            if (circuitWinner.playerId && stats[circuitWinner.playerId]) {
              stats[circuitWinner.playerId].circuitVictories++;
            }
          }
        });
      }
    });

    // Sort by championships, then circuit victories, then points
    return Object.values(stats).sort((a, b) => {
      if (a.championships !== b.championships) return b.championships - a.championships;
      if (a.circuitVictories !== b.circuitVictories) return b.circuitVictories - a.circuitVictories;
      return b.totalPoints - a.totalPoints;
    });
  }, [filteredGames, players, playerMap]);

  const toggleCircuit = (gameId: string, circuitIndex: number) => {
    const key = `${gameId}-${circuitIndex}`;
    setExpandedCircuits(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getGameDate = (game: GameHistoryEntry) => {
    const date = new Date(game.updatedAt);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header with Filter */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-md">
        <div className="p-4 border-b border-zinc-800">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-xl font-bold text-zinc-100">Resultados de Campeonatos</h2>
            
            {/* Filter Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-400">Filtrar:</label>
              <select 
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="bg-zinc-800 text-zinc-100 border border-zinc-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-zinc-500"
              >
                <option value="all">Todos los campeonatos</option>
                {gameHistory.map(game => (
                  <option key={game.id} value={game.id}>
                    {getGameDate(game)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats - First Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-md">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="text-lg font-bold text-zinc-100">Resumen General</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-800 text-zinc-400 text-xs uppercase tracking-wide">
                <th className="px-3 py-3 text-left font-semibold">POS</th>
                <th className="px-3 py-3 text-left font-semibold">JUGADOR</th>
                <th className="px-3 py-3 text-center font-semibold">CMP</th>
                <th className="px-3 py-3 text-center font-semibold">VIC</th>
                <th className="px-3 py-3 text-center font-semibold">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {aggregatedStats.map((stat, index) => (
                <tr key={`stat-${index}`} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-3 py-3">
                    <span className={`font-bold ${
                      index === 0 ? 'text-yellow-400' :
                      index === 1 ? 'text-zinc-300' :
                      index === 2 ? 'text-amber-600' :
                      'text-zinc-500'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-semibold text-zinc-100">{stat.player}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="font-mono font-bold text-zinc-100">{stat.championships}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="font-mono font-bold text-zinc-100">{stat.circuitVictories}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="font-mono font-bold text-zinc-100">{stat.totalPoints}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Championship Details */}
      <div className="space-y-4">
        {filteredGames.map(game => {
          if (!game.state || typeof game.state !== 'object') return null;
          const gameState = game.state as any;
          
          return (
            <div key={game.id} className="bg-zinc-900 border border-zinc-800 rounded-md">
              {/* Championship Header */}
              <div className="p-4 border-b border-zinc-800">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <h3 className="text-lg font-bold text-zinc-100">
                    Campeonato del {getGameDate(game)}
                  </h3>
                  <span className="text-sm text-zinc-400 font-mono">
                    ID: {game.id.slice(-6)}
                  </span>
                </div>
              </div>

              {/* Circuit Results */}
              <div className="p-4 space-y-3">
                {gameState.circuitResults && gameState.circuitResults.map((circuitResult: any, circuitIndex: number) => {
                  const circuitId = gameState.circuits?.[circuitIndex]?.id;
                  const circuit = circuitId ? circuitMap[circuitId] : null;
                  const circuitName = circuit?.name || `Circuito ${circuitIndex + 1}`;
                  const isExpanded = expandedCircuits[`${game.id}-${circuitIndex}`];
                  
                  // Calculate circuit winner
                  const circuitPoints: Record<string, number> = {};
                  if (circuitResult.turns && Array.isArray(circuitResult.turns)) {
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
                  }
                  
                  const standings = Object.entries(circuitPoints)
                    .map(([playerId, points]) => ({
                      playerName: playerMap[playerId] || 'Unknown',
                      points
                    }))
                    .sort((a, b) => b.points - a.points);
                  
                  const winner = standings[0];
                  
                  return (
                    <div key={circuitIndex} className="border border-zinc-800 rounded-md overflow-hidden">
                      {/* Circuit Header - Clickable */}
                      <button
                        onClick={() => toggleCircuit(game.id, circuitIndex)}
                        className="w-full p-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-100 font-semibold">{circuitName}</span>
                          <span className={`text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                            ▶
                          </span>
                        </div>
                        
                        {/* Winner and Records in same line */}
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="text-green-400 font-semibold">
                            🏆 Ganador: {winner?.playerName}
                          </span>
                          {circuit && (
                            <>
                              {circuit.bestLapHolderId && (
                                <span className="text-yellow-400">
                                  VR: {playerMap[circuit.bestLapHolderId] || '-'}
                                </span>
                              )}
                              {circuit.bestAverageHolderId && (
                                <span className="text-purple-400">
                                  PR: {playerMap[circuit.bestAverageHolderId] || '-'}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </button>
                      
                      {/* Expandable Details */}
                      {isExpanded && (
                        <div className="p-3 bg-zinc-900/50 space-y-2">
                          {standings.map((standing, pos) => (
                            <div key={pos} className="flex justify-between items-center text-sm">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold ${
                                  pos === 0 ? 'text-yellow-400' :
                                  pos === 1 ? 'text-zinc-300' :
                                  pos === 2 ? 'text-amber-600' :
                                  'text-zinc-500'
                                }`}>
                                  {pos + 1}.
                                </span>
                                <span className="text-zinc-100">{standing.playerName}</span>
                              </div>
                              <span className="font-mono text-zinc-300">{standing.points} pts</span>
                            </div>
                          ))}
                          
                          {/* Circuit Records */}
                          {circuit && (circuit.historicalBestLap || circuit.historicalBestAverage) && (
                            <div className="pt-2 mt-2 border-t border-zinc-800">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {circuit.historicalBestLap && (
                                  <div className="flex justify-between">
                                    <span className="text-zinc-500">Vuelta Rápida:</span>
                                    <span className="text-yellow-400 font-mono">
                                      {formatTime(circuit.historicalBestLap)}
                                    </span>
                                  </div>
                                )}
                                {circuit.historicalBestAverage && (
                                  <div className="flex justify-between">
                                    <span className="text-zinc-500">Mejor Promedio:</span>
                                    <span className="text-purple-400 font-mono">
                                      {formatTime(circuit.historicalBestAverage)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Championship Final Standings */}
              <div className="p-4 border-t border-zinc-800 bg-zinc-800/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Clasificación Final:</span>
                  <div className="flex items-center gap-3">
                    {gameState.playerStats && Object.entries(gameState.playerStats)
                      .map(([playerId, stats]: [string, any]) => ({
                        playerName: playerMap[playerId] || 'Unknown',
                        totalScore: stats.totalScore || 0
                      }))
                      .sort((a, b) => b.totalScore - a.totalScore)
                      .slice(0, 3)
                      .map((standing, index) => (
                        <span key={index} className={`text-sm font-semibold ${
                          index === 0 ? 'text-yellow-400' :
                          index === 1 ? 'text-zinc-300' :
                          'text-amber-600'
                        }`}>
                          {index + 1}° {standing.playerName} ({standing.totalScore}pts)
                        </span>
                      ))
                    }
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* No Data Message */}
      {filteredGames.length === 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-md p-8 text-center">
          <p className="text-zinc-400">No hay campeonatos para mostrar</p>
        </div>
      )}
    </div>
  );
};

export default ResultadosPage;