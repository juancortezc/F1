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
    if (!progress) return 'bg-slate-600';
    if (progress.isCompleted) return 'bg-green-500';
    if (progress.lapCount >= lapsPerTurn) return 'bg-blue-500';
    if (progress.lapCount > 0) return 'bg-yellow-500';
    return 'bg-slate-600';
  };

  const getStatusBadge = (progress: TurnProgressData | undefined) => {
    const className = progress?.isCompleted ? 'bg-green-600 text-green-100' :
                     progress && progress.lapCount >= lapsPerTurn ? 'bg-blue-600 text-blue-100' :
                     progress && progress.lapCount > 0 ? 'bg-yellow-600 text-yellow-100' :
                     'bg-slate-600 text-slate-300';
    
    const text = progress?.isCompleted ? 'Listo' :
                 progress && progress.lapCount >= lapsPerTurn ? 'Registrando' :
                 progress && progress.lapCount > 0 ? 'En progreso' :
                 'Esperando';
    
    return { className, text };
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-3 border-b border-slate-600">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          🏁 Progreso Turno {currentTurn}
        </h2>
        <p className="text-purple-200 text-sm">Estado por jugador</p>
      </div>
      
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" className="text-purple-400" />
            <span className="ml-2 text-slate-400">Cargando progreso...</span>
          </div>
        ) : (
          players.map((player) => {
            const progress = getPlayerProgress(player.id);
            const progressPercentage = getProgressPercentage(progress?.lapCount || 0);
            const progressColor = getProgressColor(progress);
            const statusBadge = getStatusBadge(progress);
            
            return (
              <div key={player.id} className="bg-slate-700/30 border border-slate-600 rounded-lg p-3">
                <div className="flex items-center gap-3 mb-2">
                  <img 
                    src={player.imageUrl} 
                    alt={player.name} 
                    className="w-10 h-10 rounded-full border border-slate-600"
                  />
                  <div className="flex-grow">
                    <div className="text-white font-medium">{player.name}</div>
                    <div className="text-slate-400 text-xs">
                      {progress ? (
                        progress.isCompleted ? (
                          <span className="text-green-400">✅ Turno completado</span>
                        ) : (
                          <span>
                            {progress.lapCount}/{lapsPerTurn} vueltas
                            {progress.lapCount > 0 && progress.latestLap && (
                              <span className="ml-2 text-cyan-400 font-mono">
                                Última: {formatTime(progress.latestLap)}
                              </span>
                            )}
                          </span>
                        )
                      ) : (
                        <span className="text-slate-500">Sin registros</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.className}`}>
                    {statusBadge.text}
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-slate-600 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${progressColor}`}
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                
                {/* Average Time Display */}
                {progress?.averageTime && (
                  <div className="text-center">
                    <div className="text-slate-400 text-xs">Promedio</div>
                    <div className="text-cyan-400 font-mono font-bold">
                      {formatTime(progress.averageTime)}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TurnProgressTracker;