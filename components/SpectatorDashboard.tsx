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

  // Get current circuit session times
  const currentCircuitTimes = gameState.lapTimesLog.filter(lap => lap.circuitName === currentCircuit.name);
  
  // Calculate best lap times (overall session)
  const bestLapTimes = currentCircuitTimes
    .sort((a, b) => a.time - b.time)
    .slice(0, 5)
    .map((lap, index) => ({
      position: index + 1,
      player: players.find(p => p.id === lap.playerId),
      time: lap.time,
      turn: lap.turn,
      lap: lap.lap
    }));

  // Calculate best average times per player for current circuit
  const playerAverages = new Map<string, { times: number[], player: any }>();
  
  // Group times by player and turn to calculate averages
  const turnGroups = new Map<string, number[]>();
  currentCircuitTimes.forEach(lap => {
    const key = `${lap.playerId}-${lap.turn}`;
    if (!turnGroups.has(key)) {
      turnGroups.set(key, []);
    }
    turnGroups.get(key)!.push(lap.time);
  });

  // Calculate averages for each turn
  turnGroups.forEach((times, key) => {
    const [playerId] = key.split('-');
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const sortedTimes = times.sort((a, b) => a - b);
    const timesToAverage = (gameState.settings.lapsPerTurn === 5 && gameState.settings.useBest4Of5Laps && sortedTimes.length === 5)
      ? sortedTimes.slice(0, 4)
      : sortedTimes;
    
    if (timesToAverage.length > 2) {
      const average = Math.round(timesToAverage.reduce((sum, time) => sum + time, 0) / timesToAverage.length);
      
      if (!playerAverages.has(playerId)) {
        playerAverages.set(playerId, { times: [], player });
      }
      playerAverages.get(playerId)!.times.push(average);
    }
  });

  // Get best averages
  const bestAverages = Array.from(playerAverages.entries())
    .map(([playerId, data]) => ({
      playerId,
      player: data.player,
      bestAverage: Math.min(...data.times),
      averageCount: data.times.length
    }))
    .sort((a, b) => a.bestAverage - b.bestAverage)
    .slice(0, 5);

  // Find current session records holders
  const sessionBestLapHolder = bestLapTimes[0];
  const sessionBestAverageHolder = bestAverages[0];

  // Current turn status
  const totalTurns = gameState.settings.turnsPerCircuit;
  const totalLaps = currentCircuitTimes.length;
  const expectedLaps = gameState.currentTurn * gameState.settings.players.length * gameState.settings.lapsPerTurn;
  const completionPercentage = Math.round((totalLaps / expectedLaps) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-red-900/20 p-3 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header with Live Status */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <img 
              src="https://storage.googleapis.com/poker-enfermos/f1-logo.png" 
              alt="F1 Logo" 
              className="w-12 h-9 object-contain"
            />
            <h1 className="text-3xl md:text-4xl font-bold text-white">F1 LIVE</h1>
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-[#FF1801] mb-2">{currentCircuit.name}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Turno:</span>
                <span className="ml-2 text-white font-bold">{gameState.currentTurn}/{totalTurns}</span>
              </div>
              <div>
                <span className="text-slate-400">Progreso:</span>
                <span className="ml-2 text-green-400 font-bold">{completionPercentage}%</span>
              </div>
              <div>
                <span className="text-slate-400">Total Vueltas:</span>
                <span className="ml-2 text-white font-bold">{totalLaps}</span>
              </div>
              <div>
                <span className="text-slate-400">Corriendo:</span>
                <span className="ml-2 text-yellow-400 font-bold">{currentPlayer?.name}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          
          {/* Live Records & Champions */}
          <div className="space-y-6">
            
            {/* Current Session Champions */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <TrophyIcon className="w-6 h-6" />
                  Session Champions
                </h2>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Fastest Lap */}
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">🏆</span>
                    </div>
                    <div className="flex-grow">
                      <div className="text-purple-400 text-sm font-medium">VUELTA MÁS RÁPIDA</div>
                      <div className="text-white text-xl font-bold">
                        {sessionBestLapHolder ? sessionBestLapHolder.player?.name : 'Sin registros'}
                      </div>
                      <div className="text-purple-300 font-mono">
                        {sessionBestLapHolder ? formatTime(sessionBestLapHolder.time) : '-:--.---'}
                      </div>
                      {sessionBestLapHolder && (
                        <div className="text-xs text-slate-400">
                          Turno {sessionBestLapHolder.turn} • Vuelta {sessionBestLapHolder.lap} • {currentCircuit.name}
                        </div>
                      )}
                    </div>
                    {sessionBestLapHolder && (
                      <img 
                        src={sessionBestLapHolder.player?.imageUrl} 
                        alt={sessionBestLapHolder.player?.name} 
                        className="w-16 h-16 rounded-full border-2 border-purple-500"
                      />
                    )}
                  </div>
                </div>

                {/* Best Average */}
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">⭐</span>
                    </div>
                    <div className="flex-grow">
                      <div className="text-green-400 text-sm font-medium">MEJOR PROMEDIO</div>
                      <div className="text-white text-xl font-bold">
                        {sessionBestAverageHolder ? sessionBestAverageHolder.player?.name : 'Sin registros'}
                      </div>
                      <div className="text-green-300 font-mono">
                        {sessionBestAverageHolder ? formatTime(sessionBestAverageHolder.bestAverage) : '-:--.---'}
                      </div>
                      {sessionBestAverageHolder && (
                        <div className="text-xs text-slate-400">
                          {sessionBestAverageHolder.averageCount} turnos completados • {currentCircuit.name}
                        </div>
                      )}
                    </div>
                    {sessionBestAverageHolder && (
                      <img 
                        src={sessionBestAverageHolder.player?.imageUrl} 
                        alt={sessionBestAverageHolder.player?.name} 
                        className="w-16 h-16 rounded-full border-2 border-green-500"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live Leaderboards */}
          <div className="space-y-6">
            
            {/* Top 5 Fastest Laps */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-orange-600 to-red-600 p-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  ⚡ Top 5 Vueltas Rápidas
                </h3>
                <p className="text-orange-200 text-sm">{currentCircuit.name} • En vivo</p>
              </div>
              
              <div className="divide-y divide-slate-700">
                {bestLapTimes.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">
                    <div className="animate-pulse">Esperando primer registro...</div>
                  </div>
                ) : (
                  bestLapTimes.map(({ position, player, time, turn, lap }) => (
                    <div key={`${player?.id}-${turn}-${lap}`} className="p-3 flex items-center gap-3 hover:bg-slate-700/30 transition-colors">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        position === 1 ? 'bg-orange-500 text-white' :
                        position === 2 ? 'bg-orange-600 text-orange-100' :
                        position === 3 ? 'bg-orange-700 text-orange-200' :
                        'bg-slate-700 text-slate-300'
                      }`}>
                        {position}
                      </div>
                      
                      <img 
                        src={player?.imageUrl} 
                        alt={player?.name} 
                        className="w-10 h-10 rounded-full border border-slate-600"
                      />
                      
                      <div className="flex-grow">
                        <div className="text-white font-medium">{player?.name}</div>
                        <div className="text-slate-400 text-xs">Turno {turn} • Vuelta {lap}</div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`font-mono font-bold ${
                          position === 1 ? 'text-orange-400 text-lg' : 
                          position <= 3 ? 'text-orange-300' : 'text-slate-300'
                        }`}>
                          {formatTime(time)}
                        </div>
                        {position === 1 && <div className="text-xs text-orange-300">🔥 FASTEST</div>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top 5 Best Averages */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  🎯 Top 5 Mejores Promedios
                </h3>
                <p className="text-blue-200 text-sm">{currentCircuit.name} • Consistencia</p>
              </div>
              
              <div className="divide-y divide-slate-700">
                {bestAverages.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">
                    <div className="animate-pulse">Calculando promedios...</div>
                  </div>
                ) : (
                  bestAverages.map(({ player, bestAverage, averageCount }, index) => (
                    <div key={player?.id} className="p-3 flex items-center gap-3 hover:bg-slate-700/30 transition-colors">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        index === 0 ? 'bg-blue-500 text-white' :
                        index === 1 ? 'bg-blue-600 text-blue-100' :
                        index === 2 ? 'bg-blue-700 text-blue-200' :
                        'bg-slate-700 text-slate-300'
                      }`}>
                        {index + 1}
                      </div>
                      
                      <img 
                        src={player?.imageUrl} 
                        alt={player?.name} 
                        className="w-10 h-10 rounded-full border border-slate-600"
                      />
                      
                      <div className="flex-grow">
                        <div className="text-white font-medium">{player?.name}</div>
                        <div className="text-slate-400 text-xs">{averageCount} turnos completados</div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`font-mono font-bold ${
                          index === 0 ? 'text-blue-400 text-lg' : 
                          index <= 2 ? 'text-blue-300' : 'text-slate-300'
                        }`}>
                          {formatTime(bestAverage)}
                        </div>
                        {index === 0 && <div className="text-xs text-blue-300">⭐ CONSISTENT</div>}
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