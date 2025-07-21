import React from 'react';
import { GameState, Player } from '../types';
import { TrophyIcon } from './icons';
import DataCard from './DataCard';
import StatsGrid from './StatsGrid';

interface RaceProgressProps {
  gameState: GameState;
  players: Player[];
}

const RaceProgress: React.FC<RaceProgressProps> = ({ gameState, players }) => {
  const { settings, currentCircuitIndex, currentTurn } = gameState;
  const totalCircuits = settings.circuits.length;
  const totalTurns = settings.turnsPerCircuit;
  
  // Calculate overall progress
  const completedCircuits = currentCircuitIndex;
  const completedTurns = completedCircuits * totalTurns + (currentTurn - 1);
  const totalProgressTurns = totalCircuits * totalTurns;
  const overallProgress = Math.round((completedTurns / totalProgressTurns) * 100);
  
  // Get current standings
  const standings = Object.entries(gameState.playerStats)
    .map(([playerId, stats]) => ({
      player: players.find(p => p.id === playerId)!,
      score: stats.totalScore
    }))
    .filter(s => s.player)
    .sort((a, b) => b.score - a.score);

  // Calculate position changes (simplified - would need historical data for real changes)
  const getPositionIndicator = (index: number) => {
    if (index === 0) return { icon: '👑', color: 'text-yellow-400', label: 'Líder' };
    if (index === 1) return { icon: '🥈', color: 'text-slate-300', label: '2do' };
    if (index === 2) return { icon: '🥉', color: 'text-amber-600', label: '3ro' };
    return { icon: `${index + 1}`, color: 'text-slate-400', label: `${index + 1}°` };
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-100">Progreso del Campeonato</h3>
          <span className="text-sm text-slate-400">
            Circuito {currentCircuitIndex + 1} de {totalCircuits}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-slate-700 rounded-full h-3 mb-4">
          <div 
            className="bg-gradient-to-r from-[#FF1801] to-red-600 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${overallProgress}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-sm text-slate-400">
          <span>Turno {currentTurn} de {totalTurns}</span>
          <span>{overallProgress}% Completado</span>
        </div>
      </div>

      {/* Circuit Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settings.circuits.map((circuit, index) => {
          const isCompleted = index < currentCircuitIndex;
          const isCurrent = index === currentCircuitIndex;
          const isUpcoming = index > currentCircuitIndex;
          
          let status = 'upcoming';
          let statusColor = 'text-slate-500';
          let statusBg = 'bg-slate-800/30';
          
          if (isCompleted) {
            status = 'completed';
            statusColor = 'text-green-400';
            statusBg = 'bg-green-900/20 border-green-500/30';
          } else if (isCurrent) {
            status = 'current';
            statusColor = 'text-[#FF1801]';
            statusBg = 'bg-[#FF1801]/10 border-[#FF1801]/30';
          }
          
          return (
            <div key={circuit.id} className={`p-4 rounded-lg border ${statusBg}`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-slate-200 text-sm truncate">
                  {circuit.name}
                </h4>
                <div className={`text-xs font-medium ${statusColor}`}>
                  {status === 'completed' && '✓'}
                  {status === 'current' && '🏁'}
                  {status === 'upcoming' && '⏳'}
                </div>
              </div>
              
              {isCurrent && (
                <div className="w-full bg-slate-700 rounded h-1.5 mb-2">
                  <div 
                    className="bg-[#FF1801] h-1.5 rounded transition-all duration-300"
                    style={{ width: `${((currentTurn - 1) / totalTurns) * 100}%` }}
                  ></div>
                </div>
              )}
              
              <p className="text-xs text-slate-400">
                {isCompleted ? 'Completado' : 
                 isCurrent ? `Turno ${currentTurn}/${totalTurns}` : 
                 'Próximo'}
              </p>
            </div>
          );
        })}
      </div>

      {/* Current Standings */}
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-slate-700">
        <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
          <TrophyIcon className="w-5 h-5 text-[#FF1801]" />
          Clasificación Actual
        </h3>
        
        <div className="space-y-3">
          {standings.slice(0, 5).map((standing, index) => {
            const positionInfo = getPositionIndicator(index);
            
            return (
              <div key={standing.player.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`text-lg font-bold w-8 text-center ${positionInfo.color}`}>
                    {positionInfo.icon}
                  </div>
                  <img 
                    src={standing.player.imageUrl} 
                    alt={standing.player.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="font-medium text-slate-200">
                    {standing.player.name}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-100">
                    {standing.score} pts
                  </div>
                  <div className={`text-xs ${positionInfo.color}`}>
                    {positionInfo.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {standings.length > 5 && (
          <div className="text-center mt-3">
            <span className="text-sm text-slate-400">
              +{standings.length - 5} más
            </span>
          </div>
        )}
      </div>
      
      {/* Quick Stats */}
      <StatsGrid columns={3} gap="md">
        <DataCard
          title="Circuitos Restantes"
          value={totalCircuits - currentCircuitIndex}
          icon={<span className="text-lg">🏁</span>}
          variant="info"
          size="sm"
        />
        <DataCard
          title="Líder Actual"
          value={standings[0]?.player.name || 'N/A'}
          subtitle={`${standings[0]?.score || 0} puntos`}
          icon={<TrophyIcon className="w-4 h-4" />}
          variant="highlight"
          size="sm"
        />
        <DataCard
          title="Brecha al Líder"
          value={standings[1] ? `${standings[0].score - standings[1].score} pts` : '0 pts'}
          icon={<span className="text-lg">📊</span>}
          variant="warning"
          size="sm"
        />
      </StatsGrid>
    </div>
  );
};

export default RaceProgress;