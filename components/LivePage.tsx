import React from 'react';
import useSWR from 'swr';
import { GameState, Player, Circuit } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface LivePageProps {
  gameState: GameState;
  players: Player[];
  circuits: Circuit[];
  gameId?: string;
}

const formatTime = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined || ms === Infinity || !isFinite(ms)) return '-:--.---';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

const formatDelta = (ms: number): string => {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
  }
  return `${seconds.toFixed(3)}`;
};

const LivePage: React.FC<LivePageProps> = ({ gameState, players, circuits, gameId = 'active-game' }) => {
  // Early return if no valid game state
  if (!gameState || !gameState.circuits || gameState.circuits.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏁</div>
          <h2 className="text-2xl font-bold text-white mb-2">No hay campeonato activo</h2>
          <p className="text-zinc-400">No hay datos de timing en vivo para mostrar</p>
        </div>
      </div>
    );
  }

  // Safely access game state properties
  const currentCircuit = gameState?.circuits?.[gameState?.currentCircuitIndex || 0];
  const currentPlayer = gameState?.playerOrder && players 
    ? players.find(p => p.id === gameState.playerOrder[gameState.currentPlayerIndex || 0])
    : null;

  // Only fetch live data if we have valid game state and circuit
  const shouldFetch = !!(gameState && currentCircuit?.id && gameState.currentTurn);
  
  // Fetch live lap times with simplified polling
  const { data: liveData, error: liveError } = useSWR(
    shouldFetch ? `/api/lap-times/live?gameId=${gameId}&circuitId=${currentCircuit.id}&turnNumber=${gameState.currentTurn}` : null,
    {
      refreshInterval: 3000,
      revalidateOnFocus: true,
      onError: (error) => {
        console.warn('Live data fetch error:', error);
      }
    }
  );

  // Get next player
  const nextPlayerIndex = gameState?.playerOrder 
    ? (gameState.currentPlayerIndex + 1) % gameState.playerOrder.length
    : 0;
  const nextPlayer = gameState?.playerOrder && players 
    ? players.find(p => p.id === gameState.playerOrder[nextPlayerIndex])
    : null;

  // Get current circuit info for historical records
  const currentCircuitInfo = circuits.find(c => c.id === currentCircuit?.id);

  // Get current player's lap times for this turn
  const getCurrentPlayerLaps = () => {
    if (!liveData?.success || !liveData.data?.liveLapTimes || !currentPlayer) {
      return [];
    }

    const liveLaps = liveData.data.liveLapTimes.filter(
      (lap: any) => 
        lap.playerId === currentPlayer.id &&
        lap.circuitId === currentCircuit.id && 
        lap.turnNumber === gameState.currentTurn
    );

    // Sort by lap number and return only existing laps (no empty slots)
    return liveLaps
      .sort((a: any, b: any) => a.lapNumber - b.lapNumber);
  };

  const currentPlayerLaps = getCurrentPlayerLaps();

  // Calculate session bests from live data
  const getSessionBests = () => {
    if (!liveData?.data?.liveLapTimes || !currentCircuit?.id) return { bestLap: null, bestAverage: null };

    const allLapTimes = liveData.data.liveLapTimes
      .filter((lap: any) => lap.circuitId === currentCircuit.id && lap.timeMs > 0)
      .map((lap: any) => lap.timeMs);

    const bestLap = allLapTimes.length > 0 ? Math.min(...allLapTimes) : null;

    // Calculate best average from completed turns
    const playerAverages = liveData.data.liveLapTimes
      .filter((lap: any) => lap.circuitId === currentCircuit.id && lap.timeMs > 0)
      .reduce((acc: Record<string, number[]>, lap: any) => {
        const key = `${lap.playerId}-${lap.turnNumber}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(lap.timeMs);
        return acc;
      }, {});

    const averages = Object.values(playerAverages)
      .map((times) => {
        const timesArray = times as number[];
        if (timesArray.length < 3) return null;
        return timesArray.reduce((sum, time) => sum + time, 0) / timesArray.length;
      })
      .filter((avg): avg is number => avg !== null);

    const bestAverage = averages.length > 0 ? Math.min(...averages) : null;

    return { bestLap, bestAverage };
  };

  // Get player's best lap time in this session for this circuit
  const getPlayerSessionBestLap = (playerId: string) => {
    if (!liveData?.data?.liveLapTimes || !currentCircuit?.id) return null;
    
    const playerLaps = liveData.data.liveLapTimes.filter(
      (lap: any) => lap.playerId === playerId && lap.circuitId === currentCircuit.id && lap.timeMs > 0
    );
    
    if (playerLaps.length === 0) return null;
    return Math.min(...playerLaps.map((lap: any) => lap.timeMs));
  };

  // Determine lap box color based on performance vs records
  const getLapBoxColor = (lapTime: number, lapIndex: number) => {
    if (!currentPlayer || !currentCircuit) return 'bg-white text-black';
    
    const playerSessionBest = getPlayerSessionBestLap(currentPlayer.id);
    const sessionBestLap = sessionBests.bestLap;
    const historicalBest = currentCircuit.historicalBestLap;
    
    // 🟣 Púrpura: Mejoró récord histórico del circuito
    if (historicalBest && lapTime <= historicalBest) {
      return 'bg-purple-500 text-white';
    }
    
    // 🟢 Verde: Mejoró el mejor tiempo de la sesión del circuito
    if (sessionBestLap && lapTime < sessionBestLap) {
      return 'bg-green-500 text-white';
    }
    
    // 🟠 Naranja: Mejoró su mejor tiempo en la sesión del circuito
    if (playerSessionBest && lapTime < playerSessionBest) {
      return 'bg-orange-500 text-white';
    }
    
    // 🔴 Rojo: No mejoró su mejor tiempo de la sesión
    return 'bg-red-500 text-white';
  };

  const sessionBests = getSessionBests();

  // Get holders of session records
  const getSessionRecordHolders = () => {
    if (!liveData?.data?.liveLapTimes || !currentCircuit?.id) {
      return { vrHolder: null, prHolder: null };
    }

    // Find VR holder (best single lap)
    let vrHolder = null;
    let bestLapTime = Infinity;
    
    liveData.data.liveLapTimes
      .filter((lap: any) => lap.circuitId === currentCircuit.id && lap.timeMs > 0)
      .forEach((lap: any) => {
        if (lap.timeMs < bestLapTime) {
          bestLapTime = lap.timeMs;
          vrHolder = lap.playerId;
        }
      });

    // Find PR holder (best average)
    let prHolder = null;
    let bestAverage = Infinity;
    
    const playerAverages = liveData.data.liveLapTimes
      .filter((lap: any) => lap.circuitId === currentCircuit.id && lap.timeMs > 0)
      .reduce((acc: Record<string, number[]>, lap: any) => {
        const key = `${lap.playerId}-${lap.turnNumber}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(lap.timeMs);
        return acc;
      }, {});

    Object.entries(playerAverages).forEach(([key, times]) => {
      const validTimes = (times as number[]).filter(t => t > 0);
      if (validTimes.length >= 3) {
        const average = validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length;
        if (average < bestAverage) {
          bestAverage = average;
          prHolder = key.split('-')[0]; // Extract playerId from key
        }
      }
    });

    return { vrHolder, prHolder };
  };

  const sessionRecordHolders = getSessionRecordHolders();

  // Calculate current player's turn statistics
  const getCurrentPlayerStats = () => {
    if (currentPlayerLaps.length === 0) {
      return { currentAverage: null, bestLap: null };
    }

    const validTimes = currentPlayerLaps.map((lap: any) => lap.timeMs).filter((time: number) => time > 0);
    
    if (validTimes.length === 0) {
      return { currentAverage: null, bestLap: null };
    }

    const bestLap = Math.min(...validTimes);
    const currentAverage = validTimes.length >= 3 
      ? validTimes.reduce((sum: number, time: number) => sum + time, 0) / validTimes.length 
      : null;

    return { currentAverage, bestLap };
  };

  const currentPlayerStats = getCurrentPlayerStats();

  // Calculate deltas vs session bests (only from 3rd lap onwards)
  const getDeltas = () => {
    const { currentAverage, bestLap } = currentPlayerStats;
    const validLapsCount = currentPlayerLaps.filter((lap: any) => lap.timeMs > 0).length;
    
    return {
      averageDelta: currentAverage && sessionBests.bestAverage && validLapsCount >= 3
        ? currentAverage - sessionBests.bestAverage 
        : null,
      lapDelta: bestLap && sessionBests.bestLap && validLapsCount >= 1
        ? bestLap - sessionBests.bestLap 
        : null
    };
  };

  const deltas = getDeltas();

  // Get turn positions for all players (only for completed turns)
  const getTurnPositions = () => {
    if (!liveData?.data?.liveLapTimes || !currentCircuit) return [];

    const playerList = gameState.playerOrder.map(playerId => ({
      playerId,
      player: players.find(p => p.id === playerId),
      positions: [] as number[]
    }));

    // Calculate positions only for completed turns (not current ongoing turn)
    const completedTurns = Math.max(0, gameState.currentTurn - 1);
    
    for (let turn = 1; turn <= completedTurns; turn++) {
      const turnData = liveData.data.liveLapTimes
        .filter((lap: any) => lap.circuitId === currentCircuit.id && lap.turnNumber === turn)
        .reduce((acc: Record<string, number[]>, lap: any) => {
          if (!acc[lap.playerId]) acc[lap.playerId] = [];
          acc[lap.playerId].push(lap.timeMs);
          return acc;
        }, {});

      const playerAverages = Object.entries(turnData)
        .map(([playerId, times]) => {
          const validTimes = (times as number[]).filter(t => t > 0);
          if (validTimes.length < 3) return null;
          return {
            playerId,
            average: validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length
          };
        })
        .filter((item): item is { playerId: string; average: number } => item !== null)
        .sort((a, b) => a.average - b.average);

      // Assign positions for this turn
      playerAverages.forEach((item, index) => {
        const playerIndex = playerList.findIndex(p => p.playerId === item.playerId);
        if (playerIndex !== -1) {
          playerList[playerIndex].positions[turn - 1] = index + 1;
        }
      });

      // Fill in positions for players who didn't complete this turn
      playerList.forEach(player => {
        if (player.positions.length < turn) {
          player.positions.push(0); // 0 indicates no position/incomplete
        }
      });
    }

    return playerList;
  };

  const turnPositions = getTurnPositions();

  if (liveError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-zinc-400 mb-2">Error al cargar datos en vivo</p>
          <p className="text-zinc-500 text-sm">Reintentando automáticamente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header - Current Player, Next Player, Circuit */}
        <div className="space-y-2">
          {/* Current Player */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-1">
              {currentPlayer?.name || 'ESPERANDO'}
            </h1>
          </div>

          {/* Next Player and Circuit */}
          <div className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <div className="w-0 h-0 border-l-[8px] border-l-orange-500 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent"></div>
              <span className="text-orange-500 font-bold">
                {nextPlayer?.name || 'N/A'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">LIVE</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-white font-bold text-xl">
                {currentCircuit?.name?.toUpperCase() || 'CIRCUITO'}
              </span>
            </div>
          </div>
        </div>

        {/* Lap Times Card - Only colored boxes */}
        <div className="bg-zinc-900 rounded-lg p-1">
          <div className="flex gap-1 justify-center">
            {currentPlayerLaps.length === 0 ? (
              <div className="text-zinc-400 text-center py-1">
                <span className="font-mono text-xs">Esperando primer tiempo...</span>
              </div>
            ) : (
              currentPlayerLaps.map((lap: any, index: number) => (
                <div
                  key={index}
                  className={`h-3 w-8 rounded ${
                    getLapBoxColor(lap.timeMs, index)
                  }`}
                >
                </div>
              ))
            )}
          </div>
        </div>

        {/* Current Performance Card */}
        <div className="bg-zinc-800 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-6">
            {/* PR Section */}
            <div className="text-center">
              <div className="text-white text-xl font-bold mb-1">PR-T{gameState.currentTurn || 1}</div>
              <div className="text-white text-2xl font-mono font-bold mb-2">
                {currentPlayerStats.currentAverage ? formatTime(currentPlayerStats.currentAverage) : '-:--.---'}
              </div>
              <div className={`text-lg font-bold ${
                deltas.averageDelta === null ? 'text-zinc-500' :
                deltas.averageDelta > 0 ? 'text-red-400' : 'text-green-400'
              }`}>
                {deltas.averageDelta === null ? '±00:000' :
                 `${deltas.averageDelta > 0 ? '+' : ''}${formatDelta(deltas.averageDelta)}`
                }
              </div>
            </div>

            {/* VR Section */}
            <div className="text-center">
              <div className="text-white text-xl font-bold mb-1">VR-T{gameState.currentTurn || 1}</div>
              <div className="text-white text-2xl font-mono font-bold mb-2">
                {currentPlayerStats.bestLap ? formatTime(currentPlayerStats.bestLap) : '-:--.---'}
              </div>
              <div className={`text-lg font-bold ${
                deltas.lapDelta === null ? 'text-zinc-500' :
                deltas.lapDelta > 0 ? 'text-red-400' : 'text-green-400'
              }`}>
                {deltas.lapDelta === null ? '±00:000' :
                 `${deltas.lapDelta > 0 ? '+' : ''}${formatDelta(deltas.lapDelta)}`
                }
              </div>
            </div>
          </div>
        </div>

        {/* Records Comparison Card */}
        <div className="bg-zinc-800 rounded-lg p-2">
          <div className="grid grid-cols-3 gap-1 items-center">
            {/* Historical Records */}
            <div className="bg-purple-600 rounded p-1 text-center">
              <div className="text-white font-mono text-sm font-bold">
                {currentCircuitInfo?.historicalBestAverage 
                  ? formatTime(currentCircuitInfo.historicalBestAverage) 
                  : '-:--.---'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-white text-xs font-bold">PR</div>
            </div>
            <div className="bg-green-600 rounded p-1 text-center">
              <div className="text-white font-mono text-sm font-bold">
                {sessionBests.bestAverage ? formatTime(sessionBests.bestAverage) : '-:--.---'}
              </div>
            </div>
            
            <div className="bg-purple-600 rounded p-1 text-center">
              <div className="text-white font-mono text-sm font-bold">
                {currentCircuitInfo?.historicalBestLap 
                  ? formatTime(currentCircuitInfo.historicalBestLap) 
                  : '-:--.---'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-white text-xs font-bold">VR</div>
            </div>
            <div className="bg-green-600 rounded p-1 text-center">
              <div className="text-white font-mono text-sm font-bold">
                {sessionBests.bestLap ? formatTime(sessionBests.bestLap) : '-:--.---'}
              </div>
            </div>
          </div>
        </div>

        {/* Turn Positions Card */}
        <div className="bg-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-700">
                <th className="px-4 py-2 text-left text-white font-bold text-sm"></th>
                <th className="px-2 py-2 text-center text-white font-bold text-sm">T1</th>
                <th className="px-2 py-2 text-center text-white font-bold text-sm">T2</th>
                <th className="px-2 py-2 text-center text-white font-bold text-sm">T3</th>
              </tr>
            </thead>
            <tbody>
              {turnPositions.map((playerData) => (
                <tr
                  key={playerData.playerId}
                  className={`${
                    playerData.playerId === currentPlayer?.id 
                      ? 'bg-zinc-700' 
                      : 'bg-zinc-800'
                  } hover:bg-zinc-600 transition-colors`}
                >
                  <td className="px-4 py-3 font-bold text-white">
                    <div className="flex items-center gap-2">
                      {playerData.player?.name}
                      {/* Session record indicators */}
                      {sessionRecordHolders.vrHolder === playerData.playerId && (
                        <div 
                          className="w-2 h-2 bg-green-400 rounded-full" 
                          title="Vuelta Rápida de Sesión"
                        >
                        </div>
                      )}
                      {sessionRecordHolders.prHolder === playerData.playerId && (
                        <div 
                          className="w-2 h-2 bg-cyan-400 rounded-full" 
                          title="Mejor Promedio de Sesión"
                        >
                        </div>
                      )}
                    </div>
                  </td>
                  {playerData.positions.slice(0, 3).map((position, index) => (
                    <td key={index} className="px-2 py-3 text-center">
                      <span className="text-white font-mono font-bold text-lg">
                        {position || '-'}
                      </span>
                    </td>
                  ))}
                  {/* Fill remaining columns if needed */}
                  {Array.from({ length: Math.max(0, 3 - playerData.positions.length) }).map((_, index) => (
                    <td key={`empty-${index}`} className="px-2 py-3 text-center">
                      <span className="text-zinc-500 font-mono font-bold text-lg">-</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default LivePage;