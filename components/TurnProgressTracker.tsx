import React from 'react';
import { Player } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface TurnProgressData {
  playerId: string;
  lapCount: number;
  latestLap: number | null;
  averageTime: number | null;
  isCompleted: boolean;
}

interface TurnProgressTrackerProps {
  players: Player[];
  currentTurn: number;
  lapsPerTurn: number;
  turnProgressData: TurnProgressData[];
  isLoading?: boolean;
}

const formatTime = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined || ms === Infinity || !isFinite(ms)) return '-:--.---';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

const TurnProgressTracker: React.FC<TurnProgressTrackerProps> = ({ 
  players, 
  currentTurn, 
  lapsPerTurn, 
  turnProgressData, 
  isLoading 
}) => {
  const getPlayerProgress = (playerId: string) => {
    return turnProgressData.find(p => p.playerId === playerId);
  };

  const getProgressPercentage = (lapCount: number) => {
    return Math.min((lapCount / lapsPerTurn) * 100, 100);
  };

  const getProgressColor = (progress: TurnProgressData | undefined) => {
    if (!progress) return 'bg-f1-surface';
    if (progress.isCompleted) return 'bg-f1-green';
    if (progress.lapCount >= lapsPerTurn) return 'bg-f1-yellow';
    if (progress.lapCount > 0) return 'bg-f1-yellow opacity-60';
    return 'bg-f1-surface';
  };

  return (
    <div className="surface-primary border border-subtle rounded-md">
      <div className="p-4 border-b border-subtle">
        <h3 className="text-f1-lg font-bold text-primary">
          Progreso Turno {currentTurn}
        </h3>
      </div>
      
      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="sm" />
          </div>
        ) : (
          <div className="space-y-3">
            {players.map((player) => {
              const progress = getPlayerProgress(player.id);
              const percentage = progress ? getProgressPercentage(progress.lapCount) : 0;
              
              return (
                <div key={player.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-primary font-medium">{player.name}</span>
                    <span className="text-secondary text-f1-sm">
                      {progress ? `${progress.lapCount}/${lapsPerTurn}` : `0/${lapsPerTurn}`}
                    </span>
                  </div>
                  
                  <div className="w-full bg-f1-surface rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${getProgressColor(progress)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  
                  {progress && progress.averageTime && (
                    <div className="flex justify-between text-f1-sm">
                      <span className="text-secondary">Promedio</span>
                      <span className="text-primary font-mono">
                        {formatTime(progress.averageTime)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TurnProgressTracker;