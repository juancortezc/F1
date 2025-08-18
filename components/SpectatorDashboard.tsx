import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { GameState, Player, Circuit } from '../types';
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
      refreshInterval: 2000,
      revalidateOnFocus: true,
      errorRetryCount: 3
    }
  );

  const [recentLaps, setRecentLaps] = useState<any[]>([]);
  const [newLapIds, setNewLapIds] = useState<Set<string>>(new Set());

  // Update recent laps when new data arrives
  useEffect(() => {
    if (liveData?.success && liveData.data?.liveLapTimes) {
      const newLaps = liveData.data.liveLapTimes
        .filter((lap: any) => lap.turnNumber === gameState.currentTurn)
        .slice(0, 5)
        .reverse();
      
      const currentLapIds = new Set(recentLaps.map(lap => lap.id));
      const incomingLapIds = new Set(newLaps.map((lap: any) => lap.id));
      const newIds = new Set([...incomingLapIds].filter(id => !currentLapIds.has(id)) as string[]);
      
      setRecentLaps(newLaps);
      
      if (newIds.size > 0) {
        setNewLapIds(newIds);
        setTimeout(() => setNewLapIds(new Set()), 2000);
      }
    }
  }, [liveData, gameState.currentTurn, recentLaps]);

  // Get current circuit session times
  const currentCircuitTimes = gameState.lapTimesLog.filter(lap => lap.circuitName === currentCircuit.name);
  
  // Combine traditional session times with live lap times
  const allLapTimes = [...currentCircuitTimes];
  
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

  // Calculate best lap times
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

  // Session info
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
  const sessionBestTime = bestLapTimes[0]?.time;
  const currentPlayerDelta = currentPlayerBestTime && sessionBestTime 
    ? (currentPlayerBestTime - sessionBestTime)
    : null;

  return (
    <div className="min-h-screen bg-f1-black p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-f1-xl font-bold text-primary mb-2">F1 NIGHT</h1>
          
          {/* Status */}
          <div className="text-f1-sm text-secondary">
            {liveError ? (
              <span className="text-f1-red">Conexión perdida</span>
            ) : (
              <span className="text-f1-green">EN VIVO</span>
            )}
          </div>
          
          <div className="surface-primary border border-subtle rounded-md p-4 mt-4">
            <div className="text-f1-xl font-bold text-f1-red mb-4">{currentCircuit.name}</div>
            
            {/* Session info */}
            <div className="grid grid-cols-2 gap-4 text-f1-base">
              <div>
                <span className="text-secondary">Turno</span>
                <p className="text-primary font-bold text-f1-lg">{gameState.currentTurn}/{totalTurns}</p>
              </div>
              <div>
                <span className="text-secondary">Progreso</span>
                <p className="text-primary font-bold text-f1-lg">{completionPercentage}%</p>
              </div>
            </div>

            {/* Current Player */}
            {currentPlayer && (
              <div className="mt-4 pt-4 border-t border-subtle">
                <div className="text-f1-yellow font-bold text-f1-lg mb-3">{currentPlayer.name}</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-secondary">Vuelta {currentPlayerCurrentLap}</span>
                    <span className="text-primary font-mono font-bold">
                      {currentPlayerBestTime ? formatTime(currentPlayerBestTime) : '-:--.---'}
                    </span>
                  </div>
                  {currentPlayerDelta !== null && (
                    <div className="flex justify-between">
                      <span className="text-secondary">Delta</span>
                      <span className={`font-mono font-bold ${
                        currentPlayerDelta <= 0 ? 'text-f1-green' : 'text-f1-red'
                      }`}>
                        {currentPlayerDelta <= 0 
                          ? formatTime(Math.abs(currentPlayerDelta)) 
                          : `+${formatTime(currentPlayerDelta)}`
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Turn Progress */}
        <TurnProgressTracker 
          players={gameState.settings.players}
          currentTurn={gameState.currentTurn}
          lapsPerTurn={gameState.settings.lapsPerTurn}
          turnProgressData={liveData?.data?.currentTurnProgress || []}
          isLoading={!liveData && !liveError}
        />

        {/* Positions - Mobile optimized */}
        <div className="space-y-4">
          
          {/* Top 5 Positions */}
          <div className="surface-primary border border-subtle rounded-md">
            <div className="p-4 border-b border-subtle">
              <h2 className="text-f1-lg font-bold text-primary">Posiciones</h2>
            </div>
            
            <div className="divide-y divide-subtle">
              {bestLapTimes.length === 0 ? (
                <div className="p-4 text-center text-secondary">
                  <LoadingSpinner size="sm" className="mx-auto mb-2" />
                  <p>Esperando tiempos...</p>
                </div>
              ) : (
                bestLapTimes.map(({ position, player, time, delta }) => (
                  <div key={`${player?.id}-${time}`} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-f1-sm ${
                        position === 1 ? 'bg-f1-yellow text-f1-black' :
                        position <= 3 ? 'bg-f1-surface-light text-primary' :
                        'bg-f1-surface text-secondary'
                      }`}>
                        {position}
                      </div>
                      <div>
                        <p className="text-primary font-semibold">{player?.name}</p>
                        <p className="text-secondary text-f1-sm">
                          {position === 1 ? 'Líder' : `+${formatTime(delta)}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-primary font-mono font-bold text-f1-lg">
                        {formatTime(time)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity - Simplified */}
          {recentLaps.length > 0 && (
            <div className="surface-primary border border-subtle rounded-md">
              <div className="p-4 border-b border-subtle">
                <h2 className="text-f1-lg font-bold text-primary">Actividad Reciente</h2>
              </div>
              
              <div className="divide-y divide-subtle">
                {recentLaps.slice(0, 3).map((lap: any) => {
                  const player = players.find(p => p.id === lap.playerId);
                  const isNew = newLapIds.has(lap.id);
                  
                  return (
                    <div key={lap.id} className={`p-4 flex items-center justify-between ${
                      isNew ? 'animate-fade-in' : ''
                    }`}>
                      <div>
                        <p className="text-primary font-semibold">{player?.name || 'Desconocido'}</p>
                        <p className="text-secondary text-f1-sm">Vuelta {lap.lapNumber}</p>
                      </div>
                      <p className={`font-mono font-bold text-f1-lg ${
                        isNew ? 'text-f1-yellow' : 'text-primary'
                      }`}>
                        {formatTime(lap.timeMs)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpectatorDashboard;