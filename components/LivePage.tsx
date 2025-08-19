import React, { useState, useEffect } from 'react';
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

const LivePage: React.FC<LivePageProps> = ({ gameState, players, circuits, gameId = 'active-game' }) => {
  // Use circuit from gameState to ensure consistency with RaceView
  const currentCircuit = gameState.circuits[gameState.currentCircuitIndex];
  const currentPlayer = players.find(p => p.id === gameState.playerOrder[gameState.currentPlayerIndex]);

  // Fetch live lap times with polling
  const { data: liveData, error: liveError } = useSWR(
    `/api/lap-times/live?gameId=${gameId}&circuitId=${currentCircuit?.id}&turnNumber=${gameState.currentTurn}`,
    {
      refreshInterval: 2000,
      revalidateOnFocus: true,
      errorRetryCount: 3
    }
  );

  // Get circuit-specific session best times
  const circuitSessionBests = gameState.sessionBestTimes?.[currentCircuit?.id] || {
    bestLap: null,
    bestLapPlayerId: null,
    bestAverage: null,
    bestAveragePlayerId: null
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
      const validLaps = lapTimes.filter(time => time !== null && time > 0);
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
      
      // Check against historical best lap
      if (currentCircuit.historicalBestLap && timeMs <= currentCircuit.historicalBestLap) {
        return 'bg-purple-900 text-purple-200 border-purple-500'; // Historical record
      }
      
      // Check against session best lap
      if (circuitSessionBests.bestLap && timeMs <= circuitSessionBests.bestLap) {
        return 'bg-green-900 text-green-200 border-green-500'; // Session record
      }
      
      // Check for personal best in this session
      if (playerBestTime && timeMs === playerBestTime) {
        return 'bg-orange-900 text-orange-200 border-orange-500'; // Personal record
      }
      
    } else if (type === 'average') {
      // Check against historical best average
      if (currentCircuit.historicalBestAverage && timeMs <= currentCircuit.historicalBestAverage) {
        return 'bg-purple-900 text-purple-200 border-purple-500'; // Historical record
      }
      
      // Check against session best average
      if (circuitSessionBests.bestAverage && timeMs <= circuitSessionBests.bestAverage) {
        return 'bg-green-900 text-green-200 border-green-500'; // Session record
      }
      
      // For averages, check if it's the player's personal best average (simplified)
      if (playerBestTime && timeMs <= playerBestTime + 1000) { // Within 1 second of best lap
        return 'bg-orange-900 text-orange-200 border-orange-500'; // Personal record
      }
    }
    
    return '';
  };

  return (
    <div className="min-h-screen bg-f1-black">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-3">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-xl font-bold text-f1-red">F1 NIGHT - LIVE</h1>
          <div className="flex items-center gap-2">
            {liveError ? (
              <span className="text-f1-red text-sm">●</span>
            ) : (
              <span className="text-green-500 text-sm animate-pulse">●</span>
            )}
            <span className="text-zinc-300 text-sm">
              {liveError ? 'Desconectado' : 'En Vivo'}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-4 text-sm">
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
        </div>
      </div>

      {/* Table Container - Horizontal Scroll */}
      <div className="p-2 overflow-x-auto">
        <div className="min-w-full">
          {playerData.length === 0 ? (
            <div className="text-center py-8">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <p className="text-zinc-400">Esperando datos en vivo...</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              {/* Header */}
              <thead>
                <tr className="bg-zinc-800 text-zinc-200 text-xs uppercase tracking-wide">
                  <th className="px-2 py-3 text-center font-bold">POS</th>
                  <th className="px-4 py-3 text-left font-bold min-w-[120px]">JUGADOR</th>
                  <th className="px-3 py-3 text-center font-bold">V1</th>
                  <th className="px-3 py-3 text-center font-bold">V2</th>
                  <th className="px-3 py-3 text-center font-bold">V3</th>
                  {gameState.settings.lapsPerTurn >= 4 && (
                    <th className="px-3 py-3 text-center font-bold">V4</th>
                  )}
                  {gameState.settings.lapsPerTurn >= 5 && (
                    <th className="px-3 py-3 text-center font-bold">V5</th>
                  )}
                  <th className="px-4 py-3 text-center font-bold">PROMEDIO</th>
                </tr>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-zinc-800">
                {playerData.map((data, index) => (
                  <tr 
                    key={data.playerId} 
                    className={`${index % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-950'} hover:bg-zinc-800 transition-colors`}
                  >
                    {/* Position */}
                    <td className="px-2 py-3 text-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mx-auto ${
                        data.position === 1 ? 'bg-f1-yellow text-black' :
                        data.position <= 3 ? 'bg-zinc-600 text-zinc-100' :
                        'bg-zinc-700 text-zinc-300'
                      }`}>
                        {data.position}
                      </div>
                    </td>

                    {/* Player Name and Delta */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-between min-w-[150px]">
                        <div>
                          <div className="font-semibold text-zinc-100 text-base">
                            {data.player?.name}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {data.completedLaps}/{gameState.settings.lapsPerTurn} vueltas
                          </div>
                        </div>
                        <div className="ml-4">
                          {data.position === 1 && data.bestLap ? (
                            // Líder: mostrar su mejor vuelta de la sesión
                            <span className="text-f1-yellow font-mono font-bold text-sm">
                              {formatTime(data.bestLap)}
                            </span>
                          ) : data.position > 1 && playerData[0]?.bestLap && data.bestLap ? (
                            // Otros: mostrar delta con el líder
                            <span className="text-red-400 font-mono font-bold text-base">
                              +{formatTime(data.bestLap - playerData[0].bestLap)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    {/* Individual Lap Times */}
                    {data.lapTimes.map((lapTime, lapIndex) => (
                      <td key={lapIndex} className={`px-3 py-3 text-center ${getCellColor(lapTime, 'lap', data.playerId)}`}>
                        <span className="font-mono font-bold text-lg tracking-wide">
                          {lapTime ? formatTime(lapTime) : '-:--.---'}
                        </span>
                      </td>
                    ))}

                    {/* Fill remaining lap columns if needed */}
                    {Array.from({ length: Math.max(0, gameState.settings.lapsPerTurn - data.lapTimes.length) }).map((_, i) => (
                      <td key={`empty-${i}`} className="px-3 py-3 text-center">
                        <span className="font-mono font-bold text-lg tracking-wide text-zinc-600">-:--.---</span>
                      </td>
                    ))}

                    {/* Average */}
                    <td className={`px-4 py-3 text-center ${getCellColor(data.averageTime, 'average', data.playerId)}`}>
                      <span className="font-mono font-bold text-xl tracking-wide">
                        {data.averageTime ? formatTime(data.averageTime) : '-:--.---'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-zinc-800">
        <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-900 border border-purple-500"></div>
            <span>Récord Histórico</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-900 border border-green-500"></div>
            <span>Récord de Sesión</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-900 border border-orange-500"></div>
            <span>Récord Personal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-f1-yellow"></div>
            <span>Líder</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LivePage;