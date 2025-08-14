import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, LapTime as LapTimeType, Player } from '../types';
import { StopwatchIcon, TrophyIcon, CheckCircleIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';
import DataCard from './DataCard';
import StatsGrid from './StatsGrid';
import SectionHeader from './SectionHeader';
import KeyboardShortcuts, { KeyboardHelp } from './KeyboardShortcuts';
import TransferControlDialog from './TransferControlDialog';

interface RaceViewProps {
  gameState: GameState;
  players: Player[];
  onTurnComplete: (playerId: string, lapTimes: number[], newControllerId?: string) => void;
  onNextCircuit: () => void;
  onGameEnd: () => void;
  currentUser: { userId: string; name: string };
}

const formatTime = (ms: number | null | undefined): string => {
    if (ms === null || ms === undefined || ms === Infinity || !isFinite(ms)) return '-:--.---';
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = ms % 1000;
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

const timeToMs = (lapTime: LapTimeType): number => {
    const min = parseInt(lapTime.min) || 0;
    const sec = parseInt(lapTime.sec) || 0;
    const ms = parseInt(lapTime.ms) || 0;
    return min * 60000 + sec * 1000 + ms;
};

const TimeInput: React.FC<{ 
  value: string; 
  onChange: (val: string) => void; 
  maxLength: number; 
  placeholder: string; 
  isBest?: 'session' | 'historical';
  'data-lap'?: number;
  'data-field'?: string;
}> = ({ value, onChange, maxLength, placeholder, isBest, ...dataProps }) => {
    let colorClass = 'bg-slate-700 border-slate-600 text-slate-200';
    if(isBest === 'session') colorClass = 'bg-green-900/50 border-green-500 text-green-300';
    if(isBest === 'historical') colorClass = 'bg-purple-900/50 border-purple-500 text-purple-300';

    return (
        <input
            type="tel"
            value={value}
            onChange={e => {
                if (/^\d*$/.test(e.target.value)) {
                    onChange(e.target.value);
                }
            }}
            maxLength={maxLength}
            placeholder={placeholder}
            className={`w-full text-center text-2xl md:text-3xl font-mono p-2 md:p-3 rounded-md border-2 focus:outline-none focus:border-[#FF1801] transition-colors touch-manipulation ${colorClass}`}
            {...dataProps}
        />
    );
};

const RaceView: React.FC<RaceViewProps> = ({ gameState, players, onTurnComplete, onNextCircuit, onGameEnd, currentUser }) => {
  const { 
    settings, 
    circuits, 
    currentCircuitIndex, 
    currentTurn, 
    currentPlayerIndex, 
    sessionBestLap, 
    sessionBestAverage, 
    sessionBestTimes,
    playerOrder, 
    currentController, 
    participantUsers = [] 
  } = gameState || {};
  // Verificaciones de seguridad
  if (!gameState || !settings || !circuits || !playerOrder || !players) {
    return <div className="text-center p-8">Cargando datos del juego...</div>;
  }

  const currentCircuit = circuits[currentCircuitIndex];
  const currentPlayerId = playerOrder[currentPlayerIndex];
  const currentPlayer = players.find(p => p.id === currentPlayerId);

  // Get circuit-specific session best times
  const circuitSessionBests = sessionBestTimes?.[currentCircuit?.id] || {
    bestLap: null,
    bestLapPlayerId: null,
    bestAverage: null,
    bestAveragePlayerId: null
  };

  // Get player names for session record holders
  const sessionBestLapHolder = circuitSessionBests.bestLapPlayerId 
    ? players.find(p => p.id === circuitSessionBests.bestLapPlayerId)?.name 
    : null;
  const sessionBestAverageHolder = circuitSessionBests.bestAveragePlayerId 
    ? players.find(p => p.id === circuitSessionBests.bestAveragePlayerId)?.name 
    : null;

  if (!currentCircuit || !currentPlayerId || !currentPlayer) {
    return <div className="text-center p-8">Error: Datos del juego incompletos</div>;
  }

  const [lapTimes, setLapTimes] = useState<LapTimeType[]>(() => Array(settings.lapsPerTurn).fill({ min: '', sec: '', ms: '' }));
  const [currentAverage, setCurrentAverage] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [savedLapTimes, setSavedLapTimes] = useState<Record<number, boolean>>({});
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isCurrentController = currentUser.userId === currentController;

  // Auto-save individual lap time when complete
  const autoSaveLapTime = useCallback(async (lapIndex: number, timeMs: number) => {
    if (!gameState?.settings || timeMs <= 0) return;
    
    try {
      setIsAutoSaving(true);
      const response = await fetch('/api/lap-times/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: 'active-game', // We'll use a consistent game ID for active games
          playerId: currentPlayerId,
          circuitId: currentCircuit.id,
          turnNumber: currentTurn,
          lapNumber: lapIndex + 1, // Convert 0-based to 1-based
          timeMs
        })
      });
      
      if (response.ok) {
        setSavedLapTimes(prev => ({ ...prev, [lapIndex]: true }));
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [gameState, currentPlayerId, currentCircuit?.id, currentTurn]);

  const handleLapTimeChange = (index: number, field: keyof LapTimeType, value: string) => {
    const newLapTimes = [...lapTimes];
    newLapTimes[index] = { ...newLapTimes[index], [field]: value };
    setLapTimes(newLapTimes);
    
    // Check if this lap time is now complete and trigger auto-save
    const updatedLapTime = newLapTimes[index];
    const timeMs = timeToMs(updatedLapTime);
    
    if (timeMs > 0) {
      // Clear any existing timeout for this lap
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Set a new timeout to auto-save after 1 second of inactivity
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSaveLapTime(index, timeMs);
      }, 1000);
    } else {
      // Mark as not saved if the time becomes invalid
      setSavedLapTimes(prev => ({ ...prev, [index]: false }));
    }
  };

  const calculateAverage = useCallback(() => {
    const validTimes = lapTimes
        .map(timeToMs)
        .filter(ms => ms > 0)
        .sort((a, b) => a - b);
    
    if (validTimes.length < 3) {
        setCurrentAverage(null);
        return null;
    }

    const timesToAverage = (settings.lapsPerTurn === 5 && settings.useBest4Of5Laps && validTimes.length === 5)
        ? validTimes.slice(0, 4)
        : validTimes;

    if (timesToAverage.length === 0) {
        setCurrentAverage(null);
        return null;
    }

    const avg = Math.round(timesToAverage.reduce((sum, time) => sum + time, 0) / timesToAverage.length);
    setCurrentAverage(avg);
    return avg;
  }, [lapTimes, settings.lapsPerTurn, settings.useBest4Of5Laps]);

  useEffect(() => {
    calculateAverage();
  }, [lapTimes, calculateAverage]);
  
  // Load saved lap times when player/turn changes
  const loadSavedLapTimes = useCallback(async () => {
    if (!gameState || !currentPlayerId || !currentCircuit) return;
    
    try {
      const response = await fetch(`/api/lap-times/get?gameId=active-game&playerId=${currentPlayerId}&circuitId=${currentCircuit.id}&turnNumber=${currentTurn}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.lapTimes) {
          // Convert saved lap times back to input format
          const newLapTimes = Array(settings.lapsPerTurn).fill({ min: '', sec: '', ms: '' });
          const savedStatus: Record<number, boolean> = {};
          
          Object.entries(data.data.lapTimes).forEach(([lapNumber, lapData]: [string, any]) => {
            const index = parseInt(lapNumber) - 1; // Convert 1-based to 0-based
            if (index >= 0 && index < newLapTimes.length && lapData.timeMs) {
              const timeMs = lapData.timeMs;
              const totalSeconds = timeMs / 1000;
              const minutes = Math.floor(totalSeconds / 60);
              const seconds = Math.floor(totalSeconds % 60);
              const milliseconds = timeMs % 1000;
              
              newLapTimes[index] = {
                min: minutes > 0 ? minutes.toString() : '',
                sec: seconds.toString().padStart(2, '0'),
                ms: milliseconds.toString().padStart(3, '0')
              };
              savedStatus[index] = lapData.isSaved;
            }
          });
          
          setLapTimes(newLapTimes);
          setSavedLapTimes(savedStatus);
        }
      }
    } catch (error) {
      console.error('Failed to load saved lap times:', error);
    }
  }, [gameState, currentPlayerId, currentCircuit, currentTurn, settings.lapsPerTurn]);
  
  useEffect(() => {
     // Clear current state first
     setLapTimes(Array(settings.lapsPerTurn).fill({ min: '', sec: '', ms: '' }));
     setCurrentAverage(null);
     setSavedLapTimes({});
     
     // Load any saved lap times for this turn
     if (isCurrentController) {
       loadSavedLapTimes();
     }
  }, [currentPlayerIndex, currentTurn, currentCircuitIndex, settings.lapsPerTurn, isCurrentController, loadSavedLapTimes]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async () => {
    const timesInMs = lapTimes.map(timeToMs).filter(ms => ms > 0);
    if (timesInMs.length !== settings.lapsPerTurn) {
      alert(`Por favor ingresa todos los ${settings.lapsPerTurn} tiempos de vuelta.`);
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onTurnComplete(currentPlayerId, timesInMs);
      // Clear lap times after successful submission
      setLapTimes(Array(settings.lapsPerTurn).fill({ min: '', sec: '', ms: '' }));
      setCurrentAverage(null);
      // Después de guardar exitosamente, mostrar el diálogo de transferencia
      if (participantUsers.length > 1) {
        setShowTransferDialog(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransferControl = (newControllerId: string) => {
    // Actualizar inmediatamente el estado local para la próxima función onTurnComplete
    onTurnComplete(currentPlayerId, [], newControllerId);
    setShowTransferDialog(false);
  };

  const handleClear = () => {
    // Clear all lap times for current player
    setLapTimes(Array(settings.lapsPerTurn).fill({ min: '', sec: '', ms: '' }));
    setCurrentAverage(null);
  };
  
  const allTurnsForCircuitDone = gameState.circuitResults[currentCircuitIndex]?.turns.length === settings.turnsPerCircuit && gameState.circuitResults[currentCircuitIndex]?.turns[settings.turnsPerCircuit - 1]?.length === settings.players.length;

  if (allTurnsForCircuitDone) {
      const isLastCircuit = currentCircuitIndex === settings.circuits.length - 1;
      const circuitStandings = [...(gameState.circuitResults[currentCircuitIndex]?.turns.flat().reduce((acc, turnResult) => {
          const playerTotal = (acc.get(turnResult.playerId) || 0) + turnResult.turnScore;
          acc.set(turnResult.playerId, playerTotal);
          return acc;
      }, new Map<string, number>()) ?? [])]
      .sort((a,b) => b[1] - a[1]);
      
      const winnerName = players.find(p => p.id === circuitStandings[0]?.[0])?.name ?? 'N/A';
      
      return (
          <div className="text-center p-8 max-w-lg mx-auto bg-slate-800 rounded-xl">
              <TrophyIcon className="w-24 h-24 mx-auto text-yellow-400" />
              <h2 className="text-3xl font-bold mt-4">Circuit Complete!</h2>
              <p className="text-xl text-slate-300 mt-2">{currentCircuit.name}</p>
              <p className="text-2xl font-bold text-yellow-400 mt-4">Winner: {winnerName}</p>
              <div className="mt-6 text-left">
                  <h3 className="font-bold text-lg mb-2">Circuit Standings:</h3>
                  {circuitStandings.map(([playerId, score], index) => (
                      <div key={playerId} className="flex justify-between p-2 bg-slate-700 rounded mb-1">
                          <span>{index + 1}. {players.find(p=>p.id === playerId)?.name}</span>
                          <span className="font-bold">{score} pts</span>
                      </div>
                  ))}
              </div>
              <button onClick={isLastCircuit ? onGameEnd : onNextCircuit} className="mt-8 w-full bg-[#FF1801] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#E61601] transition-all">
                  {isLastCircuit ? 'Ver Resultados Finales' : 'Continuar al Siguiente Circuito'}
              </button>
          </div>
      );
  }

  const isLastPlayerOfTurn = currentPlayerIndex === settings.players.length - 1;
  const nextPlayer = !isLastPlayerOfTurn ? players.find(p => p.id === playerOrder[currentPlayerIndex + 1]) : null;
  const controllerName = participantUsers.find(u => u.userId === currentController)?.name || 'Desconocido';

  // Keyboard shortcuts
  const shortcuts = [
    {
      key: 'Enter',
      description: 'Guardar tiempos y continuar',
      action: handleSubmit
    },
    {
      key: 'c',
      description: 'Limpiar tiempos',
      action: handleClear
    },
    {
      key: '1',
      description: 'Enfocar primera vuelta',
      action: () => {
        const firstInput = document.querySelector('[data-lap="0"][data-field="min"]') as HTMLInputElement;
        firstInput?.focus();
      }
    },
    {
      key: '?',
      description: 'Mostrar/ocultar ayuda de atajos',
      action: () => setShowKeyboardHelp(!showKeyboardHelp)
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-3 md:p-4 space-y-4 md:space-y-6">
        {/* Header Info */}
        <div className="bg-slate-800/50 backdrop-blur-sm p-4 rounded-xl border border-slate-700 shadow-lg">
            {/* Compact layout */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-[#FF1801]">{currentCircuit.name}</h1>
                <div className="flex items-center gap-2">
                  <div className={`relative flex items-center justify-center ${isCurrentController ? '' : ''}`}>
                    <div className={`w-3 h-3 rounded-full ${isCurrentController ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></div>
                    {isCurrentController && (
                      <div className="absolute w-5 h-5 rounded-full bg-green-400/30 animate-ping"></div>
                    )}
                  </div>
                  <span className="font-semibold text-lg text-white">{currentPlayer.name}</span>
                  {isCurrentController && (
                    <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full font-medium">
                      EN CONTROL
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Turno {currentTurn} de {settings.turnsPerCircuit}</span>
              {nextPlayer && (
                <span className="text-white font-medium">Siguiente: {nextPlayer.name}</span>
              )}
            </div>
        </div>

        {/* Best Times */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <DataCard
            title="Mejor Vuelta Histórica"
            value={formatTime(currentCircuit.historicalBestLap)}
            subtitle={currentCircuit.bestLapHolder?.name || undefined}
            icon={<TrophyIcon className="w-4 h-4" />}
            variant="info"
            size="sm"
          />
          <DataCard
            title="Mejor Promedio Histórico"
            value={formatTime(currentCircuit.historicalBestAverage)}
            subtitle={currentCircuit.bestAverageHolder?.name || undefined}
            icon={<TrophyIcon className="w-4 h-4" />}
            variant="info"
            size="sm"
          />
          <DataCard
            title="Mejor Vuelta Sesión"
            value={formatTime(circuitSessionBests.bestLap)}
            subtitle={sessionBestLapHolder || undefined}
            icon={<StopwatchIcon className="w-4 h-4" />}
            variant="success"
            size="sm"
          />
          <DataCard
            title="Mejor Promedio Sesión"
            value={formatTime(circuitSessionBests.bestAverage)}
            subtitle={sessionBestAverageHolder || undefined}
            icon={<StopwatchIcon className="w-4 h-4" />}
            variant="success"
            size="sm"
          />
        </div>

      {/* Time Input Form */}
      <div className="bg-slate-800/50 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-slate-700 space-y-4">
        <div className="flex items-center justify-center gap-3">
          <h2 className="text-lg md:text-xl font-bold text-center leading-tight">
            {isCurrentController ? `Ingresa los Tiempos de Vuelta de ${currentPlayer.name}` : `Esperando tiempos de ${currentPlayer.name}`}
          </h2>
          {isAutoSaving && (
            <div className="flex items-center gap-1 text-blue-400">
              <LoadingSpinner size="sm" className="text-blue-400" />
              <span className="text-xs">Guardando...</span>
            </div>
          )}
        </div>
        
        {!isCurrentController && (
          <div className="text-center text-slate-400 mb-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="font-medium text-yellow-400">Esperando</span>
            </div>
            <p className="text-sm">Solo {controllerName} puede registrar resultados en este momento</p>
          </div>
        )}
        
        {isCurrentController && lapTimes.map((lapTime, i) => {
            const timeInMs = timeToMs(lapTime);
            
            // If we have a valid time entered
            if (timeInMs > 0) {
                // Check if this is a historical best (or first time if no historical record)
                const isHistoricalBest = currentCircuit.historicalBestLap === null || 
                                       currentCircuit.historicalBestLap === undefined || 
                                       timeInMs < currentCircuit.historicalBestLap;
                
                // Check if this is a session best (or first time if no session record)
                const isSessionBest = circuitSessionBests.bestLap === null || 
                                    circuitSessionBests.bestLap === undefined || 
                                    timeInMs < circuitSessionBests.bestLap;
                
                // Historical takes priority over session
                const bestType = isHistoricalBest ? 'historical' : isSessionBest ? 'session' : undefined;
                
                return (
                  <div key={i} className="flex items-center gap-2 md:gap-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-400 w-16 text-sm">Vuelta {i + 1}</span>
                      {savedLapTimes[i] && (
                        <div className="w-2 h-2 bg-green-400 rounded-full" title="Guardado automáticamente"></div>
                      )}
                    </div>
                    <div className="flex-1 grid grid-cols-3 gap-2">
                        <TimeInput value={lapTime.min} onChange={v => handleLapTimeChange(i, 'min', v)} maxLength={1} placeholder="M" isBest={bestType} data-lap={i} data-field="min" />
                        <TimeInput value={lapTime.sec} onChange={v => handleLapTimeChange(i, 'sec', v)} maxLength={2} placeholder="SS" isBest={bestType} data-lap={i} data-field="sec" />
                        <TimeInput value={lapTime.ms} onChange={v => handleLapTimeChange(i, 'ms', v)} maxLength={3} placeholder="ms" isBest={bestType} data-lap={i} data-field="ms" />
                    </div>
                  </div>
                );
            }
            
            // If no valid time yet, show normal inputs
            return (
              <div key={i} className="flex items-center gap-2 md:gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-400 w-16 text-sm">Vuelta {i + 1}</span>
                  {savedLapTimes[i] && (
                    <div className="w-2 h-2 bg-green-400 rounded-full" title="Guardado automáticamente"></div>
                  )}
                </div>
                <div className="flex-1 grid grid-cols-3 gap-2">
                    <TimeInput value={lapTime.min} onChange={v => handleLapTimeChange(i, 'min', v)} maxLength={1} placeholder="M" data-lap={i} data-field="min" />
                    <TimeInput value={lapTime.sec} onChange={v => handleLapTimeChange(i, 'sec', v)} maxLength={2} placeholder="SS" data-lap={i} data-field="sec" />
                    <TimeInput value={lapTime.ms} onChange={v => handleLapTimeChange(i, 'ms', v)} maxLength={3} placeholder="ms" data-lap={i} data-field="ms" />
                </div>
              </div>
            );
        })}

        {/* Average Display */}
        {isCurrentController && currentAverage !== null && (
                <div className={`pt-4 border-t text-center rounded-lg p-3 ${
                    (currentCircuit.historicalBestAverage === null || currentCircuit.historicalBestAverage === undefined || currentAverage < currentCircuit.historicalBestAverage) ? 'border-purple-500 bg-purple-900/20' : 
                    (circuitSessionBests.bestAverage === null || circuitSessionBests.bestAverage === undefined || currentAverage < circuitSessionBests.bestAverage) ? 'border-green-500 bg-green-900/20' : 
                    'border-slate-700'
                }`}>
                    <p className="text-slate-400">Tiempo Promedio</p>
                    <p className={`text-3xl font-mono font-bold ${
                        (currentCircuit.historicalBestAverage === null || currentCircuit.historicalBestAverage === undefined || currentAverage < currentCircuit.historicalBestAverage) ? 'text-purple-400' : 
                        (circuitSessionBests.bestAverage === null || circuitSessionBests.bestAverage === undefined || currentAverage < circuitSessionBests.bestAverage) ? 'text-green-400' : 
                        'text-slate-200'
                    }`}>
                        {formatTime(currentAverage)}
                    </p>
                    {(currentCircuit.historicalBestAverage === null || currentCircuit.historicalBestAverage === undefined || currentAverage < currentCircuit.historicalBestAverage) && (
                        <p className="text-xs text-purple-300 mt-1">🏆 NEW HISTORICAL RECORD!</p>
                    )}
                    {!(currentCircuit.historicalBestAverage === null || currentCircuit.historicalBestAverage === undefined || currentAverage < currentCircuit.historicalBestAverage) && (circuitSessionBests.bestAverage === null || circuitSessionBests.bestAverage === undefined || currentAverage < circuitSessionBests.bestAverage) && (
                        <p className="text-xs text-green-300 mt-1">⭐ NEW SESSION BEST!</p>
                    )}
                    {settings.lapsPerTurn === 5 && settings.useBest4Of5Laps && <p className="text-xs text-slate-500 mt-1">Based on best 4 laps</p>}
                </div>
        )}

        {/* Action Buttons */}
        {isCurrentController && (
          <div className="flex justify-center">
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="w-full max-w-md bg-green-600 text-white font-bold py-4 md:py-3 px-6 rounded-xl hover:bg-green-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-lg md:text-base touch-manipulation"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="text-white" />
                  <span className="hidden sm:inline">Guardando...</span>
                  <span className="sm:hidden">Guardando</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-7 h-7 md:w-6 md:h-6" /> 
                  <span className="hidden sm:inline">Grabar Tiempos y Terminar Turno</span>
                  <span className="sm:hidden">Grabar y Continuar</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
      
      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts shortcuts={shortcuts} enabled={!isSubmitting && isCurrentController} />
      <KeyboardHelp 
        shortcuts={shortcuts} 
        isOpen={showKeyboardHelp} 
        onClose={() => setShowKeyboardHelp(false)} 
      />
      
      {/* Transfer Control Dialog */}
      <TransferControlDialog
        isOpen={showTransferDialog}
        onClose={() => setShowTransferDialog(false)}
        onTransfer={handleTransferControl}
        participantUsers={participantUsers}
        currentControllerId={currentController}
      />
    </div>
  );
};

export default RaceView;