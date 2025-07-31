import React from 'react';
import { GameState, Player, Circuit } from '../types';
import { TrophyIcon, StopwatchIcon } from './icons';

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

  // Calculate current standings
  const standings = gameState.playerOrder.map((playerId, position) => {
    const player = players.find(p => p.id === playerId);
    const stats = gameState.playerStats[playerId];
    const pointsDifference = position === 0 ? 0 : stats.totalScore - gameState.playerStats[gameState.playerOrder[0]].totalScore;
    
    return {
      position: position + 1,
      player,
      stats,
      pointsDifference
    };
  });

  // Get top 5 session times from lapTimesLog
  const sessionTimes = gameState.lapTimesLog
    .filter(lap => lap.circuitName === currentCircuit.name)
    .sort((a, b) => a.time - b.time)
    .slice(0, 5)
    .map((lap, index) => ({
      position: index + 1,
      player: players.find(p => p.id === lap.playerId),
      time: lap.time,
      turn: lap.turn,
      lap: lap.lap
    }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-red-900/20 p-3 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <img 
              src="https://storage.googleapis.com/poker-enfermos/f1-logo.png" 
              alt="F1 Logo" 
              className="w-12 h-9 object-contain"
            />
            <h1 className="text-3xl md:text-4xl font-bold text-white">F1 Night</h1>
          </div>
          <div className="text-lg md:text-xl text-slate-300">
            <span className="text-[#FF1801] font-bold">{currentCircuit.name}</span> • 
            Turno {gameState.currentTurn} de {gameState.settings.turnsPerCircuit}
          </div>
          <div className="text-slate-400">
            Corriendo: <span className="text-white font-semibold">{currentPlayer?.name}</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Championship Standings */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-[#FF1801] to-red-700 p-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <TrophyIcon className="w-6 h-6" />
                  Clasificación del Campeonato
                </h2>
              </div>
              
              <div className="divide-y divide-slate-700">
                {standings.map(({ position, player, stats, pointsDifference }) => (
                  <div 
                    key={player?.id} 
                    className={`p-4 flex items-center gap-4 ${
                      position === 1 ? 'bg-yellow-500/10 border-l-4 border-yellow-500' :
                      position === 2 ? 'bg-slate-300/5 border-l-4 border-slate-300' :
                      position === 3 ? 'bg-orange-600/10 border-l-4 border-orange-600' :
                      'hover:bg-slate-700/30'
                    }`}
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-slate-700 rounded-full">
                      <span className={`font-bold text-sm ${
                        position === 1 ? 'text-yellow-400' :
                        position === 2 ? 'text-slate-300' :
                        position === 3 ? 'text-orange-400' :
                        'text-slate-400'
                      }`}>
                        {position}
                      </span>
                    </div>
                    
                    <img 
                      src={player?.imageUrl} 
                      alt={player?.name} 
                      className="w-12 h-12 rounded-full border-2 border-slate-600"
                    />
                    
                    <div className="flex-grow">
                      <div className="font-bold text-white text-lg">{player?.name}</div>
                      <div className="text-slate-400 text-sm">
                        {stats.totalScore} puntos
                        {pointsDifference < 0 && (
                          <span className="text-red-400 ml-2">({pointsDifference})</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">{stats.totalScore}</div>
                      <div className="text-xs text-slate-400">PTS</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Session Records & Top Times */}
          <div className="space-y-6">
            
            {/* Session Best Times */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-green-700 p-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <StopwatchIcon className="w-5 h-5" />
                  Records de Sesión
                </h3>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Mejor Vuelta:</span>
                  <span className="text-green-400 font-mono font-bold">
                    {formatTime(gameState.sessionBestLap)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Mejor Promedio:</span>
                  <span className="text-green-400 font-mono font-bold">
                    {formatTime(gameState.sessionBestAverage)}
                  </span>
                </div>
              </div>
            </div>

            {/* Top 5 Session Times */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-4">
                <h3 className="text-lg font-bold text-white">Top 5 Tiempos</h3>
                <p className="text-purple-200 text-sm">{currentCircuit.name}</p>
              </div>
              
              <div className="divide-y divide-slate-700">
                {sessionTimes.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">
                    No hay tiempos registrados aún
                  </div>
                ) : (
                  sessionTimes.map(({ position, player, time, turn, lap }) => (
                    <div key={`${player?.id}-${turn}-${lap}`} className="p-3 flex items-center gap-3">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        position === 1 ? 'bg-purple-600 text-white' :
                        position === 2 ? 'bg-purple-700 text-purple-200' :
                        'bg-slate-700 text-slate-300'
                      }`}>
                        {position}
                      </div>
                      
                      <img 
                        src={player?.imageUrl} 
                        alt={player?.name} 
                        className="w-8 h-8 rounded-full"
                      />
                      
                      <div className="flex-grow">
                        <div className="text-white font-medium text-sm">{player?.name}</div>
                        <div className="text-slate-400 text-xs">T{turn} V{lap}</div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`font-mono font-bold text-sm ${
                          position === 1 ? 'text-purple-400' : 'text-slate-300'
                        }`}>
                          {formatTime(time)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpectatorDashboard;