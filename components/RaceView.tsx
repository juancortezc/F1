import React, { useState, useEffect, useCallback } from 'react';
import { GameState, LapTime as LapTimeType, Player } from '../types';
import { StopwatchIcon, TrophyIcon, CheckCircleIcon } from './icons';

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
    if(isBest === 'historical') colorClass = 'bg-red-900/50 border-red-500 text-red-300';

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

  const handleSubmit = () => {
    const timesInMs = lapTimes.map(timeToMs).filter(ms => ms > 0);
    if (timesInMs.length !== settings.lapsPerTurn) {
      alert(`Please enter all ${settings.lapsPerTurn} lap times.`);
      return;
    }
    onTurnComplete(currentPlayerId, timesInMs);
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
                  {isLastCircuit ? 'View Final Results' : 'Continue to Next Circuit'}
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
                    <p className="text-slate-400">Turn {currentTurn} of {settings.turnsPerCircuit}</p>
                </div>
                <div className="text-lg font-semibold mt-2 sm:mt-0 text-right">
                    <p>Racing: {currentPlayer.name}</p>
                    {nextPlayer && <p className="text-sm text-slate-400">Next up: {nextPlayer.name}</p>}
                </div>
            </div>
        </div>

        {/* Best Times */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-slate-800 p-3 rounded-lg">
                <h3 className="text-slate-400 text-sm font-semibold mb-2 flex items-center gap-2"><TrophyIcon className="w-4 h-4 text-[#FF1801]"/> Historical Bests</h3>
                <div className="flex justify-around font-mono text-lg">
                    <p><span className="text-xs text-slate-500">Lap:</span> {formatTime(currentCircuit.historicalBestLap)}</p>
                    <p><span className="text-xs text-slate-500">Avg:</span> {formatTime(currentCircuit.historicalBestAverage)}</p>
                </div>
             </div>
             <div className="bg-slate-800 p-3 rounded-lg">
                <h3 className="text-slate-400 text-sm font-semibold mb-2 flex items-center gap-2"><StopwatchIcon className="w-4 h-4 text-green-400"/> Session Bests</h3>
                <div className="flex justify-around font-mono text-lg">
                    <p><span className="text-xs text-slate-500">Lap:</span> <span className="text-green-400">{formatTime(sessionBestLap)}</span></p>
                    <p><span className="text-xs text-slate-500">Avg:</span> <span className="text-green-400">{formatTime(sessionBestAverage)}</span></p>
                </div>
             </div>
        </div>

      {/* Time Input Form */}
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-slate-700 space-y-4">
        <h2 className="text-xl font-bold text-center">Enter {currentPlayer.name}'s Lap Times</h2>
        {lapTimes.map((lapTime, i) => {
            const timeInMs = timeToMs(lapTime);
            const isSessionBest = timeInMs > 0 && timeInMs < sessionBestLap;
            const isHistoricalBest = timeInMs > 0 && currentCircuit.historicalBestLap !== null && timeInMs < currentCircuit.historicalBestLap;
            
            return (
              <div key={i} className="flex items-center gap-2 md:gap-4">
                <span className="font-bold text-slate-400 w-16">Lap {i + 1}</span>
                <div className="flex-1 grid grid-cols-3 gap-2">
                    <TimeInput value={lapTime.min} onChange={v => handleLapTimeChange(i, 'min', v)} maxLength={1} placeholder="M" isBest={isHistoricalBest ? 'historical' : isSessionBest ? 'session' : undefined} />
                    <TimeInput value={lapTime.sec} onChange={v => handleLapTimeChange(i, 'sec', v)} maxLength={2} placeholder="SS" isBest={isHistoricalBest ? 'historical' : isSessionBest ? 'session' : undefined}/>
                    <TimeInput value={lapTime.ms} onChange={v => handleLapTimeChange(i, 'ms', v)} maxLength={3} placeholder="ms" isBest={isHistoricalBest ? 'historical' : isSessionBest ? 'session' : undefined}/>
                </div>
              </div>
            );
        })}

        {/* Average Display */}
        {currentAverage !== null && (
            <div className="pt-4 border-t border-slate-700 text-center">
                <p className="text-slate-400">Average Time</p>
                <p className={`text-3xl font-mono font-bold ${currentAverage < (currentCircuit.historicalBestAverage || Infinity) ? 'text-red-400' : currentAverage < sessionBestAverage ? 'text-green-400' : ''}`}>
                    {formatTime(currentAverage)}
                </p>
                 {settings.lapsPerTurn === 5 && settings.useBest4Of5Laps && <p className="text-xs text-slate-500">Based on best 4 laps</p>}
            </div>
        )}

        {/* Submit Button */}
        <button onClick={handleSubmit} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2">
            <CheckCircleIcon className="w-6 h-6" /> Record Times & Finish Turn
        </button>
      </div>
    </div>
  );
};

export default RaceView;