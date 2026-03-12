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

// Enhanced offline backup system
const BACKUP_KEY_PREFIX = 'f1-lap-backup';
const PENDING_SAVES_KEY = 'f1-pending-saves';

interface LapTimeBackup {
  gameId: string;
  playerId: string;
  circuitId: string;
  turnNumber: number;
  lapNumber: number;
  timeMs: number;
  timestamp: number;
  saved: boolean;
}

interface PendingSave extends LapTimeBackup {
  retryCount: number;
  lastAttempt: number;
}

// Backup lap time to localStorage
const backupLapTime = (backup: LapTimeBackup) => {
  const key = `${BACKUP_KEY_PREFIX}-${backup.gameId}-${backup.playerId}-${backup.circuitId}-${backup.turnNumber}-${backup.lapNumber}`;
  localStorage.setItem(key, JSON.stringify(backup));
};

// Get all unsaved backups
const getUnsavedBackups = (gameId: string): LapTimeBackup[] => {
  const keys = Object.keys(localStorage);
  const backups: LapTimeBackup[] = [];
  
  keys.forEach(key => {
    if (key.startsWith(`${BACKUP_KEY_PREFIX}-${gameId}`)) {
      try {
        const backup = JSON.parse(localStorage.getItem(key) || '');
        if (!backup.saved) {
          backups.push(backup);
        }
      } catch (e) {
        console.warn('Failed to parse backup:', key);
      }
    }
  });
  
  return backups.sort((a, b) => a.timestamp - b.timestamp);
};

// Mark backup as saved
const markBackupAsSaved = (gameId: string, playerId: string, circuitId: string, turnNumber: number, lapNumber: number) => {
  const key = `${BACKUP_KEY_PREFIX}-${gameId}-${playerId}-${circuitId}-${turnNumber}-${lapNumber}`;
  const backup = localStorage.getItem(key);
  if (backup) {
    try {
      const parsed = JSON.parse(backup);
      parsed.saved = true;
      localStorage.setItem(key, JSON.stringify(parsed));
    } catch (e) {
      console.warn('Failed to mark backup as saved:', key);
    }
  }
};

// Add to pending saves queue
const addToPendingSaves = (backup: LapTimeBackup) => {
  const pending: PendingSave = {
    ...backup,
    retryCount: 0,
    lastAttempt: Date.now()
  };
  
  const existingPending = JSON.parse(localStorage.getItem(PENDING_SAVES_KEY) || '[]');
  existingPending.push(pending);
  localStorage.setItem(PENDING_SAVES_KEY, JSON.stringify(existingPending));
};

// Get and clear pending saves
const getPendingSaves = (): PendingSave[] => {
  const pending = JSON.parse(localStorage.getItem(PENDING_SAVES_KEY) || '[]');
  return pending;
};

// Remove from pending saves
const removeFromPendingSaves = (gameId: string, playerId: string, circuitId: string, turnNumber: number, lapNumber: number) => {
  const pending = getPendingSaves();
  const filtered = pending.filter(p => 
    !(p.gameId === gameId && p.playerId === playerId && 
      p.circuitId === circuitId && p.turnNumber === turnNumber && p.lapNumber === lapNumber)
  );
  localStorage.setItem(PENDING_SAVES_KEY, JSON.stringify(filtered));
};

const TimeInput: React.FC<{ 
  value: string; 
  onChange: (val: string) => void; 
  maxLength: number; 
  placeholder: string; 
  borderColorClass?: string;
  fieldType?: 'min' | 'sec' | 'ms';
}> = ({ value, onChange, maxLength, placeholder, borderColorClass = 'border-zinc-700', fieldType }) => {
    const handleChange = (inputValue: string) => {
        // Only allow digits
        if (!/^\d*$/.test(inputValue)) {
            return;
        }
        
        // Validate ranges based on field type
        const numValue = parseInt(inputValue) || 0;
        
        if (fieldType === 'sec' && numValue > 59) {
            onChange('59');
            return;
        }
        
        if (fieldType === 'ms' && numValue > 999) {
            onChange('999');
            return;
        }
        
        onChange(inputValue);
    };

    return (
        <input
            type="tel"
            value={value}
            onChange={e => handleChange(e.target.value)}
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
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1A1A1A' }}>
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
    return <div className="min-h-screen flex items-center justify-center text-red-500" style={{ backgroundColor: '#1A1A1A' }}>
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
  const [pendingSync, setPendingSync] = useState<number>(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const isCurrentController = currentUser.userId === currentController;

  // Reset lap times when player changes
  useEffect(() => {
    // Try to restore lap times from localStorage for new player
    const storageKey = `lap-times-${gameId}-${currentPlayerId}-${currentCircuit?.id}-${currentTurn}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === settings.lapsPerTurn) {
          const validationKey = `lap-times-validation-${gameId}`;
          const validation = localStorage.getItem(validationKey);
          if (validation === currentPlayerId) {
            setLapTimes(parsed);
            setSavedLapTimes({});
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to parse saved lap times:', e);
      }
    }

    // Clear any stale data and reset for new player
    cleanupStaleLocalStorage(gameId, currentPlayerId);
    setLapTimes(Array(settings.lapsPerTurn).fill({ min: '', sec: '', ms: '' }));
    setSavedLapTimes({});
    setCurrentAverage(null);

    // Store validation key for current player
    localStorage.setItem(`lap-times-validation-${gameId}`, currentPlayerId);
  }, [currentPlayerId, currentCircuit?.id, currentTurn, gameId, settings.lapsPerTurn]);

  // Retry mechanism for pending saves
  const retryPendingSaves = useCallback(async () => {
    if (isRetrying) return;
    
    const pending = getPendingSaves();
    if (pending.length === 0) return;
    
    setIsRetrying(true);
    console.log(`Attempting to sync ${pending.length} unsaved lap times...`);
    
    for (const save of pending) {
      try {
        const response = await fetch('/api/lap-times/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: save.gameId,
            playerId: save.playerId,
            circuitId: save.circuitId,
            turnNumber: save.turnNumber,
            lapNumber: save.lapNumber,
            timeMs: save.timeMs
          })
        });
        
        if (response.ok) {
          // Success - remove from pending and mark backup as saved
          removeFromPendingSaves(save.gameId, save.playerId, save.circuitId, save.turnNumber, save.lapNumber);
          markBackupAsSaved(save.gameId, save.playerId, save.circuitId, save.turnNumber, save.lapNumber);
          console.log(`Successfully synced lap ${save.lapNumber} for player ${save.playerId}`);
        }
      } catch (error) {
        console.warn('Failed to sync lap time during retry:', error);
      }
    }
    
    const remainingPending = getPendingSaves();
    setPendingSync(remainingPending.length);
    setIsRetrying(false);
    
    if (remainingPending.length === 0) {
      console.log('All lap times successfully synced!');
    }
  }, [isRetrying]);

  // Check for pending saves on mount and network reconnection
  useEffect(() => {
    const checkPendingSync = () => {
      const pending = getPendingSaves();
      setPendingSync(pending.length);
      
      if (pending.length > 0 && navigator.onLine) {
        retryPendingSaves();
      }
    };

    // Check on mount
    checkPendingSync();

    // Listen for online event to retry pending saves
    const handleOnline = () => {
      console.log('Network reconnected - attempting to sync unsaved data...');
      retryPendingSaves();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [retryPendingSaves]);

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

  // Enhanced auto-save with offline backup system
  const autoSaveLapTime = useCallback(async (lapIndex: number, timeMs: number) => {
    if (!gameState?.settings || timeMs <= 0) return;
    
    // Always backup locally first
    const backup: LapTimeBackup = {
      gameId: gameId,
      playerId: currentPlayerId,
      circuitId: currentCircuit.id,
      turnNumber: currentTurn,
      lapNumber: lapIndex + 1,
      timeMs,
      timestamp: Date.now(),
      saved: false
    };
    
    backupLapTime(backup);
    
    try {
      setIsAutoSaving(true);
      
      // Attempt to save to server
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
        // Mark as saved both in state and backup
        setSavedLapTimes(prev => ({ ...prev, [lapIndex]: true }));
        markBackupAsSaved(gameId, currentPlayerId, currentCircuit.id, currentTurn, lapIndex + 1);
        
        // Remove from pending saves if it was there
        removeFromPendingSaves(gameId, currentPlayerId, currentCircuit.id, currentTurn, lapIndex + 1);
        
        // Invalidate live lap times cache to refresh LIVE page immediately - FIXED: Remove turnNumber to match LivePage API call
        mutate(`/api/lap-times/live?gameId=${gameId}&circuitId=${currentCircuit.id}`);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      
      // Mark as not saved and add to retry queue
      setSavedLapTimes(prev => ({ ...prev, [lapIndex]: false }));
      addToPendingSaves(backup);
      
      // Show user that there are unsaved changes
      console.warn('Lap time saved locally but not synced to server');
    } finally {
      setIsAutoSaving(false);
    }
  }, [gameState, currentPlayerId, currentCircuit?.id, currentTurn, gameId, mutate]);

  const handleLapTimeChange = (index: number, field: keyof LapTimeType, value: string) => {
    // Validate input values
    let validatedValue = value;
    
    if (field === 'sec') {
      // Seconds must be between 0-59
      const numValue = parseInt(value) || 0;
      if (numValue > 59) {
        validatedValue = '59';
      }
    } else if (field === 'ms') {
      // Milliseconds must be between 0-999
      const numValue = parseInt(value) || 0;
      if (numValue > 999) {
        validatedValue = '999';
      }
    }
    
    const newLapTimes = [...lapTimes];
    newLapTimes[index] = { ...newLapTimes[index], [field]: validatedValue };
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
    <div className="min-h-screen p-3" style={{ backgroundColor: '#1A1A1A' }}>
      <div className="max-w-md mx-auto space-y-4">
        
        {/* Custom Header inspired by header.png */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-md p-4">
          {/* Circuit Name and Current Player */}
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-red-500">{currentCircuit.name}</h1>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-zinc-100 font-bold">{currentPlayer.name}</span>
            </div>
          </div>
          
          {/* Connection Status and Sync Indicators */}
          {(pendingSync > 0 || isRetrying || !navigator.onLine) && (
            <div className="mb-3 p-2 bg-zinc-800/50 rounded-md border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {!navigator.onLine && (
                    <>
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-400 text-sm font-medium">Sin conexión</span>
                    </>
                  )}
                  {navigator.onLine && pendingSync > 0 && (
                    <>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      <span className="text-yellow-400 text-sm font-medium">
                        {isRetrying ? 'Sincronizando...' : `${pendingSync} tiempos sin sincronizar`}
                      </span>
                    </>
                  )}
                </div>
                {pendingSync > 0 && navigator.onLine && !isRetrying && (
                  <button
                    onClick={retryPendingSaves}
                    className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded transition-colors"
                  >
                    Reintentar
                  </button>
                )}
              </div>
            </div>
          )}
          
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
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-md p-3">
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
                    {isSaved === true && (
                      <span className="text-green-400 text-xs">✓</span>
                    )}
                    {isSaved === false && timeToMs(lapTime) > 0 && (
                      <span className="text-yellow-400 text-xs animate-pulse" title="Guardado localmente, pendiente sincronización">⏳</span>
                    )}
                    {isAutoSaving && (
                      <span className="text-blue-400 text-xs animate-spin">⟳</span>
                    )}
                  </div>
                  
                  {/* Time Inputs */}
                  <TimeInput
                    value={lapTime.min}
                    onChange={(val) => handleLapTimeChange(index, 'min', val)}
                    maxLength={1}
                    placeholder="0"
                    borderColorClass={borderColor}
                    fieldType="min"
                  />
                  <TimeInput
                    value={lapTime.sec}
                    onChange={(val) => handleLapTimeChange(index, 'sec', val)}
                    maxLength={2}
                    placeholder="00"
                    borderColorClass={borderColor}
                    fieldType="sec"
                  />
                  <TimeInput
                    value={lapTime.ms}
                    onChange={(val) => handleLapTimeChange(index, 'ms', val)}
                    maxLength={3}
                    placeholder="000"
                    borderColorClass={borderColor}
                    fieldType="ms"
                  />
                </div>
              );
            })}
          </div>
          
          <div className="text-center mt-3">
            <span className="text-xs text-zinc-500">M : SS . mmm</span>
            <div className="text-xs text-zinc-600 mt-1">
              SS ≤ 59 • mmm ≤ 999
            </div>
          </div>
        </div>

        {/* Current Average */}
        {currentAverage !== null && (
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-md p-3">
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