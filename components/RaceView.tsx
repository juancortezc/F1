import React, { useState, useEffect, useCallback } from 'react';
import { GameState, LapTime as LapTimeType, Player } from '../types';
import { StopwatchIcon, TrophyIcon, CheckCircleIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';

interface RaceViewProps {
  gameState: GameState;
  players: Player[];
  onTurnComplete: (playerId: string, lapTimes: number[]) => void;
  onNextCircuit: () => void;
  onGameEnd: () => void;
}

const formatTime = (ms: number | null | undefined): string => {
    if (ms === null || ms === undefined) return '-:--.---';
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

const TimeInput: React.FC<{ value: string; onChange: (val: string) => void; maxLength: number; placeholder: string; isBest?: 'session' | 'historical' }> = ({ value, onChange, maxLength, placeholder, isBest }) => {
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
            className={`w-full text-center text-2xl md:text-3xl font-mono p-2 rounded-md border-2 focus:outline-none focus:border-[#FF1801] transition-colors ${colorClass}`}
        />
    );
};

const RaceView: React.FC<RaceViewProps> = ({ gameState, players, onTurnComplete, onNextCircuit, onGameEnd }) => {
  const { settings, circuits, currentCircuitIndex, currentTurn, currentPlayerIndex, sessionBestLap, sessionBestAverage, playerOrder } = gameState;
  const currentCircuit = circuits[currentCircuitIndex];
  const currentPlayerId = playerOrder[currentPlayerIndex];
  const currentPlayer = players.find(p => p.id === currentPlayerId) as Player;

  const [lapTimes, setLapTimes] = useState<LapTimeType[]>(() => Array(settings.lapsPerTurn).fill({ min: '', sec: '', ms: '' }));
  const [currentAverage, setCurrentAverage] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLapTimeChange = (index: number, field: keyof LapTimeType, value: string) => {
    const newLapTimes = [...lapTimes];
    newLapTimes[index] = { ...newLapTimes[index], [field]: value };
    setLapTimes(newLapTimes);
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
  
  useEffect(() => {
     setLapTimes(Array(settings.lapsPerTurn).fill({ min: '', sec: '', ms: '' }));
     setCurrentAverage(null);
  }, [currentPlayerIndex, currentTurn, currentCircuitIndex, settings.lapsPerTurn]);

  const handleSubmit = async () => {
    const timesInMs = lapTimes.map(timeToMs).filter(ms => ms > 0);
    if (timesInMs.length !== settings.lapsPerTurn) {
      alert(`Por favor ingresa todos los ${settings.lapsPerTurn} tiempos de vuelta.`);
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onTurnComplete(currentPlayerId, timesInMs);
    } finally {
      setIsSubmitting(false);
    }
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

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header Info */}
        <div className="bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-700">
            <div className="flex flex-col sm:flex-row justify-between items-start">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-[#FF1801]">{currentCircuit.name}</h1>
                    <p className="text-slate-400">Turno {currentTurn} de {settings.turnsPerCircuit}</p>
                </div>
                <div className="text-lg font-semibold mt-2 sm:mt-0 text-right">
                    <p>Corriendo: {currentPlayer.name}</p>
                    {nextPlayer && <p className="text-sm text-slate-400">Siguiente: {nextPlayer.name}</p>}
                </div>
            </div>
        </div>

        {/* Best Times */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-slate-800 p-3 rounded-lg">
                <h3 className="text-slate-400 text-sm font-semibold mb-2 flex items-center gap-2"><TrophyIcon className="w-4 h-4 text-[#FF1801]"/> Mejores Históricos</h3>
                <div className="flex justify-around font-mono text-lg">
                    <p><span className="text-xs text-slate-500">Vuelta:</span> {formatTime(currentCircuit.historicalBestLap)}</p>
                    <p><span className="text-xs text-slate-500">Prom:</span> {formatTime(currentCircuit.historicalBestAverage)}</p>
                </div>
             </div>
             <div className="bg-slate-800 p-3 rounded-lg">
                <h3 className="text-slate-400 text-sm font-semibold mb-2 flex items-center gap-2"><StopwatchIcon className="w-4 h-4 text-green-400"/> Mejores de la Sesión</h3>
                <div className="flex justify-around font-mono text-lg">
                    <p><span className="text-xs text-slate-500">Vuelta:</span> <span className="text-green-400">{formatTime(sessionBestLap)}</span></p>
                    <p><span className="text-xs text-slate-500">Prom:</span> <span className="text-green-400">{formatTime(sessionBestAverage)}</span></p>
                </div>
             </div>
        </div>

      {/* Time Input Form */}
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-slate-700 space-y-4">
        <h2 className="text-xl font-bold text-center">Ingresa los Tiempos de Vuelta de {currentPlayer.name}</h2>
        {lapTimes.map((lapTime, i) => {
            const timeInMs = timeToMs(lapTime);
            
            // If we have a valid time entered
            if (timeInMs > 0) {
                // Check if this is a historical best (or first time if no historical record)
                const isHistoricalBest = currentCircuit.historicalBestLap === null || 
                                       currentCircuit.historicalBestLap === undefined || 
                                       timeInMs < currentCircuit.historicalBestLap;
                
                // Check if this is a session best (or first time if no session record)
                const isSessionBest = sessionBestLap === Infinity || 
                                    sessionBestLap === null || 
                                    sessionBestLap === undefined || 
                                    timeInMs < sessionBestLap;
                
                // Historical takes priority over session
                const bestType = isHistoricalBest ? 'historical' : isSessionBest ? 'session' : undefined;
                
                return (
                  <div key={i} className="flex items-center gap-2 md:gap-4">
                    <span className="font-bold text-slate-400 w-16">Vuelta {i + 1}</span>
                    <div className="flex-1 grid grid-cols-3 gap-2">
                        <TimeInput value={lapTime.min} onChange={v => handleLapTimeChange(i, 'min', v)} maxLength={1} placeholder="M" isBest={bestType} />
                        <TimeInput value={lapTime.sec} onChange={v => handleLapTimeChange(i, 'sec', v)} maxLength={2} placeholder="SS" isBest={bestType}/>
                        <TimeInput value={lapTime.ms} onChange={v => handleLapTimeChange(i, 'ms', v)} maxLength={3} placeholder="ms" isBest={bestType}/>
                    </div>
                  </div>
                );
            }
            
            // If no valid time yet, show normal inputs
            return (
              <div key={i} className="flex items-center gap-2 md:gap-4">
                <span className="font-bold text-slate-400 w-16">Vuelta {i + 1}</span>
                <div className="flex-1 grid grid-cols-3 gap-2">
                    <TimeInput value={lapTime.min} onChange={v => handleLapTimeChange(i, 'min', v)} maxLength={1} placeholder="M" />
                    <TimeInput value={lapTime.sec} onChange={v => handleLapTimeChange(i, 'sec', v)} maxLength={2} placeholder="SS" />
                    <TimeInput value={lapTime.ms} onChange={v => handleLapTimeChange(i, 'ms', v)} maxLength={3} placeholder="ms" />
                </div>
              </div>
            );
        })}

        {/* Average Display */}
        {currentAverage !== null && (() => {
            // Check if this is a historical best average (or first time if no historical record)
            const isHistoricalBestAvg = currentCircuit.historicalBestAverage === null || 
                                      currentCircuit.historicalBestAverage === undefined || 
                                      currentAverage < currentCircuit.historicalBestAverage;
            
            // Check if this is a session best average (or first time if no session record)
            const isSessionBestAvg = sessionBestAverage === Infinity || 
                                   sessionBestAverage === null || 
                                   sessionBestAverage === undefined || 
                                   currentAverage < sessionBestAverage;
            
            // Historical takes priority over session
            const avgBestType = isHistoricalBestAvg ? 'historical' : isSessionBestAvg ? 'session' : 'normal';
            
            return (
                <div className={`pt-4 border-t text-center rounded-lg p-3 ${
                    avgBestType === 'historical' ? 'border-purple-500 bg-purple-900/20' : 
                    avgBestType === 'session' ? 'border-green-500 bg-green-900/20' : 
                    'border-slate-700'
                }`}>
                    <p className="text-slate-400">Tiempo Promedio</p>
                    <p className={`text-3xl font-mono font-bold ${
                        avgBestType === 'historical' ? 'text-purple-400' : 
                        avgBestType === 'session' ? 'text-green-400' : 
                        'text-slate-200'
                    }`}>
                        {formatTime(currentAverage)}
                    </p>
                    {avgBestType === 'historical' && (
                        <p className="text-xs text-purple-300 mt-1">🏆 NEW HISTORICAL RECORD!</p>
                    )}
                    {avgBestType === 'session' && (
                        <p className="text-xs text-green-300 mt-1">⭐ NEW SESSION BEST!</p>
                    )}
                    {settings.lapsPerTurn === 5 && settings.useBest4Of5Laps && <p className="text-xs text-slate-500 mt-1">Based on best 4 laps</p>}
                </div>
            );
        })()}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={handleClear} 
            disabled={isSubmitting}
            className="bg-slate-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <span className="text-lg">↻</span> Limpiar Tiempos
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" className="text-white" />
                Guardando...
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-6 h-6" /> 
                Grabar Tiempos y Terminar Turno
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RaceView;