import React, { useState, useCallback, useMemo } from 'react';
import useSWR from 'swr';
// Simple icon components (F1 Professional style)
const MagnifyingGlassIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
  </svg>
);

const FunnelIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M14,12V19.88C14.04,20.18 13.94,20.5 13.71,20.71C13.32,21.1 12.69,21.1 12.3,20.71L10.29,18.7C10.06,18.47 9.96,18.16 10,17.87V12H9.97L4.21,4.62C3.87,4.19 3.95,3.56 4.38,3.22C4.57,3.08 4.78,3 5,3V3H19V3C19.22,3 19.43,3.08 19.62,3.22C20.05,3.56 20.13,4.19 19.79,4.62L14.03,12H14Z" />
  </svg>
);

const ChartBarIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22,21H2V3H4V19H6V10H10V19H12V6H16V19H18V14H22V21Z" />
  </svg>
);

// Time formatting utility
const formatTimeMs = (ms: number | null | undefined): string => {
    if (ms === null || ms === undefined || ms === Infinity || !isFinite(ms)) return '-:--.---';
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = ms % 1000;
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

// Date formatting utility
const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
};

interface LapTimeData {
  id: string;
  playerId: string;
  circuitId: string;
  turnNumber: number;
  lapNumber: number;
  timeMs: number;
  gameId: string;
  createdAt: string;
  circuit: {
    name: string;
  };
}

interface TimesPageProps {
  players: any[];
  circuits: any[];
  currentGameId?: string;
}

export default function TimesPage({ players, circuits, currentGameId }: TimesPageProps) {
  // Modern state management
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState({
    gameId: currentGameId || 'all',
    circuitId: 'all',
    playerId: 'all'
  });
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (activeFilters.gameId !== 'all') {
    queryParams.append('gameId', activeFilters.gameId);
  }

  const { data: lapTimesData, error, isLoading } = useSWR<{
    success: boolean;
    data: LapTimeData[];
  }>(`/api/lap-times/all?${queryParams.toString()}`);

  // Process lap times with turn averages
  const processedLapTimes = React.useMemo(() => {
    if (!lapTimesData?.data) return [];
    
    // Group lap times by player, circuit, and turn to calculate averages
    const turnGroups = new Map<string, LapTimeData[]>();
    
    lapTimesData.data.forEach(lap => {
      const key = `${lap.playerId}-${lap.circuitId}-${lap.turnNumber}`;
      if (!turnGroups.has(key)) {
        turnGroups.set(key, []);
      }
      turnGroups.get(key)!.push(lap);
    });
    
    // Calculate turn averages
    const turnAverages = new Map<string, number>();
    turnGroups.forEach((laps, key) => {
      const validTimes = laps.filter(lap => lap.timeMs > 0).map(lap => lap.timeMs);
      if (validTimes.length >= 3) {
        const average = validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length;
        turnAverages.set(key, average);
      }
    });
    
    // Enrich lap times with turn averages
    return lapTimesData.data.map(lap => {
      const turnKey = `${lap.playerId}-${lap.circuitId}-${lap.turnNumber}`;
      return {
        ...lap,
        turnAverage: turnAverages.get(turnKey) || null
      };
    });
  }, [lapTimesData?.data]);
  
  // Get player and circuit names (declared before filteredLapTimes)
  const getPlayerName = useCallback((playerId: string) => {
    return players?.find(p => p.id === playerId)?.name || 'Unknown Player';
  }, [players]);

  const getCircuitName = useCallback((circuitId: string) => {
    return circuits?.find(c => c.id === circuitId)?.name || 'Unknown Circuit';
  }, [circuits]);

  // Modern search and filter system
  const filteredLapTimes = useMemo(() => {
    let filtered = processedLapTimes;
    
    // Apply search query first
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lap => {
        const playerName = getPlayerName(lap.playerId).toLowerCase();
        const circuitName = (lap.circuit?.name || getCircuitName(lap.circuitId)).toLowerCase();
        return playerName.includes(query) || 
               circuitName.includes(query) || 
               lap.turnNumber.toString().includes(query);
      });
    }
    
    // Apply active filters
    if (activeFilters.circuitId !== 'all') {
      filtered = filtered.filter(lap => lap.circuitId === activeFilters.circuitId);
    }
    
    if (activeFilters.playerId !== 'all') {
      filtered = filtered.filter(lap => lap.playerId === activeFilters.playerId);
    }
    
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [processedLapTimes, searchQuery, activeFilters, getPlayerName, getCircuitName]);

  // Calculate statistics
  const statistics = React.useMemo(() => {
    if (filteredLapTimes.length === 0) return null;

    const times = filteredLapTimes.map(lap => lap.timeMs);
    const fastestLap = Math.min(...times);
    const slowestLap = Math.max(...times);
    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;

    const fastestLapData = filteredLapTimes.find(lap => lap.timeMs === fastestLap);

    return {
      totalLaps: filteredLapTimes.length,
      fastestLap,
      slowestLap,
      averageTime,
      fastestLapPlayer: fastestLapData ? getPlayerName(fastestLapData.playerId) : null,
      fastestLapCircuit: fastestLapData ? getCircuitName(fastestLapData.circuitId) : null
    };
  }, [filteredLapTimes, getPlayerName, getCircuitName]);

  return (
    <div className="h-screen overflow-y-auto" style={{ backgroundColor: '#1A1A1A' }}>
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-32">
        
        {/* Modern Header */}
        <div className="flex flex-col space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">REGISTRO DE TIEMPOS</h1>
              <p className="text-sm text-zinc-400">Análisis detallado de vueltas y promedios por turno</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-md text-zinc-400 transition-colors"
              >
                <ChartBarIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Compact Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by player, circuit, or turn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-base text-white placeholder-zinc-500 focus:border-red-600 focus:outline-none transition-colors"
              />
            </div>
            
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 min-w-[120px] justify-center ${
                showFilters 
                  ? 'bg-red-600 text-white' 
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
              }`}
            >
              <FunnelIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Filtros</span>
              {Object.values(activeFilters).filter(v => v !== 'all').length > 0 && (
                <span className="bg-yellow-400 text-black text-xs px-2 py-0.5 rounded-full font-bold">
                  {Object.values(activeFilters).filter(v => v !== 'all').length}
                </span>
              )}
            </button>
          </div>

          {/* Collapsible Advanced Filters */}
          {showFilters && (
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">Game</label>
                  <select 
                    value={activeFilters.gameId} 
                    onChange={(e) => setActiveFilters({...activeFilters, gameId: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:border-red-600 focus:outline-none"
                  >
                    <option value="all">All Games</option>
                    {currentGameId && <option value={currentGameId}>Current Game</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">Circuit</label>
                  <select 
                    value={activeFilters.circuitId} 
                    onChange={(e) => setActiveFilters({...activeFilters, circuitId: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:border-red-600 focus:outline-none"
                  >
                    <option value="all">All Circuits</option>
                    {circuits?.map(circuit => (
                      <option key={circuit.id} value={circuit.id}>
                        {circuit.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">Player</label>
                  <select 
                    value={activeFilters.playerId} 
                    onChange={(e) => setActiveFilters({...activeFilters, playerId: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:border-red-600 focus:outline-none"
                  >
                    <option value="all">All Players</option>
                    {players?.map(player => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {Object.values(activeFilters).some(v => v !== 'all') && (
                <div className="mt-3 pt-3 border-t border-zinc-700">
                  <button
                    onClick={() => setActiveFilters({ gameId: 'all', circuitId: 'all', playerId: 'all' })}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>


        {/* Loading State with Skeleton */}
        {isLoading && (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-zinc-800/50 rounded-lg p-4 animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-zinc-700 rounded-md"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-700 rounded w-1/4"></div>
                    <div className="h-3 bg-zinc-600 rounded w-1/2"></div>
                  </div>
                  <div className="h-8 w-20 bg-zinc-700 rounded-md"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-zinc-800/50 border border-red-600 rounded-lg p-6 text-center">
            <div className="text-red-400 text-base font-medium mb-2">Unable to load lap times</div>
            <div className="text-zinc-400 text-sm">Please check your connection and try again</div>
          </div>
        )}

        {/* Modern Data Display */}
        {!isLoading && !error && (
          <>
            {/* Quick Stats Bar */}
            {statistics && filteredLapTimes.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                  <div className="text-xs font-medium text-zinc-400 mb-1">FASTEST LAP</div>
                  <div className="text-base font-bold text-amber-400 font-mono">{formatTimeMs(statistics.fastestLap)}</div>
                  <div className="text-xs text-zinc-500">{statistics.fastestLapPlayer}</div>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                  <div className="text-xs font-medium text-zinc-400 mb-1">AVERAGE</div>
                  <div className="text-base font-bold text-white font-mono">{formatTimeMs(Math.round(statistics.averageTime))}</div>
                  <div className="text-xs text-zinc-500">{statistics.totalLaps} laps recorded</div>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                  <div className="text-xs font-medium text-zinc-400 mb-1">RESULTS</div>
                  <div className="text-base font-bold text-white">{filteredLapTimes.length}</div>
                  <div className="text-xs text-zinc-500">matching entries</div>
                </div>
              </div>
            )}

            {/* Card View (Mobile-First, No Horizontal Scroll) */}
            {viewMode === 'cards' && (
              <div className="space-y-3">
                {filteredLapTimes.length === 0 ? (
                  <div className="bg-zinc-800/50 rounded-lg p-8 text-center border border-zinc-700">
                    <div className="text-base text-zinc-300 mb-2">No lap times found</div>
                    <div className="text-sm text-zinc-500">Try adjusting your search or filters</div>
                  </div>
                ) : (
                  filteredLapTimes.map((lap) => (
                    <div key={lap.id} className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 hover:border-zinc-500 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="text-base font-bold text-white truncate">
                              {getPlayerName(lap.playerId)}
                            </div>
                            <div className="text-xs bg-zinc-700 text-zinc-300 px-2 py-1 rounded-sm font-mono">
                              T{lap.turnNumber}
                            </div>
                            <div className="text-xs bg-zinc-600 text-zinc-400 px-2 py-1 rounded-sm font-mono">
                              L{lap.lapNumber}
                            </div>
                          </div>
                          <div className="text-sm text-zinc-300 mb-1">
                            {lap.circuit?.name || getCircuitName(lap.circuitId)}
                          </div>
                          {lap.turnAverage && (
                            <div className="text-xs text-zinc-500 font-mono">
                              Turn avg: {formatTimeMs(Math.round(lap.turnAverage))}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-amber-400 font-mono">
                            {formatTimeMs(lap.timeMs)}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {formatDateTime(lap.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Compact Table View (Desktop) */}
            {viewMode === 'table' && (
              <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 overflow-hidden">
                <div className="overflow-x-auto max-h-[70vh]">
                  <table className="w-full">
                    <thead className="bg-zinc-900 sticky top-0 z-10">
                      <tr className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        <th className="px-4 py-3 text-left">Player</th>
                        <th className="px-4 py-3 text-left">Circuit</th>
                        <th className="px-4 py-3 text-center">Turn</th>
                        <th className="px-4 py-3 text-center">Lap</th>
                        <th className="px-4 py-3 text-center">Time</th>
                        <th className="px-4 py-3 text-center">Turn Avg</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-700">
                      {filteredLapTimes.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-zinc-300">
                            No lap times found matching your criteria
                          </td>
                        </tr>
                      ) : (
                        filteredLapTimes.map((lap) => (
                          <tr key={lap.id} className="hover:bg-zinc-700/30 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-white">
                              {getPlayerName(lap.playerId)}
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-300">
                              {lap.circuit?.name || getCircuitName(lap.circuitId)}
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-mono text-zinc-500">
                              {lap.turnNumber}
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-mono text-zinc-500">
                              {lap.lapNumber}
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-mono font-bold text-amber-400">
                              {formatTimeMs(lap.timeMs)}
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-mono text-zinc-300">
                              {lap.turnAverage ? formatTimeMs(Math.round(lap.turnAverage)) : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Modern Footer Info */}
        {!isLoading && !error && filteredLapTimes.length > 0 && (
          <div className="mt-8 text-center">
            <div className="text-sm text-zinc-300">
              Displaying <span className="font-bold text-white">{filteredLapTimes.length}</span> lap times
            </div>
            {searchQuery && (
              <div className="text-xs text-zinc-500 mt-1">
                Search results for "<span className="font-medium">{searchQuery}</span>"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}