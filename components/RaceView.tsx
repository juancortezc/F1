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
            className={`w-full text-center text-f1-2xl font-mono p-3 rounded-md border-2 transition-colors touch-target ${
              isBest 
                ? 'bg-green-900/20 border-green-800 text-f1-green' 
                : 'surface-primary border-subtle text-primary'
            } focus:border-f1-red`}
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
    <div className="min-h-screen bg-f1-black p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-f1-xl font-bold text-primary mb-2">F1 NIGHT</h1>
          <div className="surface-primary border border-subtle rounded-md p-4">
            <div className="text-f1-xl font-bold text-f1-red mb-2">{currentCircuit.name}</div>
            <div className="text-f1-lg text-primary font-semibold">{currentPlayer.name}</div>
            <div className="text-secondary">Turno {currentTurn} • Vuelta {currentPlayerIndex + 1}/{playerOrder.length}</div>
          </div>
        </div>

        {/* Session Records */}
        {(circuitSessionBests.bestLap || circuitSessionBests.bestAverage) && (
          <div className="surface-primary border border-subtle rounded-md p-4">
            <h2 className="text-f1-lg font-bold text-primary mb-3">Récords de Sesión</h2>
            <div className="space-y-2">
              {circuitSessionBests.bestLap && (
                <div className="flex justify-between">
                  <span className="text-secondary">Mejor Vuelta</span>
                  <span className="text-f1-green font-mono font-bold">
                    {formatTime(circuitSessionBests.bestLap)}
                  </span>
                </div>
              )}
              {circuitSessionBests.bestAverage && (
                <div className="flex justify-between">
                  <span className="text-secondary">Mejor Promedio</span>
                  <span className="text-f1-green font-mono font-bold">
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
              <div key={index} className="surface-primary border border-subtle rounded-md p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-f1-lg font-semibold text-primary">
                    Vuelta {index + 1}
                  </h3>
                  {isSaved && (
                    <span className="text-f1-green text-f1-sm">Guardado</span>
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
                
                <div className="text-center mt-2">
                  <span className="text-f1-sm text-secondary">M : SS . mmm</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Average */}
        {currentAverage !== null && (
          <div className="surface-primary border border-subtle rounded-md p-4">
            <div className="flex justify-between items-center">
              <span className="text-f1-lg text-primary">Promedio Actual</span>
              <span className={`text-f1-xl font-mono font-bold ${
                circuitSessionBests.bestAverage && currentAverage <= circuitSessionBests.bestAverage
                  ? 'text-f1-green'
                  : 'text-primary'
              }`}>
                {formatTime(currentAverage)}
              </span>
            </div>
            {settings.lapsPerTurn === 5 && settings.useBest4Of5Laps && (
              <p className="text-f1-sm text-secondary mt-2">
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
              className="w-full touch-target bg-f1-red text-white font-bold text-f1-lg rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
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
                className="w-full touch-target surface-secondary border border-subtle text-primary font-semibold text-f1-base rounded-md transition-opacity"
              >
                Transferir Control
              </button>
            )}
          </div>
        )}

        {/* Auto-save indicator */}
        {isAutoSaving && (
          <div className="text-center text-f1-sm text-secondary animate-pulse">
            Guardando automáticamente...
          </div>
        )}
      </div>

      {/* Transfer Control Dialog */}
      {showTransferDialog && (
        <TransferControlDialog
          participantUsers={participantUsers}
          currentUserId={currentUser.userId}
          onTransfer={handleTransferControl}
          onCancel={() => setShowTransferDialog(false)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};

export default RaceView;