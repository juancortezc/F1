import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, LapTime as LapTimeType, Player } from '../types';
import LoadingSpinner from './LoadingSpinner';
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
  isBest?: boolean;
}> = ({ value, onChange, maxLength, placeholder, isBest }) => {
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
            className={`w-full text-center text-3xl font-mono p-4 rounded-md border-2 transition-colors touch-target ${
              isBest 
                ? 'bg-green-900/30 border-green-500 text-green-400' 
                : 'bg-zinc-900 border-zinc-700 text-zinc-100'
            } focus:border-red-500`}
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

  const [lapTimes, setLapTimes] = useState<LapTimeType[]>(() => 
    Array(settings.lapsPerTurn).fill({ min: '', sec: '', ms: '' })
  );
  const [currentAverage, setCurrentAverage] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [savedLapTimes, setSavedLapTimes] = useState<Record<number, boolean>>({});
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isCurrentController = currentUser.userId === currentController;

  // Auto-save individual lap time
  const autoSaveLapTime = useCallback(async (lapIndex: number, timeMs: number) => {
    if (!gameState?.settings || timeMs <= 0) return;
    
    try {
      setIsAutoSaving(true);
      const response = await fetch('/api/lap-times/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: 'active-game',
          playerId: currentPlayerId,
          circuitId: currentCircuit.id,
          turnNumber: currentTurn,
          lapNumber: lapIndex + 1,
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

    setIsSubmitting(true);
    try {
      await onTurnComplete(currentPlayerId, validTimes);
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

    setIsSubmitting(true);
    try {
      await onTurnComplete(currentPlayerId, validTimes, newControllerId);
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

  // Check if any lap time matches session best
  const lapTimeMatches = lapTimes.map((lapTime, index) => {
    const timeMs = timeToMs(lapTime);
    return timeMs > 0 && timeMs === circuitSessionBests.bestLap;
  });

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-100 mb-4">F1 NIGHT</h1>
          <div className="bg-zinc-900 border border-zinc-800 rounded-md p-6">
            <div className="text-2xl font-bold text-red-500 mb-3">{currentCircuit.name}</div>
            <div className="text-xl text-zinc-100 font-bold mb-2">{currentPlayer.name}</div>
            <div className="text-zinc-300 text-lg">Turno {currentTurn} • Vuelta {currentPlayerIndex + 1}/{playerOrder.length}</div>
          </div>
        </div>

        {/* Session Records */}
        {(circuitSessionBests.bestLap || circuitSessionBests.bestAverage) && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-md p-6">
            <h2 className="text-xl font-bold text-zinc-100 mb-4">Récords de Sesión</h2>
            <div className="space-y-3">
              {circuitSessionBests.bestLap && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-300 text-lg">Mejor Vuelta</span>
                  <span className="text-green-400 font-mono font-bold text-xl">
                    {formatTime(circuitSessionBests.bestLap)}
                  </span>
                </div>
              )}
              {circuitSessionBests.bestAverage && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-300 text-lg">Mejor Promedio</span>
                  <span className="text-green-400 font-mono font-bold text-xl">
                    {formatTime(circuitSessionBests.bestAverage)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lap Time Inputs */}
        <div className="space-y-3">
          {lapTimes.map((lapTime, index) => {
            const isSessionBest = lapTimeMatches[index];
            const isSaved = savedLapTimes[index];
            
            return (
              <div key={index} className="bg-zinc-900 border border-zinc-800 rounded-md p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-zinc-100">
                    Vuelta {index + 1}
                  </h3>
                  {isSaved && (
                    <span className="text-green-400 text-base font-semibold">✓ Guardado</span>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <TimeInput
                    value={lapTime.min}
                    onChange={(val) => handleLapTimeChange(index, 'min', val)}
                    maxLength={1}
                    placeholder="0"
                    isBest={isSessionBest}
                  />
                  <TimeInput
                    value={lapTime.sec}
                    onChange={(val) => handleLapTimeChange(index, 'sec', val)}
                    maxLength={2}
                    placeholder="00"
                    isBest={isSessionBest}
                  />
                  <TimeInput
                    value={lapTime.ms}
                    onChange={(val) => handleLapTimeChange(index, 'ms', val)}
                    maxLength={3}
                    placeholder="000"
                    isBest={isSessionBest}
                  />
                </div>
                
                <div className="text-center mt-3">
                  <span className="text-base text-zinc-400">M : SS . mmm</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Average */}
        {currentAverage !== null && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-md p-6">
            <div className="flex justify-between items-center">
              <span className="text-xl text-zinc-100 font-semibold">Promedio Actual</span>
              <span className={`text-2xl font-mono font-bold ${
                circuitSessionBests.bestAverage && currentAverage <= circuitSessionBests.bestAverage
                  ? 'text-green-400'
                  : 'text-zinc-100'
              }`}>
                {formatTime(currentAverage)}
              </span>
            </div>
            {settings.lapsPerTurn === 5 && settings.useBest4Of5Laps && (
              <p className="text-base text-zinc-400 mt-3">
                Usando las mejores 4 de 5 vueltas
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        {isCurrentController && (
          <div className="space-y-3">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || lapTimes.map(timeToMs).filter(ms => ms > 0).length < settings.lapsPerTurn}
              className="w-full touch-target bg-red-600 text-white font-bold text-xl rounded-md py-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-red-700"
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
                className="w-full touch-target bg-zinc-800 border border-zinc-600 text-zinc-100 font-semibold text-lg rounded-md py-4 transition-all hover:bg-zinc-700"
              >
                Transferir Control
              </button>
            )}
          </div>
        )}

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