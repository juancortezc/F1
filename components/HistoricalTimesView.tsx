import React, { useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';
import { Player, Circuit, GameHistoryEntry, GameState, PlayerStats } from '../types';
import { fetcher } from '../lib/fetcher';
import UserAvatar from './UserAvatar';
import { ScoreCalculator } from '../utils/ScoreCalculator';
import { formatGameDateEC } from '../utils/dateUtils';

interface HistoricalTimesViewProps {
  players: Player[];
  circuits: Circuit[];
  gameHistory: GameHistoryEntry[];
  activeGame?: { id: string; state: GameState } | null;
}

// Helper to get circuits from game state
const getGameCircuits = (state: GameState): string => {
  if (!state?.settings?.circuits) return '';
  return state.settings.circuits.map(c => c.name).join(', ');
};

interface LapTimeData {
  id: string;
  playerId: string;
  circuitId: string;
  turnNumber: number;
  lapNumber: number;
  timeMs: number;
  gameId: string;
  createdAt: string;
  circuit: {
    name: string;
  };
}

const formatTime = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined || ms === Infinity || !isFinite(ms)) return '-:--.---';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

// Tab types
type ResultsTab = 'tiempos' | 'puntos' | 'top';

// PodiumCards Component
const PodiumCards: React.FC<{
  gameState?: GameState;
  players: Player[];
  isActive: boolean;
}> = ({ gameState, players, isActive }) => {
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

  if (standings.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">🏁</div>
        <p className="text-zinc-400">Sin datos de campeonato</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-4">
      {/* Championship Status Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-2">
          {isActive ? 'CAMPEONATO ACTIVO' : 'RESULTADOS'}
        </h1>
        <div className="w-16 h-1 bg-f1-red mx-auto"></div>
      </div>

      {/* Podium Cards */}
      <div className="flex justify-center items-end gap-3">
        {/* Second Place */}
        {second && (
          <div
            className="relative rounded-lg border-2 border-f1-red p-2 text-center bg-black flex-shrink-0"
            style={{ minHeight: '120px', minWidth: '90px', maxWidth: '100px' }}
          >
            <div className="absolute -top-2 -right-2 w-7 h-7 bg-zinc-300 rounded-full flex items-center justify-center z-10 border-2 border-black">
              <span className="font-mono font-bold text-xs text-black">2</span>
            </div>
            <UserAvatar
              imageUrl={second.player.imageUrl}
              name={second.player.name}
              className="w-12 h-12 mx-auto mb-1 ring-2 ring-f1-red"
            />
            <h3 className="text-white font-bold text-xs mb-1 truncate">{second.player.name}</h3>
            <div className="text-zinc-300 font-mono font-bold text-base">{second.totalScore}</div>
          </div>
        )}

        {/* First Place */}
        {first && (
          <div
            className="relative rounded-lg border-2 border-f1-red p-3 text-center bg-black flex-shrink-0"
            style={{ minHeight: '140px', minWidth: '100px', maxWidth: '120px' }}
          >
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center z-10 border-2 border-black shadow-lg">
              <span className="font-mono font-bold text-sm text-black">1</span>
            </div>
            <UserAvatar
              imageUrl={first.player.imageUrl}
              name={first.player.name}
              className="w-16 h-16 mx-auto mb-2 ring-2 ring-f1-red"
            />
            <h3 className="text-white font-bold text-sm mb-1 truncate">{first.player.name}</h3>
            <div className="text-white font-mono font-bold text-lg">{first.totalScore}</div>
          </div>
        )}

        {/* Third Place */}
        {third && (
          <div
            className="relative rounded-lg border-2 border-f1-red p-2 text-center bg-black flex-shrink-0"
            style={{ minHeight: '120px', minWidth: '90px', maxWidth: '100px' }}
          >
            <div className="absolute -top-2 -right-2 w-7 h-7 bg-amber-600 rounded-full flex items-center justify-center z-10 border-2 border-black">
              <span className="font-mono font-bold text-xs text-black">3</span>
            </div>
            <UserAvatar
              imageUrl={third.player.imageUrl}
              name={third.player.name}
              className="w-12 h-12 mx-auto mb-1 ring-2 ring-f1-red"
            />
            <h3 className="text-white font-bold text-xs mb-1 truncate">{third.player.name}</h3>
            <div className="text-zinc-300 font-mono font-bold text-base">{third.totalScore}</div>
          </div>
        )}
      </div>
    </div>
  );
};

const HistoricalTimesView: React.FC<HistoricalTimesViewProps> = ({
  players,
  circuits,
  gameHistory,
  activeGame
}) => {
  // Active tab state
  const [activeTab, setActiveTab] = useState<ResultsTab>('tiempos');

  // Determine if there's an active game that's actually in progress
  const isActiveGameInProgress = useMemo(() => {
    if (!activeGame?.state) return false;
    const { currentCircuitIndex, settings } = activeGame.state;
    return currentCircuitIndex < (settings?.circuits?.length || 0);
  }, [activeGame]);

  // Build list of available games
  const availableGames = useMemo(() => {
    const games: Array<{
      id: string;
      label: string;
      date: string;
      state: GameState;
      isActive: boolean;
    }> = [];

    if (activeGame && isActiveGameInProgress) {
      games.push({
        id: activeGame.id,
        label: 'CAMPEONATO ACTIVO',
        date: 'En progreso',
        state: activeGame.state,
        isActive: true
      });
    }

    if (gameHistory && gameHistory.length > 0) {
      gameHistory.forEach((game, index) => {
        if (game.state) {
          const circuitNames = getGameCircuits(game.state);
          games.push({
            id: game.id,
            label: circuitNames || `Campeonato ${index + 1}`,
            date: formatGameDateEC(game.updatedAt),
            state: game.state,
            isActive: false
          });
        }
      });
    }

    return games;
  }, [activeGame, gameHistory, isActiveGameInProgress]);

  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  useEffect(() => {
    if (availableGames.length > 0 && !selectedGameId) {
      setSelectedGameId(availableGames[0].id);
    }
  }, [availableGames, selectedGameId]);

  const selectedGame = useMemo(() => {
    return availableGames.find(g => g.id === selectedGameId) || availableGames[0];
  }, [availableGames, selectedGameId]);

  const gameId = selectedGame?.id;

  // Fetch all lap times for selected game
  const { data: lapTimesData, error, isLoading } = useSWR<{
    success: boolean;
    data: LapTimeData[];
  }>(
    gameId ? `/api/lap-times/all?gameId=${gameId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 10000
    }
  );

  // Process and organize lap times by circuit and turn
  const organizedData = useMemo(() => {
    if (!lapTimesData?.data) return {};

    const organized: Record<string, Record<number, LapTimeData[]>> = {};

    lapTimesData.data.forEach(lap => {
      const circuitName = lap.circuit?.name || circuits.find(c => c.id === lap.circuitId)?.name || 'Unknown';

      if (!organized[circuitName]) {
        organized[circuitName] = {};
      }

      if (!organized[circuitName][lap.turnNumber]) {
        organized[circuitName][lap.turnNumber] = [];
      }

      organized[circuitName][lap.turnNumber].push(lap);
    });

    Object.keys(organized).forEach(circuit => {
      Object.keys(organized[circuit]).forEach(turn => {
        organized[circuit][parseInt(turn)].sort((a, b) => {
          if (a.playerId !== b.playerId) {
            return a.playerId.localeCompare(b.playerId);
          }
          return a.lapNumber - b.lapNumber;
        });
      });
    });

    return organized;
  }, [lapTimesData?.data, circuits]);

  const getPlayerName = (playerId: string) => {
    return players?.find(p => p.id === playerId)?.name || 'Unknown Player';
  };

  // Color system for lap times
  const getLapColor = (timeMs: number, circuitId: string, playerId: string) => {
    if (timeMs <= 0) return 'bg-zinc-800';

    const circuit = circuits.find(c => c.id === circuitId);
    if (!circuit) return 'bg-zinc-800';

    const sessionLaps = lapTimesData?.data?.filter(
      lap => lap.circuitId === circuitId && lap.timeMs > 0
    ) || [];

    if (sessionLaps.length === 0) return 'bg-zinc-800';

    const sessionVR = Math.min(...sessionLaps.map(lap => lap.timeMs));
    const playerSessionLaps = sessionLaps.filter(lap => lap.playerId === playerId);
    const playerSessionBest = playerSessionLaps.length > 0
      ? Math.min(...playerSessionLaps.map(lap => lap.timeMs))
      : null;

    if (circuit.historicalBestLap && circuit.historicalBestLap > 0 && timeMs === circuit.historicalBestLap) {
      return 'bg-purple-600';
    }

    if (timeMs === sessionVR) {
      return 'bg-green-600';
    }

    if (playerSessionBest && timeMs === playerSessionBest && timeMs !== sessionVR) {
      return 'bg-orange-600';
    }

    return 'bg-zinc-800';
  };

  // Calculate Top data (best times per circuit/turn)
  const topData = useMemo(() => {
    if (!lapTimesData?.data) return [];

    const result: Array<{
      circuitName: string;
      circuitId: string;
      turns: Array<{
        turnNumber: number;
        bestLap: { playerId: string; time: number } | null;
        bestAverage: { playerId: string; time: number } | null;
      }>;
    }> = [];

    // Group by circuit
    const byCircuit: Record<string, LapTimeData[]> = {};
    lapTimesData.data.forEach(lap => {
      const circuitName = lap.circuit?.name || circuits.find(c => c.id === lap.circuitId)?.name || 'Unknown';
      if (!byCircuit[circuitName]) {
        byCircuit[circuitName] = [];
      }
      byCircuit[circuitName].push(lap);
    });

    Object.entries(byCircuit).forEach(([circuitName, laps]) => {
      const circuitId = laps[0]?.circuitId || '';
      const turnNumbers = [...new Set(laps.map(l => l.turnNumber))].sort((a, b) => a - b);

      const turns = turnNumbers.map(turnNumber => {
        const turnLaps = laps.filter(l => l.turnNumber === turnNumber && l.timeMs > 0);

        // Best lap in turn
        let bestLap: { playerId: string; time: number } | null = null;
        if (turnLaps.length > 0) {
          const fastest = turnLaps.reduce((min, lap) => lap.timeMs < min.timeMs ? lap : min);
          bestLap = { playerId: fastest.playerId, time: fastest.timeMs };
        }

        // Best average per player in turn
        const playerTimes: Record<string, number[]> = {};
        turnLaps.forEach(lap => {
          if (!playerTimes[lap.playerId]) {
            playerTimes[lap.playerId] = [];
          }
          playerTimes[lap.playerId].push(lap.timeMs);
        });

        let bestAverage: { playerId: string; time: number } | null = null;
        let minAvg = Infinity;
        Object.entries(playerTimes).forEach(([playerId, times]) => {
          if (times.length > 0) {
            const avg = times.reduce((a, b) => a + b, 0) / times.length;
            if (avg < minAvg) {
              minAvg = avg;
              bestAverage = { playerId, time: Math.round(avg) };
            }
          }
        });

        return { turnNumber, bestLap, bestAverage };
      });

      result.push({ circuitName, circuitId, turns });
    });

    return result;
  }, [lapTimesData?.data, circuits]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1A1A1A' }}>
        <div className="text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-xl font-bold text-white mb-2">Cargando...</h2>
        </div>
      </div>
    );
  }

  if (availableGames.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1A1A1A' }}>
        <div className="text-center">
          <div className="text-5xl mb-4">🏁</div>
          <h2 className="text-xl font-bold text-white mb-2">Sin campeonatos</h2>
          <p className="text-zinc-400">No hay campeonatos completados para mostrar</p>
        </div>
      </div>
    );
  }

  const circuitNames = Object.keys(organizedData);

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: '#1A1A1A' }}>
      <div className="max-w-6xl mx-auto px-2 pt-4">

        {/* Game Selector */}
        {availableGames.length > 0 && (
          <div className="mb-4">
            <select
              value={selectedGameId || ''}
              onChange={(e) => setSelectedGameId(e.target.value)}
              className="w-full min-h-[48px] bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-base text-white focus:border-red-600 focus:outline-none"
            >
              {availableGames.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.isActive ? '🔴 EN CURSO' : `✓ ${game.date} — ${game.label}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Podium Cards */}
        <PodiumCards
          gameState={selectedGame?.state}
          players={players}
          isActive={selectedGame?.isActive || false}
        />

        {/* Tabs Navigation */}
        <div className="flex border-b border-zinc-700 mb-4">
          <button
            onClick={() => setActiveTab('tiempos')}
            className={`flex-1 py-3 text-center font-bold text-sm transition-colors ${
              activeTab === 'tiempos'
                ? 'text-white border-b-2 border-f1-red'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            TIEMPOS
          </button>
          <button
            onClick={() => setActiveTab('puntos')}
            className={`flex-1 py-3 text-center font-bold text-sm transition-colors ${
              activeTab === 'puntos'
                ? 'text-white border-b-2 border-f1-red'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            PUNTOS
          </button>
          <button
            onClick={() => setActiveTab('top')}
            className={`flex-1 py-3 text-center font-bold text-sm transition-colors ${
              activeTab === 'top'
                ? 'text-white border-b-2 border-f1-red'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            TOP
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'tiempos' && (
          <div className="space-y-4">
            {/* Color Legend */}
            <div className="bg-zinc-900 rounded-lg p-3">
              <div className="flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-purple-600 rounded"></div>
                  <span className="text-zinc-400">Récord Histórico</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-green-600 rounded"></div>
                  <span className="text-zinc-400">VR Sesión</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-orange-600 rounded"></div>
                  <span className="text-zinc-400">Mejor Personal</span>
                </div>
              </div>
            </div>

            {/* Times Tables */}
            {circuitNames.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-zinc-400">Sin tiempos registrados</p>
              </div>
            ) : (
              circuitNames.map(circuitName => {
                const circuitData = organizedData[circuitName];
                const turns = Object.keys(circuitData).map(Number).sort((a, b) => a - b);

                return (
                  <div key={circuitName} className="bg-zinc-800/50 rounded-lg p-3">
                    <h2 className="text-lg font-bold text-white mb-3 text-center">
                      {circuitName.toUpperCase()}
                    </h2>

                    {turns.map(turnNumber => {
                      const turnData = circuitData[turnNumber];
                      const playerGroups: Record<string, LapTimeData[]> = {};

                      turnData.forEach(lap => {
                        if (!playerGroups[lap.playerId]) {
                          playerGroups[lap.playerId] = [];
                        }
                        playerGroups[lap.playerId].push(lap);
                      });

                      const playerIds = Object.keys(playerGroups);
                      const maxLaps = playerIds.length > 0
                        ? Math.max(...Object.values(playerGroups).map(laps => laps.length))
                        : 0;

                      if (playerIds.length === 0 || maxLaps === 0) {
                        return null;
                      }

                      return (
                        <div key={turnNumber} className="mb-4">
                          <h3 className="text-sm font-bold text-zinc-300 mb-2">T{turnNumber}</h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-zinc-700">
                                  <th className="text-left p-1 font-mono text-zinc-300 w-20">JUGADOR</th>
                                  {Array.from({length: maxLaps}, (_, i) => (
                                    <th key={i} className="text-center p-1 font-mono text-zinc-300 w-16">V{i+1}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {playerIds.map(playerId => {
                                  const playerLaps = playerGroups[playerId].sort((a, b) => a.lapNumber - b.lapNumber);
                                  return (
                                    <tr key={playerId} className="border-b border-zinc-600">
                                      <td className="p-1 font-semibold text-white text-left">
                                        {getPlayerName(playerId).substring(0, 8)}
                                      </td>
                                      {Array.from({length: maxLaps}, (_, i) => {
                                        const lap = playerLaps[i];
                                        return (
                                          <td key={i} className="p-1">
                                            {lap ? (
                                              <div
                                                className={`rounded px-1 py-0.5 text-center font-mono font-bold text-white text-xs ${getLapColor(lap.timeMs, lap.circuitId, lap.playerId)}`}
                                              >
                                                {formatTime(lap.timeMs).replace(/^0:/, '').substring(0, 6)}
                                              </div>
                                            ) : (
                                              <div className="text-center text-zinc-600">-</div>
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'puntos' && selectedGame?.state && (
          <div className="space-y-4">
            {(() => {
              const displayGameState = selectedGame.state;
              if (!displayGameState || !displayGameState.playerStats) return null;

              const calculator = new ScoreCalculator(displayGameState, players);
              const standings = calculator.getPlayerStandings();

              return (
                <>
                  {/* Standings Table */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden">
                    <div className="px-3 py-2 bg-zinc-800 border-b border-zinc-700">
                      <h3 className="text-base font-bold text-white">Clasificación Final</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm font-mono">
                        <thead className="bg-zinc-800">
                          <tr>
                            <th className="px-2 py-2 text-zinc-400 text-xs text-left">POS</th>
                            <th className="px-2 py-2 text-zinc-400 text-xs text-left">JUGADOR</th>
                            <th className="px-2 py-2 text-zinc-400 text-xs text-center">PTS</th>
                            <th className="px-2 py-2 text-zinc-400 text-xs text-center">VR</th>
                            <th className="px-2 py-2 text-zinc-400 text-xs text-center">PR</th>
                            <th className="px-2 py-2 text-zinc-400 text-xs text-center">1º</th>
                            <th className="px-2 py-2 text-zinc-400 text-xs text-center">2º</th>
                            <th className="px-2 py-2 text-zinc-400 text-xs text-center">3º</th>
                          </tr>
                        </thead>
                        <tbody>
                          {standings.map((standing, index) => (
                            <tr key={standing.player.id} className="border-b border-zinc-800">
                              <td className="px-2 py-2">
                                <span className={`font-bold ${
                                  index === 0 ? 'text-yellow-400' :
                                  index === 1 ? 'text-zinc-300' :
                                  index === 2 ? 'text-amber-600' :
                                  'text-zinc-400'
                                }`}>
                                  {index + 1}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-white font-semibold">{standing.player.name}</td>
                              <td className="px-2 py-2 text-center text-white font-bold">{standing.score}</td>
                              <td className="px-2 py-2 text-center text-white">{standing.bestLaps}</td>
                              <td className="px-2 py-2 text-center text-white">{standing.bestAverages}</td>
                              <td className="px-2 py-2 text-center text-yellow-400">{standing.firsts}</td>
                              <td className="px-2 py-2 text-center text-zinc-300">{standing.seconds}</td>
                              <td className="px-2 py-2 text-center text-amber-600">{standing.thirds}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Points by Circuit */}
                  {calculator.getCircuitBreakdown().map((circuit, circuitIndex) => {
                    if (!circuit) return null;
                    return (
                      <div key={circuitIndex} className="bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden">
                        <div className="px-3 py-2 bg-zinc-800 border-b border-zinc-700">
                          <h4 className="text-base font-bold text-white">{circuit.name}</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm font-mono">
                            <thead className="bg-zinc-800/50">
                              <tr>
                                <th className="px-2 py-2 text-zinc-400 text-xs text-left">POS</th>
                                <th className="px-2 py-2 text-zinc-400 text-xs text-left">JUGADOR</th>
                                <th className="px-2 py-2 text-zinc-400 text-xs text-center">TOTAL</th>
                                <th className="px-2 py-2 text-zinc-400 text-xs text-center">BASE</th>
                                <th className="px-2 py-2 text-zinc-400 text-xs text-center">BONUS</th>
                                {Array.from({ length: displayGameState.settings?.turnsPerCircuit || 3 }, (_, i) => (
                                  <th key={i} className="px-2 py-2 text-zinc-400 text-xs text-center">T{i + 1}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {circuit.players.map((playerData, index) => (
                                <tr key={playerData.player.id} className="border-b border-zinc-800">
                                  <td className="px-2 py-2">
                                    <span className={`font-bold ${
                                      index === 0 ? 'text-yellow-400' :
                                      index === 1 ? 'text-zinc-300' :
                                      index === 2 ? 'text-amber-600' :
                                      'text-zinc-400'
                                    }`}>
                                      {index + 1}
                                    </span>
                                  </td>
                                  <td className="px-2 py-2 text-white font-semibold">{playerData.player.name}</td>
                                  <td className="px-2 py-2 text-center text-white font-bold">{playerData.totalPoints}</td>
                                  <td className="px-2 py-2 text-center text-zinc-300">{playerData.basePoints}</td>
                                  <td className="px-2 py-2 text-center text-amber-400">{playerData.bonusPoints}</td>
                                  {playerData.turns.map((turnData, turnIndex) => (
                                    <td key={turnIndex} className="px-2 py-2 text-center text-zinc-300">
                                      {turnData.totalPoints}
                                      {turnData.bonusPoints > 0 && (
                                        <span className="text-amber-400 text-xs">+{turnData.bonusPoints}</span>
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        )}

        {activeTab === 'top' && (
          <div className="space-y-4">
            {topData.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-zinc-400">Sin datos de mejores tiempos</p>
              </div>
            ) : (
              topData.map(circuitTop => (
                <div key={circuitTop.circuitId} className="bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden">
                  <div className="px-3 py-2 bg-zinc-800 border-b border-zinc-700">
                    <h4 className="text-base font-bold text-white">{circuitTop.circuitName}</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-800/50">
                        <tr>
                          <th className="px-3 py-2 text-zinc-400 text-xs text-left">TURNO</th>
                          <th className="px-3 py-2 text-zinc-400 text-xs text-center">
                            <span className="text-green-400">VR</span> (Mejor Vuelta)
                          </th>
                          <th className="px-3 py-2 text-zinc-400 text-xs text-center">
                            <span className="text-blue-400">PR</span> (Mejor Promedio)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {circuitTop.turns.map(turn => (
                          <tr key={turn.turnNumber} className="border-b border-zinc-800">
                            <td className="px-3 py-3 text-white font-bold">T{turn.turnNumber}</td>
                            <td className="px-3 py-3 text-center">
                              {turn.bestLap ? (
                                <div>
                                  <span className="text-green-400 font-mono font-bold">
                                    {formatTime(turn.bestLap.time)}
                                  </span>
                                  <span className="text-zinc-400 text-xs ml-2">
                                    {getPlayerName(turn.bestLap.playerId)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-zinc-600">-</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {turn.bestAverage ? (
                                <div>
                                  <span className="text-blue-400 font-mono font-bold">
                                    {formatTime(turn.bestAverage.time)}
                                  </span>
                                  <span className="text-zinc-400 text-xs ml-2">
                                    {getPlayerName(turn.bestAverage.playerId)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-zinc-600">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoricalTimesView;
