import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { TrophyIcon, UserGroupIcon, ClockIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';

interface PlayerStats {
  id: string;
  name: string;
  imageUrl: string;
  totalWins: number;
  fastestLaps: number;
  bestAverages: number;
  totalGames: number;
}

interface CircuitRecord {
  circuitId: string;
  circuitName: string;
  circuitImage: string;
  bestLap: number | null;
  bestLapHolder: string | null;
  bestAverage: number | null;
  bestAverageHolder: string | null;
  bestLapDate: Date | null;
  bestAverageDate: Date | null;
}

interface PublicStats {
  totalPlayers: number;
  totalGames: number;
  totalRaces: number;
  leaderboard: PlayerStats[];
  circuitRecords: CircuitRecord[];
  recentChampions: Array<{
    gameId: string;
    winner: string;
    winnerImage: string;
    completedAt: Date;
    circuitsCount: number;
  }>;
}

interface LandingPageProps {
  onRoleSelect: (role: 'organizer' | 'player') => void;
}

const formatTime = (ms: number | null): string => {
  if (ms === null || ms === undefined || ms === Infinity || !isFinite(ms)) return '-:--.---';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const fetcher = (url: string) => fetch(url).then(res => res.json());

const LandingPage: React.FC<LandingPageProps> = ({ onRoleSelect }) => {
  const { data: stats, error } = useSWR<PublicStats>('/api/public/stats', fetcher);
  const [selectedRole, setSelectedRole] = useState<'organizer' | 'player' | null>(null);

  const handleRoleSelect = (role: 'organizer' | 'player') => {
    setSelectedRole(role);
    setTimeout(() => onRoleSelect(role), 100); // Small delay for visual feedback
  };

  const isLoading = !stats && !error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[#FF1801]/5"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-20">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <img 
                src="/F1-logo.png" 
                alt="F1 Logo" 
                className="h-16 sm:h-24 object-contain"
              />
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-8">
              <span className="text-[#FF1801]">F1</span> Night
            </h1>

            {/* Role Selection Buttons */}
            <div className="flex flex-col gap-4 max-w-sm mx-auto mb-12">
              <button
                onClick={() => handleRoleSelect('organizer')}
                disabled={selectedRole === 'organizer'}
                className={`group relative overflow-hidden w-full px-6 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                  selectedRole === 'organizer'
                    ? 'bg-[#FF1801] text-white transform scale-105'
                    : 'bg-slate-700 hover:bg-[#FF1801] text-white hover:shadow-xl hover:shadow-[#FF1801]/25 hover:scale-105'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#FF1801]/0 via-[#FF1801]/20 to-[#FF1801]/0 group-hover:via-[#FF1801]/30 transition-all duration-500"></div>
                <div className="relative flex items-center justify-center gap-3">
                  <TrophyIcon className="w-6 h-6" />
                  Ingresar como Organizador
                </div>
              </button>

              <button
                onClick={() => handleRoleSelect('player')}
                disabled={selectedRole === 'player'}
                className={`group relative overflow-hidden w-full px-6 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                  selectedRole === 'player'
                    ? 'bg-[#FF1801] text-white transform scale-105'
                    : 'bg-slate-700 hover:bg-[#FF1801] text-white hover:shadow-xl hover:shadow-[#FF1801]/25 hover:scale-105'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#FF1801]/0 via-[#FF1801]/20 to-[#FF1801]/0 group-hover:via-[#FF1801]/30 transition-all duration-500"></div>
                <div className="relative flex items-center justify-center gap-3">
                  <UserGroupIcon className="w-6 h-6" />
                  Ingresar como Jugador
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      {isLoading ? (
        <div className="px-4 py-8">
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <span className="mt-4 text-slate-400 text-center">Cargando estadísticas...</span>
          </div>
        </div>
      ) : error ? (
        <div className="px-4 py-8">
          <div className="text-center text-slate-400 py-12">
            <p>Conectando con la base de datos...</p>
            <p className="text-sm mt-2">Las estadísticas aparecerán cuando haya datos disponibles</p>
          </div>
        </div>
      ) : stats && (
        <div className="px-4 py-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 gap-4 mb-8 max-w-md mx-auto sm:max-w-none sm:grid-cols-3 sm:gap-6">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-[#FF1801] mb-1 sm:mb-2">{stats.totalPlayers}</div>
              <div className="text-sm sm:text-base text-slate-300">Pilotos Registrados</div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-[#FF1801] mb-1 sm:mb-2">{stats.totalGames}</div>
              <div className="text-sm sm:text-base text-slate-300">Campeonatos Completados</div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-[#FF1801] mb-1 sm:mb-2">
                {stats.circuitRecords.length}
              </div>
              <div className="text-sm sm:text-base text-slate-300">Circuitos Disponibles</div>
            </div>
          </div>

          <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0">
            {/* Hall of Fame */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 sm:p-6">
              <h2 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
                <TrophyIcon className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                Hall of Fame
              </h2>
              
              {stats.leaderboard.length > 0 ? (
                <div className="space-y-3">
                  {stats.leaderboard.slice(0, 5).map((player, index) => (
                    <div key={player.id} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm ${
                        index === 0 ? 'bg-yellow-400 text-black' :
                        index === 1 ? 'bg-gray-300 text-black' :
                        index === 2 ? 'bg-orange-400 text-black' :
                        'bg-slate-600 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <img 
                        src={player.imageUrl} 
                        alt={player.name}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-sm sm:text-base truncate">{player.name}</div>
                        <div className="text-xs sm:text-sm text-slate-400">
                          {player.totalWins} victorias • {player.fastestLaps} mejores vueltas
                        </div>
                      </div>
                      {player.totalGames > 0 && (
                        <div className="text-xs sm:text-sm text-slate-300 text-right">
                          {Math.round((player.totalWins / player.totalGames) * 100)}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-400 py-6 sm:py-8">
                  <p className="text-sm sm:text-base">¡Sé el primero en competir y aparecer en el Hall of Fame!</p>
                </div>
              )}
            </div>

            {/* Recent Champions */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 sm:p-6">
              <h2 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
                <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                Últimos Campeones
              </h2>
              
              {stats.recentChampions.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentChampions.map((champion, index) => (
                    <div key={`${champion.gameId}-${index}`} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                      <img 
                        src={champion.winnerImage} 
                        alt={champion.winner}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-sm sm:text-base truncate">{champion.winner}</div>
                        <div className="text-xs sm:text-sm text-slate-400">
                          {champion.circuitsCount} circuitos • {formatDate(champion.completedAt)}
                        </div>
                      </div>
                      <TrophyIcon className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-400 py-6 sm:py-8">
                  <p className="text-sm sm:text-base">¡Organiza el primer campeonato y crea historia!</p>
                </div>
              )}
            </div>
          </div>

          {/* Circuit Records Preview */}
          {stats.circuitRecords.some(c => c.bestLap !== null || c.bestAverage !== null) && (
            <div className="mt-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 sm:p-6">
              <h2 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6">Récords de Circuitos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {stats.circuitRecords
                  .filter(record => record.bestLap !== null || record.bestAverage !== null)
                  .slice(0, 6)
                  .map(record => (
                    <div key={record.circuitId} className="bg-slate-700/30 rounded-lg p-3 sm:p-4">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <img 
                          src={record.circuitImage} 
                          alt={record.circuitName}
                          className="w-6 h-6 sm:w-8 sm:h-8 rounded object-cover"
                        />
                        <h3 className="font-semibold text-white text-xs sm:text-sm truncate">{record.circuitName}</h3>
                      </div>
                      {record.bestLap !== null && (
                        <div className="text-xs text-slate-300 mb-1">
                          <span className="text-purple-400">Mejor Vuelta:</span> {formatTime(record.bestLap)}
                          {record.bestLapHolder && <span className="text-slate-400 block sm:inline"> - {record.bestLapHolder}</span>}
                        </div>
                      )}
                      {record.bestAverage !== null && (
                        <div className="text-xs text-slate-300">
                          <span className="text-green-400">Mejor Promedio:</span> {formatTime(record.bestAverage)}
                          {record.bestAverageHolder && <span className="text-slate-400 block sm:inline"> - {record.bestAverageHolder}</span>}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-slate-700 mt-8 sm:mt-12">
        <div className="px-4 py-6 sm:py-8">
          <div className="text-center text-slate-400">
            <p className="text-sm sm:text-base">F1 Night - La experiencia definitiva de carreras entre amigos</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;