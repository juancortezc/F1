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
  return totalSeconds.toFixed(3);
};


const LivePage: React.FC<LivePageProps> = ({ gameState, players, circuits, gameId = 'active-game' }) => {
  const currentCircuit = gameState.circuits[gameState.currentCircuitIndex];
  const currentPlayer = players.find(p => p.id === gameState.playerOrder[gameState.currentPlayerIndex]);

  // Fetch live lap times with simplified polling
  const { data: liveData, error: liveError } = useSWR(
    `/api/lap-times/live?gameId=${gameId}&circuitId=${currentCircuit?.id}&turnNumber=${gameState.currentTurn}`,
    {
      refreshInterval: 3000,
      revalidateOnFocus: true
    }
  );

  // Calculate session bests from live data
  const circuitSessionBests = {
    bestLap: (() => {
      const allLapTimes = liveData?.data?.liveLapTimes
        ?.filter((lap: any) => lap.circuitId === currentCircuit?.id && lap.timeMs > 0)
        ?.map((lap: any) => lap.timeMs) || [];
      return allLapTimes.length > 0 ? Math.min(...allLapTimes) : null;
    })(),
    bestAverage: (() => {
      // Calculate best average from all players' averages this session
      const playerAverages = liveData?.data?.liveLapTimes
        ?.filter((lap: any) => lap.circuitId === currentCircuit?.id && lap.timeMs > 0)
        ?.reduce((acc: Record<string, number[]>, lap: any) => {
          if (!acc[lap.playerId]) acc[lap.playerId] = [];
          acc[lap.playerId].push(lap.timeMs);
          return acc;
        }, {})
      
      if (!playerAverages) return null;
      
      const averages = Object.values(playerAverages)
        .map((times) => {
          const timesArray = times as number[];
          if (timesArray.length < 3) return null;
          return timesArray.reduce((sum, time) => sum + time, 0) / timesArray.length;
        })
        .filter((avg): avg is number => avg !== null);
      
      return averages.length > 0 ? Math.min(...averages) : null;
    })()
  };

  // Calculate session best from live data if not available
  const getSessionBestLap = () => {
    if (circuitSessionBests.bestLap) {
      return circuitSessionBests.bestLap;
    }
    
    // Calculate from current live data
    const allLapTimes = liveData?.data?.liveLapTimes
      ?.filter((lap: any) => lap.circuitId === currentCircuit?.id && lap.timeMs > 0)
      ?.map((lap: any) => lap.timeMs) || [];
    
    return allLapTimes.length > 0 ? Math.min(...allLapTimes) : null;
  };

  const sessionBestLap = getSessionBestLap();

  // Get player's progression delta (best lap of current turn vs session record)
  const getPlayerProgression = (playerId: string, currentBestLap: number | null) => {
    if (!currentBestLap || !sessionBestLap) return { delta: null, isImproving: false };
    
    // Always compare player's best lap of current turn vs session record
    const delta = currentBestLap - sessionBestLap;
    
    return {
      delta: delta,
      isImproving: delta < 0, // Negative delta means faster than session record
      isVsRecord: true
    };
  };

  // Process live data and combine with session data
  const processPlayerData = () => {
    if (!liveData?.success || !liveData.data?.liveLapTimes) {
      return [];
    }

    const liveLaps = liveData.data.liveLapTimes.filter(
      (lap: any) => lap.circuitId === currentCircuit.id && lap.turnNumber === gameState.currentTurn
    );

    // Group lap times by player
    const playerLaps: Record<string, any[]> = {};
    liveLaps.forEach((lap: any) => {
      if (!playerLaps[lap.playerId]) {
        playerLaps[lap.playerId] = [];
      }
      playerLaps[lap.playerId].push(lap);
    });

    // Process each player's data
    const processedData = gameState.playerOrder.map((playerId: string) => {
      const player = players.find(p => p.id === playerId);
      const playerCurrentLaps = playerLaps[playerId] || [];
      
      // Sort laps by lap number
      playerCurrentLaps.sort((a, b) => a.lapNumber - b.lapNumber);

      // Get individual lap times (V1, V2, etc.)
      const lapTimes: (number | null)[] = [];
      for (let i = 1; i <= gameState.settings.lapsPerTurn; i++) {
        const lap = playerCurrentLaps.find(l => l.lapNumber === i);
        lapTimes.push(lap ? lap.timeMs : null);
      }

      // Calculate average from valid lap times
      const validLaps = lapTimes.filter((time): time is number => time !== null && time > 0);
      let averageTime: number | null = null;
      
      if (validLaps.length >= 3) {
        // Use best 4 of 5 if enabled and we have 5 laps
        const timesToAverage = (gameState.settings.lapsPerTurn === 5 && 
                                gameState.settings.useBest4Of5Laps && 
                                validLaps.length === 5)
          ? validLaps.sort((a, b) => a - b).slice(0, 4)
          : validLaps;
        
        averageTime = Math.round(timesToAverage.reduce((sum, time) => sum + time, 0) / timesToAverage.length);
      }

      return {
        playerId,
        player,
        lapTimes,
        averageTime,
        bestLap: validLaps.length > 0 ? Math.min(...validLaps) : null,
        completedLaps: validLaps.length
      };
    });

    // Sort by performance (average time, then best lap, then completed laps)
    processedData.sort((a, b) => {
      // Players with averages come first
      if (a.averageTime && !b.averageTime) return -1;
      if (!a.averageTime && b.averageTime) return 1;
      
      if (a.averageTime && b.averageTime) {
        return a.averageTime - b.averageTime;
      }
      
      // Then by best lap
      if (a.bestLap && !b.bestLap) return -1;
      if (!a.bestLap && b.bestLap) return 1;
      
      if (a.bestLap && b.bestLap) {
        return a.bestLap - b.bestLap;
      }
      
      // Finally by completed laps
      return b.completedLaps - a.completedLaps;
    });

    return processedData.map((data, index) => ({
      ...data,
      position: index + 1
    }));
  };

  const playerData = processPlayerData();

  // Get next player
  const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.playerOrder.length;
  const nextPlayer = players.find(p => p.id === gameState.playerOrder[nextPlayerIndex]);

  // Function to get cell color based on record type
  const getCellColor = (timeMs: number | null, type: 'lap' | 'average', playerId?: string): string => {
    if (!timeMs || timeMs <= 0) return '';
    
    // Find player's best time for personal record comparison
    const playerBestTimes = liveData?.data?.liveLapTimes
      ?.filter((lap: any) => lap.playerId === playerId && lap.circuitId === currentCircuit.id)
      ?.map((lap: any) => lap.timeMs) || [];
    
    const playerBestTime = playerBestTimes.length > 0 ? Math.min(...playerBestTimes) : null;
    
    if (type === 'lap') {
      // Priority: Historical > Session > Personal > Normal
      
      // 🟣 Morado: Mejoró el récord histórico del circuito
      if (currentCircuit.historicalBestLap && timeMs <= currentCircuit.historicalBestLap) {
        return 'bg-purple-500 text-white';
      }
      
      // 🟢 Verde: Mejoró el récord de la sesión y del circuito
      if (circuitSessionBests.bestLap && timeMs <= circuitSessionBests.bestLap) {
        return 'bg-green-500 text-white';
      }
      
      // 🟡 Amarillo: Mejoró su mejor registro personal
      if (playerBestTime && timeMs === playerBestTime) {
        return 'bg-yellow-400 text-black';
      }
      
    } else if (type === 'average') {
      // 🟣 Morado: Mejoró el récord histórico promedio
      if (currentCircuit.historicalBestAverage && timeMs <= currentCircuit.historicalBestAverage) {
        return 'bg-purple-500 text-white';
      }
      
      // 🟢 Verde: Mejoró el récord de sesión promedio
      if (circuitSessionBests.bestAverage && timeMs <= circuitSessionBests.bestAverage) {
        return 'bg-green-500 text-white';
      }
      
      // 🟡 Amarillo: Mejoró su mejor promedio personal
      if (playerBestTime && timeMs <= playerBestTime + 1000) { // Within 1 second of best lap
        return 'bg-yellow-400 text-black';
      }
    }
    
    return '';
  };

  return (
    <div className="min-h-screen bg-f1-black landscape:h-screen landscape:overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-3 landscape:py-2">
        <div className="flex justify-between items-center mb-2 landscape:mb-1">
          <h1 className="text-xl font-bold text-f1-red landscape:text-lg">F1 NIGHT - LIVE</h1>
          <div className="flex items-center gap-2">
            {liveError ? (
              <span className="text-f1-red text-sm">●</span>
            ) : (
              <span className="text-green-500 text-sm animate-pulse">●</span>
            )}
            <span className="text-zinc-300 text-sm landscape:text-xs">
              {liveError ? 'Desconectado' : 'En Vivo'}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 text-sm landscape:grid-cols-5 landscape:gap-3 landscape:text-xs">
          <div>
            <span className="text-zinc-400">Circuito:</span>
            <p className="text-zinc-100 font-semibold">{currentCircuit?.name}</p>
          </div>
          <div>
            <span className="text-zinc-400">Turno:</span>
            <p className="text-zinc-100 font-semibold">
              {gameState.currentTurn}/{gameState.settings.turnsPerCircuit}
            </p>
          </div>
          <div>
            <span className="text-zinc-400">Corriendo:</span>
            <p className="text-f1-yellow font-semibold">{currentPlayer?.name}</p>
          </div>
          <div>
            <span className="text-zinc-400">Próximo:</span>
            <p className="text-zinc-300 font-semibold">{nextPlayer?.name || 'N/A'}</p>
          </div>
          <div className="col-span-2 md:col-span-1">
            <span className="text-zinc-400">Récord:</span>
            <p className="bg-red-600 text-white font-mono font-bold px-2 py-1 rounded text-xs">
              {sessionBestLap ? formatTime(sessionBestLap) : '-:--.---'}
            </p>
          </div>
        </div>
      </div>

      {/* Table Container - Horizontal Scroll */}
      <div className="p-2 overflow-x-auto landscape:overflow-auto landscape:h-[calc(100vh-100px)]">
        <div className="min-w-full">
          {playerData.length === 0 ? (
            <div className="text-center py-8">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <p className="text-zinc-400">Esperando datos en vivo...</p>
            </div>
          ) : (
            <table className="w-full text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
              {/* Header */}
              <thead>
                <tr className="bg-zinc-800 text-zinc-200 text-[10px] uppercase tracking-wider border-b border-zinc-700">
                  <th className="w-10 px-1 py-2 text-center font-mono font-bold">POS</th>
                  <th className="w-24 px-2 py-2 text-left font-mono font-bold">PILOTO</th>
                  <th className="w-20 px-1 py-2 text-center font-mono font-bold">V1</th>
                  <th className="w-20 px-1 py-2 text-center font-mono font-bold">V2</th>
                  <th className="w-20 px-1 py-2 text-center font-mono font-bold">V3</th>
                  {gameState.settings.lapsPerTurn >= 4 && (
                    <th className="w-20 px-1 py-2 text-center font-mono font-bold">V4</th>
                  )}
                  {gameState.settings.lapsPerTurn >= 5 && (
                    <th className="w-20 px-1 py-2 text-center font-mono font-bold">V5</th>
                  )}
                  <th className="w-20 px-1 py-2 text-center font-mono font-bold">PROM</th>
                  <th className="w-16 px-1 py-2 text-center font-mono font-bold">DELTA</th>
                </tr>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-zinc-800">
                {playerData.map((data, index) => (
                  <tr 
                    key={data.playerId} 
                    className={`${index % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-950'} hover:bg-zinc-800/50 transition-colors h-8`}
                  >
                    {/* Position */}
                    <td className="px-1 py-1 text-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs mx-auto ${
                        data.position === 1 ? 'bg-amber-400 text-black' :
                        data.position === 2 ? 'bg-zinc-300 text-black' :
                        data.position === 3 ? 'bg-amber-600 text-white' :
                        'bg-zinc-700 text-zinc-300'
                      }`}>
                        {data.position}
                      </div>
                    </td>

                    {/* Player Name */}
                    <td className="px-2 py-1 text-left">
                      <div className="font-mono font-bold text-zinc-100 text-xs truncate">
                        {data.player?.name}
                      </div>
                    </td>

                    {/* Individual Lap Times */}
                    {data.lapTimes.map((lapTime, lapIndex) => (
                      <td key={lapIndex} className={`px-1 py-1 text-center ${getCellColor(lapTime, 'lap', data.playerId)}`}>
                        <span className="font-mono font-bold text-xs">
                          {lapTime ? formatTime(lapTime) : '-:--.---'}
                        </span>
                      </td>
                    ))}

                    {/* Fill remaining lap columns if needed */}
                    {Array.from({ length: Math.max(0, gameState.settings.lapsPerTurn - data.lapTimes.length) }).map((_, i) => (
                      <td key={`empty-${i}`} className="px-1 py-1 text-center">
                        <span className="font-mono font-bold text-xs text-zinc-600">-:--.---</span>
                      </td>
                    ))}

                    {/* Average */}
                    <td className={`px-1 py-1 text-center ${getCellColor(data.averageTime, 'average', data.playerId)}`}>
                      <span className="font-mono font-bold text-xs">
                        {data.averageTime ? formatTime(data.averageTime) : '-:--.---'}
                      </span>
                    </td>

                    {/* Delta */}
                    <td className="px-1 py-1 text-center">
                      {(() => {
                        const progression = getPlayerProgression(data.playerId, data.bestLap);
                        
                        if (!progression.delta) {
                          return <span className="text-zinc-600 font-mono font-bold text-xs">-.---</span>;
                        }
                        
                        // Color logic: Green = faster than record, Red = slower than record
                        const colorClass = progression.isImproving 
                          ? "text-green-400" // faster than session record
                          : "text-red-400"; // slower than session record
                        
                        const sign = progression.delta >= 0 ? "+" : "";
                        
                        return (
                          <span className={`${colorClass} font-mono font-bold text-xs`}>
                            {sign}{formatDelta(Math.abs(progression.delta))}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="p-2 border-t border-zinc-800 landscape:p-1 landscape:fixed landscape:bottom-0 landscape:left-0 landscape:right-0 landscape:bg-zinc-900">
        <div className="flex flex-wrap gap-3 text-[10px] text-zinc-400 landscape:gap-2 justify-center">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-purple-500 rounded-sm"></div>
            <span>Récord Histórico</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-sm"></div>
            <span>Récord de Sesión</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-400 rounded-sm"></div>
            <span>Mejor Personal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-amber-400 rounded-sm"></div>
            <span>Líder</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LivePage;