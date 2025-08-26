import React, { useState, useCallback } from 'react';
import useSWR from 'swr';

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
  const [selectedGameId, setSelectedGameId] = useState<string>(currentGameId || 'all');
  const [selectedCircuit, setSelectedCircuit] = useState<string>('all');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('all');

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (selectedGameId !== 'all') {
    queryParams.append('gameId', selectedGameId);
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
  
  // Filter processed lap times based on selected filters
  const filteredLapTimes = React.useMemo(() => {
    let filtered = processedLapTimes;
    
    if (selectedCircuit !== 'all') {
      filtered = filtered.filter(lap => lap.circuitId === selectedCircuit);
    }
    
    if (selectedPlayer !== 'all') {
      filtered = filtered.filter(lap => lap.playerId === selectedPlayer);
    }
    
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [processedLapTimes, selectedCircuit, selectedPlayer]);

  // Get player and circuit names
  const getPlayerName = useCallback((playerId: string) => {
    return players?.find(p => p.id === playerId)?.name || 'Unknown Player';
  }, [players]);

  const getCircuitName = useCallback((circuitId: string) => {
    return circuits?.find(c => c.id === circuitId)?.name || 'Unknown Circuit';
  }, [circuits]);

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
    <div className="min-h-screen bg-f1-black p-4 pb-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-f1-red mb-2">Tiempos Detallados</h1>
          <p className="text-zinc-400">Historial completo de vueltas por jugador y circuito</p>
        </div>
        
        <div className="space-y-4">
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-zinc-800 rounded-md">
          <div>
            <label className="block mb-2 text-xs font-mono uppercase tracking-wide text-zinc-400">FILTRAR POR JUEGO</label>
            <select 
              value={selectedGameId} 
              onChange={(e) => setSelectedGameId(e.target.value)}
              className="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-3 text-zinc-100 font-bold text-lg"
            >
              <option value="all">Todos los Juegos</option>
              {currentGameId && (
                <option value={currentGameId}>Juego Actual</option>
              )}
            </select>
          </div>

          <div>
            <label className="block mb-2 text-xs font-mono uppercase tracking-wide text-zinc-400">FILTRAR POR CIRCUITO</label>
            <select 
              value={selectedCircuit} 
              onChange={(e) => setSelectedCircuit(e.target.value)}
              className="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-3 text-zinc-100 font-bold text-lg"
            >
              <option value="all">Todos los Circuitos</option>
              {circuits?.map(circuit => (
                <option key={circuit.id} value={circuit.id}>
                  {circuit.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 text-xs font-mono uppercase tracking-wide text-zinc-400">FILTRAR POR JUGADOR</label>
            <select 
              value={selectedPlayer} 
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-3 text-zinc-100 font-bold text-lg"
            >
              <option value="all">Todos los Jugadores</option>
              {players?.map(player => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-md">
            <div className="text-center">
              <div className="luxury-label">TOTAL VUELTAS</div>
              <div className="luxury-data text-lg">{statistics.totalLaps}</div>
            </div>
            <div className="text-center">
              <div className="luxury-label">VUELTA MÁS RÁPIDA</div>
              <div className="luxury-data text-lg text-luxury-first">{formatTimeMs(statistics.fastestLap)}</div>
              {statistics.fastestLapPlayer && (
                <div className="text-xs text-zinc-400 mt-1">
                  {statistics.fastestLapPlayer}
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="luxury-label">VUELTA MÁS LENTA</div>
              <div className="luxury-data text-lg">{formatTimeMs(statistics.slowestLap)}</div>
            </div>
            <div className="text-center">
              <div className="luxury-label">PROMEDIO</div>
              <div className="luxury-data text-lg">{formatTimeMs(Math.round(statistics.averageTime))}</div>
            </div>
            <div className="text-center">
              <div className="luxury-label">CIRCUITO RÉCORD</div>
              <div className="luxury-data text-sm">
                {statistics.fastestLapCircuit || 'N/A'}
              </div>
            </div>
          </div>
        )}

        {/* Loading and Error States */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="text-zinc-400">Cargando tiempos...</div>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <div className="text-red-400">Error al cargar los tiempos</div>
          </div>
        )}

        {/* Lap Times Table */}
        {!isLoading && !error && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden max-h-[60vh] sm:max-h-[65vh] lg:max-h-[70vh]">
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh] sm:max-h-[65vh] lg:max-h-[70vh]">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-zinc-800 text-zinc-200 text-sm uppercase tracking-wider border-b border-zinc-700">
                    <th className="px-4 py-3 text-left font-mono font-bold">JUGADOR</th>
                    <th className="px-4 py-3 text-left font-mono font-bold">CIRCUITO</th>
                    <th className="px-4 py-3 text-center font-mono font-bold">TURNO</th>
                    <th className="px-4 py-3 text-center font-mono font-bold">VUELTA</th>
                    <th className="px-4 py-3 text-center font-mono font-bold">TIEMPO</th>
                    <th className="px-4 py-3 text-center font-mono font-bold">PROM TURNO</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLapTimes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-zinc-400 text-lg">
                        No hay tiempos que coincidan con los filtros seleccionados
                      </td>
                    </tr>
                  ) : (
                    filteredLapTimes.map((lap, index) => (
                      <tr 
                        key={lap.id} 
                        className={`${index % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-950'} hover:bg-zinc-800/50 transition-colors border-b border-zinc-800`}
                      >
                        <td className="px-4 py-3 text-zinc-100 font-bold text-lg">
                          {getPlayerName(lap.playerId)}
                        </td>
                        <td className="px-4 py-3 text-zinc-300 font-semibold text-base">
                          {lap.circuit?.name || getCircuitName(lap.circuitId)}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-lg text-zinc-100">
                          {lap.turnNumber}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-lg text-zinc-100">
                          {lap.lapNumber}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-lg text-amber-400">
                          {formatTimeMs(lap.timeMs)}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-base text-zinc-300">
                          {lap.turnAverage ? formatTimeMs(Math.round(lap.turnAverage)) : '-:--.---'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Results Summary */}
        {!isLoading && !error && filteredLapTimes.length > 0 && (
          <div className="text-center text-zinc-400 text-sm space-y-1">
            <div>Mostrando {filteredLapTimes.length} tiempos de vuelta</div>
            {filteredLapTimes.length > 10 && (
              <div className="text-zinc-500 text-xs">Desplázate en la tabla para ver todos los registros</div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}