import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSWRConfig } from 'swr';
import { GameState, LapTime as LapTimeType, Player } from '../types';
import LoadingSpinner from './LoadingSpinner';
import TransferControlDialog from './TransferControlDialog';

interface RaceViewProps {
  gameState: GameState;
  players: Player[];
  gameId: string;
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

// Helper function to clean up stale localStorage data
const cleanupStaleLocalStorage = (gameId: string, playerId: string) => {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('lap-times-') && !key.includes(`${gameId}-${playerId}`)) {
      localStorage.removeItem(key);
    }
  });
};

const TimeInput: React.FC<{ 
  value: string; 
  onChange: (val: string) => void; 
  maxLength: number; 
  placeholder: string; 
  borderColorClass?: string;
}> = ({ value, onChange, maxLength, placeholder, borderColorClass = 'border-zinc-700' }) => {
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
            className={`w-full text-center text-2xl font-mono p-3 rounded-md border-2 transition-colors touch-target bg-zinc-900 text-zinc-100 ${borderColorClass} focus:border-red-500`}
        />
    );
};

const RaceView: React.FC<RaceViewProps> = ({ gameState, players, gameId, onTurnComplete, onNextCircuit, onGameEnd, currentUser }) => {
  const { 
    settings, 
    circuits, 
    currentCircuitIndex, 
    currentTurn, 
    currentPlayerIndex, 
    sessionBestTimes,
    playerOrder, 
    currentController, 
    participantUsers = [] 
  } = gameState || {};

  if (!gameState || !settings || !circuits || !playerOrder || !players) {
    return <div className="min-h-screen bg-f1-black flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>;
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

  if (!currentCircuit || !currentPlayerId || !currentPlayer) {
    return <div className="min-h-screen bg-f1-black flex items-center justify-center text-f1-red">
      Error: Datos incompletos
    </div>;
  }

  const [lapTimes, setLapTimes] = useState<LapTimeType[]>(() => {
    // Try to restore lap times from localStorage first
    // Include gameId to ensure we don't load data from previous games
    const storageKey = `lap-times-${gameId}-${currentPlayerId}-${currentCircuit?.id}-${currentTurn}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === settings.lapsPerTurn) {
          // Validate that this data belongs to current player
          const validationKey = `lap-times-validation-${gameId}`;
          const validation = localStorage.getItem(validationKey);
          if (validation === currentPlayerId) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Failed to parse saved lap times:', e);
      }
    }
    // Clear any stale data when initializing for a new player
    cleanupStaleLocalStorage(gameId, currentPlayerId);
    return Array(settings.lapsPerTurn).fill({ min: '', sec: '', ms: '' });
  });
  const [currentAverage, setCurrentAverage] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [savedLapTimes, setSavedLapTimes] = useState<Record<number, boolean>>({});
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { mutate } = useSWRConfig();

  const isCurrentController = currentUser.userId === currentController;

  // Removed access restriction for testing
  // if (!isCurrentController) {
  //   return (
  //     <div className="min-h-screen bg-black flex items-center justify-center p-4">
  //       <div className="text-center">
  //         <h2 className="text-2xl font-bold text-zinc-100 mb-4">Sin Acceso</h2>
  //         <p className="text-zinc-400 text-lg mb-6">
  //           Solo el jugador con turno activo puede registrar tiempos
  //         </p>
  //         <p className="text-zinc-300">
  //           Turno actual: <span className="font-bold text-red-500">{currentPlayer?.name}</span>
  //         </p>
  //       </div>
  //     </div>
  //   );
  // }

  // Auto-save individual lap time and check for records
  const autoSaveLapTime = useCallback(async (lapIndex: number, timeMs: number) => {
    if (!gameState?.settings || timeMs <= 0) return;
    
    try {
      setIsAutoSaving(true);
      
      // Save individual lap time
      const response = await fetch('/api/lap-times/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: gameId,
          playerId: currentPlayerId,
          circuitId: currentCircuit.id,
          turnNumber: currentTurn,
          lapNumber: lapIndex + 1,
          timeMs
        })
      });
      
      if (response.ok) {
        setSavedLapTimes(prev => ({ ...prev, [lapIndex]: true }));
        
        // Invalidate live lap times cache to refresh LIVE page immediately
        mutate(`/api/lap-times/live?gameId=${gameId}&circuitId=${currentCircuit.id}&turnNumber=${currentTurn}`);
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
    
    // Save to localStorage immediately for form persistence
    const storageKey = `lap-times-${gameId}-${currentPlayerId}-${currentCircuit?.id}-${currentTurn}`;
    localStorage.setItem(storageKey, JSON.stringify(newLapTimes));
    // Also save validation key to ensure data integrity
    localStorage.setItem(`lap-times-validation-${gameId}`, currentPlayerId);
    
    const updatedLapTime = newLapTimes[index];
    const timeMs = timeToMs(updatedLapTime);
    
    if (timeMs > 0) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSaveLapTime(index, timeMs);
      }, 1000);
    } else {
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
  }, [calculateAverage]);

  const handleSubmit = async () => {
    const validTimes = lapTimes.map(timeToMs).filter(ms => ms > 0);
    
    if (validTimes.length < settings.lapsPerTurn) {
      alert(`Por favor ingresa las ${settings.lapsPerTurn} vueltas antes de continuar.`);
      return;
    }

    // IMPORTANT: Calculate and save best lap and average BEFORE completing turn
    const bestLap = Math.min(...validTimes);
    const average = validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length;

    // Update historical records for circuit if needed
    try {
      await fetch('/api/circuits/update-records', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          circuitId: currentCircuit.id,
          bestLap: bestLap,
          bestLapPlayerId: currentPlayerId,
          bestAverage: average,
          bestAveragePlayerId: currentPlayerId
        })
      });
    } catch (error) {
      console.error('Failed to update circuit records:', error);
    }

    setIsSubmitting(true);
    try {
      await onTurnComplete(currentPlayerId, validTimes);
      
      // Clear localStorage after successful submission
      const storageKey = `lap-times-${gameId}-${currentPlayerId}-${currentCircuit?.id}-${currentTurn}`;
      localStorage.removeItem(storageKey);
      // Clear validation key
      localStorage.removeItem(`lap-times-validation-${gameId}`);
      
    } catch (error) {
      console.error('Error submitting turn:', error);
      alert('Error al guardar los tiempos. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransferControl = async (newControllerId: string) => {
    const validTimes = lapTimes.map(timeToMs).filter(ms => ms > 0);
    
    if (validTimes.length < settings.lapsPerTurn) {
      alert(`Por favor ingresa las ${settings.lapsPerTurn} vueltas antes de continuar.`);
      return;
    }

    // IMPORTANT: Calculate and save best lap and average BEFORE completing turn
    const bestLap = Math.min(...validTimes);
    const average = validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length;

    // Update historical records for circuit if needed
    try {
      await fetch('/api/circuits/update-records', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          circuitId: currentCircuit.id,
          bestLap: bestLap,
          bestLapPlayerId: currentPlayerId,
          bestAverage: average,
          bestAveragePlayerId: currentPlayerId
        })
      });
    } catch (error) {
      console.error('Failed to update circuit records:', error);
    }

    setIsSubmitting(true);
    try {
      await onTurnComplete(currentPlayerId, validTimes, newControllerId);
      
      // Clear localStorage after successful submission
      const storageKey = `lap-times-${gameId}-${currentPlayerId}-${currentCircuit?.id}-${currentTurn}`;
      localStorage.removeItem(storageKey);
      // Clear validation key
      localStorage.removeItem(`lap-times-validation-${gameId}`);
      
      setShowTransferDialog(false);
    } catch (error) {
      console.error('Error transferring control:', error);
      alert('Error al transferir el control. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLastPlayer = currentPlayerIndex === playerOrder.length - 1;
  const isLastTurn = currentTurn === settings.turnsPerCircuit;
  const isLastCircuit = currentCircuitIndex === circuits.length - 1;

  // Enhanced color validation logic
  const getBorderColorForLap = (lapTime: LapTimeType, index: number): string => {
    const timeMs = timeToMs(lapTime);
    if (timeMs <= 0) return 'border-zinc-700';
    
    // Priority: Historical > Session > Normal
    // Check against historical best lap
    if (currentCircuit.historicalBestLap && timeMs <= currentCircuit.historicalBestLap) {
      return 'border-purple-500'; // Historical record - MORADO
    }
    
    // Check against session best lap
    if (circuitSessionBests.bestLap && timeMs <= circuitSessionBests.bestLap) {
      return 'border-green-500'; // Session record - VERDE
    }
    
    return 'border-zinc-700'; // Normal
  };

  // Get next player
  const nextPlayerIndex = (currentPlayerIndex + 1) % playerOrder.length;
  const nextPlayer = players.find(p => p.id === playerOrder[nextPlayerIndex]);

  return (
    <div className="min-h-screen bg-black p-3">
      <div className="max-w-md mx-auto space-y-4">
        
        {/* Custom Header inspired by header.png */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
          {/* Circuit Name and Current Player */}
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-red-500">{currentCircuit.name}</h1>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-zinc-100 font-bold">{currentPlayer.name}</span>
            </div>
          </div>
          
          {/* Next Player */}
          <div className="text-zinc-400 text-sm mb-4">
            Siguiente: <span className="text-zinc-300 font-semibold">{nextPlayer?.name || 'N/A'}</span>
          </div>
          
          {/* Records Section */}
          <div className="grid grid-cols-2 gap-3">
            {/* Historical Records */}
            <div>
              <div className="text-zinc-400 text-xs mb-2">Histórico</div>
              <div className="space-y-1">
                <div className="flex justify-between items-center bg-zinc-800 p-2 rounded text-xs">
                  <span className="text-zinc-300">VR</span>
                  <span className="text-purple-400 font-mono">
                    {formatTime(currentCircuit.historicalBestLap)}
                  </span>
                  <span className="text-zinc-500 text-[10px]">
                    {currentCircuit.bestLapHolderId 
                      ? players.find(p => p.id === currentCircuit.bestLapHolderId)?.name?.substring(0, 5) || 'N/A'
                      : 'N/A'
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center bg-zinc-800 p-2 rounded text-xs">
                  <span className="text-zinc-300">PR</span>
                  <span className="text-purple-400 font-mono">
                    {formatTime(currentCircuit.historicalBestAverage)}
                  </span>
                  <span className="text-zinc-500 text-[10px]">
                    {currentCircuit.bestAverageHolderId 
                      ? players.find(p => p.id === currentCircuit.bestAverageHolderId)?.name?.substring(0, 5) || 'N/A'
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>
            
            {/* Session Records */}
            <div>
              <div className="text-zinc-400 text-xs mb-2">Sesión</div>
              <div className="space-y-1">
                <div className="flex justify-between items-center bg-zinc-800 p-2 rounded text-xs">
                  <span className="text-zinc-300">VR</span>
                  <span className="text-green-400 font-mono">
                    {formatTime(circuitSessionBests.bestLap) || '--:--.---'}
                  </span>
                  <span className="text-zinc-500 text-[10px]">
                    {circuitSessionBests.bestLapPlayerId 
                      ? players.find(p => p.id === circuitSessionBests.bestLapPlayerId)?.name?.substring(0, 5) || 'N/A'
                      : 'N/A'
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center bg-zinc-800 p-2 rounded text-xs">
                  <span className="text-zinc-300">PR</span>
                  <span className="text-green-400 font-mono">
                    {formatTime(circuitSessionBests.bestAverage) || '--:--.---'}
                  </span>
                  <span className="text-zinc-500 text-[10px]">
                    {circuitSessionBests.bestAveragePlayerId 
                      ? players.find(p => p.id === circuitSessionBests.bestAveragePlayerId)?.name?.substring(0, 5) || 'N/A'
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* REGISTRO - Compact Time Input Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-md p-3">
          <div className="mb-3">
            <h2 className="text-lg font-bold text-zinc-100 text-center">Registro</h2>
          </div>
          
          <div className="space-y-3">
            {lapTimes.map((lapTime, index) => {
              const borderColor = getBorderColorForLap(lapTime, index);
              const isSaved = savedLapTimes[index];
              
              return (
                <div key={index} className="grid grid-cols-4 gap-2 items-center">
                  {/* Lap Label */}
                  <div className="flex items-center gap-1">
                    <span className="text-zinc-300 font-semibold text-sm">V{index + 1}</span>
                    {isSaved && (
                      <span className="text-green-400 text-xs">✓</span>
                    )}
                  </div>
                  
                  {/* Time Inputs */}
                  <TimeInput
                    value={lapTime.min}
                    onChange={(val) => handleLapTimeChange(index, 'min', val)}
                    maxLength={1}
                    placeholder="0"
                    borderColorClass={borderColor}
                  />
                  <TimeInput
                    value={lapTime.sec}
                    onChange={(val) => handleLapTimeChange(index, 'sec', val)}
                    maxLength={2}
                    placeholder="00"
                    borderColorClass={borderColor}
                  />
                  <TimeInput
                    value={lapTime.ms}
                    onChange={(val) => handleLapTimeChange(index, 'ms', val)}
                    maxLength={3}
                    placeholder="000"
                    borderColorClass={borderColor}
                  />
                </div>
              );
            })}
          </div>
          
          <div className="text-center mt-3">
            <span className="text-xs text-zinc-500">M : SS . mmm</span>
          </div>
        </div>

        {/* Current Average */}
        {currentAverage !== null && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-md p-3">
            <div className="flex justify-between items-center">
              <span className="text-lg text-zinc-100 font-semibold">Promedio</span>
              <span className={`text-xl font-mono font-bold ${
                // Apply same priority logic: Historical > Session > Normal
                currentCircuit.historicalBestAverage && currentAverage <= currentCircuit.historicalBestAverage
                  ? 'text-purple-400' // Historical record - MORADO
                  : circuitSessionBests.bestAverage && currentAverage <= circuitSessionBests.bestAverage
                  ? 'text-green-400' // Session record - VERDE
                  : 'text-zinc-100' // Normal
              }`}>
                {formatTime(currentAverage)}
              </span>
            </div>
            {settings.lapsPerTurn === 5 && settings.useBest4Of5Laps && (
              <p className="text-xs text-zinc-500 mt-2 text-center">
                Mejores 4 de 5 vueltas
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || lapTimes.map(timeToMs).filter(ms => ms > 0).length < settings.lapsPerTurn}
            className="w-full touch-target bg-red-600 text-white font-bold text-lg rounded-md py-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-red-700"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" />
                Guardando...
              </span>
            ) : (
              <span>
                {isLastPlayer && isLastTurn
                  ? (isLastCircuit ? 'Finalizar Juego' : 'Siguiente Circuito')
                  : 'Siguiente Jugador'
                }
              </span>
            )}
          </button>

          {participantUsers.length > 1 && (
            <button
              onClick={() => setShowTransferDialog(true)}
              disabled={isSubmitting}
              className="w-full touch-target bg-zinc-800 border border-zinc-600 text-zinc-100 font-semibold text-base rounded-md py-2 transition-all hover:bg-zinc-700"
            >
              Transferir Control
            </button>
          )}
        </div>

        {/* Auto-save indicator */}
        {isAutoSaving && (
          <div className="text-center text-base text-zinc-400 animate-pulse">
            Guardando automáticamente...
          </div>
        )}
      </div>

      {/* Transfer Control Dialog */}
      {showTransferDialog && (
        <TransferControlDialog
          isOpen={showTransferDialog}
          onClose={() => setShowTransferDialog(false)}
          participantUsers={participantUsers}
          currentControllerId={gameState.currentController}
          onTransfer={handleTransferControl}
        />
      )}
    </div>
  );
};

export default RaceView;