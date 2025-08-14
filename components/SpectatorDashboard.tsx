import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { GameState, Player, Circuit } from '../types';
import { TrophyIcon, StopwatchIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';
import TurnProgressTracker from './TurnProgressTracker';

interface SpectatorDashboardProps {
  gameState: GameState;
  players: Player[];
  circuits: Circuit[];
}

const formatTime = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined || ms === Infinity || !isFinite(ms)) return '-:--.---';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

const SpectatorDashboard: React.FC<SpectatorDashboardProps> = ({ gameState, players, circuits }) => {
  const currentCircuit = circuits[gameState.currentCircuitIndex];
  const currentPlayer = players.find(p => p.id === gameState.playerOrder[gameState.currentPlayerIndex]);

  // Fetch live lap times with polling
  const { data: liveData, error: liveError } = useSWR(
    `/api/lap-times/live?gameId=active-game&circuitId=${currentCircuit?.id}&turnNumber=${gameState.currentTurn}`,
    {
      refreshInterval: 2000, // Poll every 2 seconds
      revalidateOnFocus: true,
      errorRetryCount: 3
    }
  );

  const [recentLaps, setRecentLaps] = useState<any[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [newLapIds, setNewLapIds] = useState<Set<string>>(new Set());

  // Update recent laps when new data arrives with animation tracking
  useEffect(() => {
    if (liveData?.success && liveData.data?.liveLapTimes) {
      const newLaps = liveData.data.liveLapTimes
        .filter((lap: any) => lap.turnNumber === gameState.currentTurn)
        .slice(0, 5) // Show last 5 laps
        .reverse(); // Most recent first
      
      // Track new lap IDs for animation
      const currentLapIds = new Set(recentLaps.map(lap => lap.id));
      const incomingLapIds = new Set(newLaps.map((lap: any) => lap.id));
      const newIds = new Set([...incomingLapIds].filter(id => !currentLapIds.has(id)) as string[]);
      
      setRecentLaps(newLaps);
      setLastUpdateTime(new Date().toLocaleTimeString());
      
      if (newIds.size > 0) {
        setNewLapIds(newIds);
        // Clear animation after 2 seconds
        setTimeout(() => setNewLapIds(new Set()), 2000);
      }
    }
  }, [liveData, gameState.currentTurn, recentLaps]);

  // Get current circuit session times
  const currentCircuitTimes = gameState.lapTimesLog.filter(lap => lap.circuitName === currentCircuit.name);
  
  // Combine traditional session times with live lap times
  const allLapTimes = [...currentCircuitTimes];
  
  // Add live lap times if available
  if (liveData?.success && liveData.data?.liveLapTimes) {
    const liveLaps = liveData.data.liveLapTimes
      .filter((lap: any) => lap.circuitId === currentCircuit.id)
      .map((lap: any) => ({
        playerId: lap.playerId,
        circuitName: currentCircuit.name,
        time: lap.timeMs,
        turn: lap.turnNumber,
        lap: lap.lapNumber,
        isLive: true
      }));
    allLapTimes.push(...liveLaps);
  }

  // Calculate best lap times (overall session including live)
  const bestLapTimes = allLapTimes
    .filter(lap => lap.time > 0)
    .sort((a, b) => a.time - b.time)
    .slice(0, 5)
    .map((lap, index) => {
      const fastestTime = allLapTimes.filter(l => l.time > 0).sort((a, b) => a.time - b.time)[0]?.time;
      const delta = fastestTime ? lap.time - fastestTime : 0;
      
      return {
        position: index + 1,
        player: players.find(p => p.id === lap.playerId),
        time: lap.time,
        turn: lap.turn,
        lap: lap.lap,
        delta,
        isLive: (lap as any).isLive || false
      };
    });

  // Calculate best average times per player for current circuit
  const playerAverages = new Map<string, { times: number[], player: any }>();
  
  // Group times by player and turn to calculate averages
  const turnGroups = new Map<string, number[]>();
  currentCircuitTimes.forEach(lap => {
    const key = `${lap.playerId}-${lap.turn}`;
    if (!turnGroups.has(key)) {
      turnGroups.set(key, []);
    }
    turnGroups.get(key)!.push(lap.time);
  });

  // Calculate averages for each turn
  turnGroups.forEach((times, key) => {
    const [playerId] = key.split('-');
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const sortedTimes = times.sort((a, b) => a - b);
    const timesToAverage = (gameState.settings.lapsPerTurn === 5 && gameState.settings.useBest4Of5Laps && sortedTimes.length === 5)
      ? sortedTimes.slice(0, 4)
      : sortedTimes;
    
    if (timesToAverage.length > 2) {
      const average = Math.round(timesToAverage.reduce((sum, time) => sum + time, 0) / timesToAverage.length);
      
      if (!playerAverages.has(playerId)) {
        playerAverages.set(playerId, { times: [], player });
      }
      playerAverages.get(playerId)!.times.push(average);
    }
  });

  // Add live turn completions to averages
  if (liveData?.success && liveData.data?.turnCompletions) {
    liveData.data.turnCompletions.forEach((completion: any) => {
      if (completion.averageTimeMs && completion.circuitId === currentCircuit.id) {
        const player = players.find(p => p.id === completion.playerId);
        if (player) {
          if (!playerAverages.has(completion.playerId)) {
            playerAverages.set(completion.playerId, { times: [], player });
          }
          // Add live average (but don't duplicate)
          const existing = playerAverages.get(completion.playerId)!;
          if (!existing.times.includes(completion.averageTimeMs)) {
            existing.times.push(completion.averageTimeMs);
          }
        }
      }
    });
  }

  // Get best averages with delta calculations
  const bestAverages = Array.from(playerAverages.entries())
    .map(([playerId, data]) => ({
      playerId,
      player: data.player,
      bestAverage: Math.min(...data.times),
      averageCount: data.times.length
    }))
    .sort((a, b) => a.bestAverage - b.bestAverage)
    .slice(0, 5)
    .map((avg, index) => {
      const fastestAverage = Array.from(playerAverages.entries())
        .map(([_, data]) => Math.min(...data.times))
        .sort((a, b) => a - b)[0];
      const delta = fastestAverage ? avg.bestAverage - fastestAverage : 0;
      
      return {
        ...avg,
        delta,
        position: index + 1
      };
    });

  // Find current session records holders
  const sessionBestLapHolder = bestLapTimes[0];
  const sessionBestAverageHolder = bestAverages[0];

  // Current turn status
  const totalTurns = gameState.settings.turnsPerCircuit;
  const totalLaps = currentCircuitTimes.length;
  const expectedLaps = gameState.currentTurn * gameState.settings.players.length * gameState.settings.lapsPerTurn;
  const completionPercentage = Math.round((totalLaps / expectedLaps) * 100);

  // Current player stats
  const currentPlayerTimes = currentCircuitTimes.filter(lap => lap.playerId === currentPlayer?.id);
  const currentPlayerBestTime = currentPlayerTimes.length > 0 
    ? Math.min(...currentPlayerTimes.map(lap => lap.time))
    : null;
  const currentPlayerCurrentLap = currentPlayerTimes.filter(lap => lap.turn === gameState.currentTurn).length + 1;
  const sessionBestTime = sessionBestLapHolder?.time;
  const currentPlayerDelta = currentPlayerBestTime && sessionBestTime 
    ? (currentPlayerBestTime - sessionBestTime)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-red-900/20 p-3 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header with Live Status */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              liveError ? 'bg-red-500' : 'bg-green-500'
            }`}></div>
            <img 
              src="https://www.formula1.com/etc/designs/fom-website/images/f1_logo.svg" 
              alt="F1 Logo" 
              className="w-8 h-6 object-contain"
            />
            <h1 className="text-xl md:text-2xl font-bold text-white">F1 LIVE</h1>
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              liveError ? 'bg-red-500' : 'bg-green-500'
            }`}></div>
          </div>
          
          {/* Live Status Indicator */}
          <div className="flex items-center justify-center gap-2 text-xs">
            {liveError ? (
              <span className="text-red-400 animate-pulse">⚠ Conexión perdida - Reintentando...</span>
            ) : (
              <>
                <span className="text-green-400">🔴 EN VIVO</span>
                {lastUpdateTime && (
                  <span className="text-slate-500">• Actualizado {lastUpdateTime}</span>
                )}
              </>
            )}
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-[#FF1801] mb-3">{currentCircuit.name}</div>
            
            {/* Session info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
              <div>
                <span className="text-slate-400">Turno:</span>
                <span className="ml-2 text-white font-bold">{gameState.currentTurn}/{totalTurns}</span>
              </div>
              <div>
                <span className="text-slate-400">Progreso:</span>
                <span className="ml-2 text-green-400 font-bold">{completionPercentage}%</span>
              </div>
              <div>
                <span className="text-slate-400">Total Vueltas:</span>
                <span className="ml-2 text-white font-bold">{totalLaps}</span>
              </div>
            </div>

            {/* Current Player info */}
            {currentPlayer && (
              <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-3">
                <div className="text-yellow-400 font-bold text-lg mb-2">🏁 {currentPlayer.name}</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-slate-400">Vuelta:</span>
                    <span className="ml-2 text-white font-bold">{currentPlayerCurrentLap}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Mejor tiempo:</span>
                    <span className="ml-2 text-cyan-400 font-mono">
                      {currentPlayerBestTime ? formatTime(currentPlayerBestTime) : '-:--.---'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Delta vs mejor:</span>
                    <span className={`ml-2 font-mono ${currentPlayerDelta !== null ? (currentPlayerDelta <= 0 ? 'text-green-400' : 'text-red-400 animate-pulse') : 'text-slate-500'}`}>
                      {currentPlayerDelta !== null 
                        ? (currentPlayerDelta <= 0 
                          ? `${formatTime(Math.abs(currentPlayerDelta))}` 
                          : `+${formatTime(currentPlayerDelta)}`)
                        : '-:--.---'
                      }
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          
          {/* Turn Progress Tracker */}
          <TurnProgressTracker 
            players={gameState.settings.players}
            currentTurn={gameState.currentTurn}
            lapsPerTurn={gameState.settings.lapsPerTurn}
            turnProgressData={liveData?.data?.currentTurnProgress || []}
            isLoading={!liveData && !liveError}
          />
          
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Live Lap Updates */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 border-b border-slate-600">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  ⚡ Última Actividad
                </h2>
                <p className="text-blue-200 text-sm">Tiempos en tiempo real</p>
              </div>
              
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {recentLaps.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">
                    {liveError ? (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-red-400 animate-pulse">Error de conexión</span>
                        <LoadingSpinner size="sm" className="text-red-400 animate-pulse" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <LoadingSpinner size="sm" className="text-blue-400" />
                        <span>Esperando nuevos tiempos...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  recentLaps.map((lap: any, index: number) => {
                    const player = players.find(p => p.id === lap.playerId);
                    const timeAgo = new Date(lap.timestamp).toLocaleTimeString();
                    
                    const isNewLap = newLapIds.has(lap.id);
                    
                    return (
                      <div key={`${lap.id}-${index}`} className={`bg-slate-700/30 border rounded-lg p-3 transition-all duration-500 hover:bg-slate-700/50 ${
                        isNewLap ? 'border-yellow-400 bg-yellow-900/20 animate-pulse' : 'border-slate-600'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {player?.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <div className="text-white font-medium text-sm">{player?.name || 'Desconocido'}</div>
                              <div className="text-slate-400 text-xs">Vuelta {lap.lapNumber} • T{lap.turnNumber}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-mono font-bold transition-colors duration-500 ${
                              isNewLap ? 'text-yellow-400' : 'text-cyan-400'
                            }`}>
                              {formatTime(lap.timeMs)}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              {timeAgo}
                              {isNewLap && <span className="text-yellow-400 animate-bounce">🆕</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          
          {/* Live Records & Champions */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Current Session Champions */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
              <div className="bg-slate-700/50 p-3 border-b border-slate-600">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <TrophyIcon className="w-5 h-5" />
                  Session Champions
                </h2>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Fastest Lap */}
                <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">🏆</span>
                    </div>
                    <div className="flex-grow">
                      <div className="text-slate-400 text-xs font-medium">VUELTA MÁS RÁPIDA</div>
                      <div className="text-white text-lg font-semibold">
                        {sessionBestLapHolder ? sessionBestLapHolder.player?.name : 'Sin registros'}
                      </div>
                      <div className="text-cyan-400 font-mono text-sm">
                        {sessionBestLapHolder ? formatTime(sessionBestLapHolder.time) : '-:--.---'}
                      </div>
                      {sessionBestLapHolder && (
                        <div className="text-xs text-slate-500">
                          Turno {sessionBestLapHolder.turn} • Vuelta {sessionBestLapHolder.lap}
                        </div>
                      )}
                    </div>
                    {sessionBestLapHolder && (
                      <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {sessionBestLapHolder.player?.name?.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Best Average */}
                <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">⭐</span>
                    </div>
                    <div className="flex-grow">
                      <div className="text-slate-400 text-xs font-medium">MEJOR PROMEDIO</div>
                      <div className="text-white text-lg font-semibold">
                        {sessionBestAverageHolder ? sessionBestAverageHolder.player?.name : 'Sin registros'}
                      </div>
                      <div className="text-cyan-400 font-mono text-sm">
                        {sessionBestAverageHolder ? formatTime(sessionBestAverageHolder.bestAverage) : '-:--.---'}
                      </div>
                      {sessionBestAverageHolder && (
                        <div className="text-xs text-slate-500">
                          {sessionBestAverageHolder.averageCount} turnos completados
                        </div>
                      )}
                    </div>
                    {sessionBestAverageHolder && (
                      <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {sessionBestAverageHolder.player?.name?.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live Leaderboards */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Top 5 Fastest Laps */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
              <div className="bg-slate-700/50 p-3 border-b border-slate-600">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  ⚡ Top 5 Vueltas Rápidas
                </h3>
                <p className="text-slate-400 text-sm">{currentCircuit.name}</p>
              </div>
              
              <div className="divide-y divide-slate-700">
                {bestLapTimes.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">
                    <div className="animate-pulse">Esperando primer registro...</div>
                  </div>
                ) : (
                  bestLapTimes.map(({ position, player, time, turn, lap, delta, isLive }) => (
                    <div key={`${player?.id}-${turn}-${lap}`} className={`p-3 flex items-center gap-3 transition-all duration-300 hover:bg-slate-700/30 ${
                      isLive ? 'bg-yellow-900/10 border-l-2 border-yellow-400' : ''
                    }`}>
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                        position === 1 ? 'bg-slate-600 text-white' :
                        position <= 3 ? 'bg-slate-700 text-slate-300' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {position}
                      </div>
                      
                      <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {player?.name?.charAt(0)}
                      </div>
                      
                      <div className="flex-grow">
                        <div className="text-white font-medium text-sm">{player?.name}</div>
                        <div className="text-slate-500 text-xs">T{turn} • V{lap}</div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`font-mono text-sm font-semibold ${
                          isLive ? 'text-yellow-400' : 'text-cyan-400'
                        }`}>
                          {formatTime(time)}
                        </div>
                        <div className="text-xs">
                          {position === 1 ? (
                            <span className="text-green-400">🏆 Mejor</span>
                          ) : (
                            <span className={`${delta < 1000 ? 'text-green-300' : delta < 2000 ? 'text-yellow-300' : 'text-red-300'}`}>
                              +{formatTime(delta)}
                            </span>
                          )}
                          {isLive && <span className="text-yellow-400 ml-1">• LIVE</span>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top 5 Best Averages */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  🎯 Top 5 Mejores Promedios
                </h3>
                <p className="text-blue-200 text-sm">{currentCircuit.name} • Consistencia</p>
              </div>
              
              <div className="divide-y divide-slate-700">
                {bestAverages.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">
                    <div className="animate-pulse">Calculando promedios...</div>
                  </div>
                ) : (
                  bestAverages.map(({ player, bestAverage, averageCount, delta, position }) => (
                    <div key={player?.id} className="p-3 flex items-center gap-3 hover:bg-slate-700/30 transition-colors">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        position === 1 ? 'bg-blue-500 text-white' :
                        position === 2 ? 'bg-blue-600 text-blue-100' :
                        position === 3 ? 'bg-blue-700 text-blue-200' :
                        'bg-slate-700 text-slate-300'
                      }`}>
                        {position}
                      </div>
                      
                      <img 
                        src={player?.imageUrl} 
                        alt={player?.name} 
                        className="w-10 h-10 rounded-full border border-slate-600"
                      />
                      
                      <div className="flex-grow">
                        <div className="text-white font-medium">{player?.name}</div>
                        <div className="text-slate-400 text-xs">{averageCount} turnos completados</div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`font-mono font-bold ${
                          position === 1 ? 'text-blue-400 text-lg' : 
                          position <= 3 ? 'text-blue-300' : 'text-slate-300'
                        }`}>
                          {formatTime(bestAverage)}
                        </div>
                        <div className="text-xs">
                          {position === 1 ? (
                            <span className="text-blue-300">⭐ CONSISTENT</span>
                          ) : (
                            <span className={`${delta < 1000 ? 'text-green-300' : delta < 3000 ? 'text-yellow-300' : 'text-red-300'}`}>
                              +{formatTime(delta)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpectatorDashboard;