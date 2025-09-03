import React, { useMemo } from 'react';
import useSWR from 'swr';
import { Player, Circuit, GameHistoryEntry, GameState, PlayerStats } from '../types';
import { fetcher } from '../lib/fetcher';
import UserAvatar from './UserAvatar';
import { ScoreCalculator } from '../utils/ScoreCalculator';

interface HistoricalTimesViewProps {
  players: Player[];
  circuits: Circuit[];
  gameHistory: GameHistoryEntry[];
  activeGame?: { id: string; state: GameState } | null;
}

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

const formatTime = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined || ms === Infinity || !isFinite(ms)) return '-:--.---';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

// PodiumCards Component - Restored from ResultsView
const PodiumCards: React.FC<{ 
  gameState?: GameState; 
  players: Player[]; 
  isActive: boolean;
}> = ({ gameState, players, isActive }) => {
  // Get standings from current gameState
  const standings = useMemo(() => {
    if (!gameState?.playerStats) return [];
    
    return Object.entries(gameState.playerStats)
      .map(([playerId, stats]) => ({
        player: players.find(p => p.id === playerId)!,
        ...(stats as PlayerStats)
      }))
      .filter(s => s.player)
      .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  }, [gameState, players]);

  const [first, second, third] = standings;

  if (standings.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">🏁</div>
        <p className="text-zinc-400">Sin datos de campeonato</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 mb-6">
      {/* Championship Status Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          {isActive ? 'CAMPEONATO ACTIVO' : 'ÚLTIMO CAMPEONATO'}
        </h1>
        <div className="w-20 h-1 bg-f1-red mx-auto"></div>
      </div>

      {/* Podium Cards - Matching Hall of Fame style */}
      <div className="flex justify-center items-end gap-4 mb-8">
        {/* Second Place - Left */}
        {second && (
          <div 
            className="relative rounded-lg border-2 border-f1-red p-4 text-center bg-black"
            style={{ minHeight: '140px', width: '100px' }}
          >
            {/* Position Badge */}
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-zinc-300 rounded-full flex items-center justify-center z-10 border-2 border-black">
              <span className="font-mono font-bold text-sm text-black">2</span>
            </div>
            <div className="relative inline-block">
              <UserAvatar
                imageUrl={second.player.imageUrl}
                name={second.player.name}
                className="w-16 h-16 mx-auto mb-2 ring-2 ring-f1-red"
              />
            </div>
            <h3 className="text-white font-bold text-sm mb-1">{second.player.name}</h3>
            <div className="text-zinc-300 font-mono font-bold text-lg">{second.totalScore}</div>
            <div className="text-zinc-400 text-xs">PUNTOS</div>
          </div>
        )}

        {/* First Place - Center (Larger) */}
        {first && (
          <div 
            className="relative rounded-lg border-2 border-f1-red p-6 text-center bg-black"
            style={{ minHeight: '160px', width: '120px' }}
          >
            {/* Position Badge */}
            <div className="absolute -top-3 -right-3 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center z-10 border-2 border-black shadow-lg">
              <span className="font-mono font-bold text-base text-black">1</span>
            </div>
            <div className="relative inline-block">
              <UserAvatar
                imageUrl={first.player.imageUrl}
                name={first.player.name}
                className="w-20 h-20 mx-auto mb-3 ring-2 ring-f1-red"
              />
            </div>
            <h3 className="text-white font-bold text-base mb-2">{first.player.name}</h3>
            <div className="text-white font-mono font-bold text-xl">{first.totalScore}</div>
            <div className="text-zinc-400 text-xs">PUNTOS</div>
          </div>
        )}

        {/* Third Place - Right */}
        {third && (
          <div 
            className="relative rounded-lg border-2 border-f1-red p-4 text-center bg-black"
            style={{ minHeight: '140px', width: '100px' }}
          >
            {/* Position Badge */}
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center z-10 border-2 border-black">
              <span className="font-mono font-bold text-sm text-black">3</span>
            </div>
            <div className="relative inline-block">
              <UserAvatar
                imageUrl={third.player.imageUrl}
                name={third.player.name}
                className="w-16 h-16 mx-auto mb-2 ring-2 ring-f1-red"
              />
            </div>
            <h3 className="text-white font-bold text-sm mb-1">{third.player.name}</h3>
            <div className="text-zinc-300 font-mono font-bold text-lg">{third.totalScore}</div>
            <div className="text-zinc-400 text-xs">PUNTOS</div>
          </div>
        )}
      </div>
    </div>
  );
};

const HistoricalTimesView: React.FC<HistoricalTimesViewProps> = ({
  players,
  circuits,
  gameHistory,
  activeGame
}) => {
  // Fetch all lap times for current or latest game
  const gameId = activeGame?.id || (gameHistory?.[0]?.id);
  const { data: lapTimesData, error, isLoading } = useSWR<{
    success: boolean;
    data: LapTimeData[];
  }>(
    gameId ? `/api/lap-times/all?gameId=${gameId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 10000 // Update every 10 seconds
    }
  );

  // Process and organize lap times by circuit and turn
  const organizedData = useMemo(() => {
    if (!lapTimesData?.data) return {};

    const organized: Record<string, Record<number, LapTimeData[]>> = {};
    
    lapTimesData.data.forEach(lap => {
      const circuitName = lap.circuit?.name || circuits.find(c => c.id === lap.circuitId)?.name || 'Unknown';
      
      if (!organized[circuitName]) {
        organized[circuitName] = {};
      }
      
      if (!organized[circuitName][lap.turnNumber]) {
        organized[circuitName][lap.turnNumber] = [];
      }
      
      organized[circuitName][lap.turnNumber].push(lap);
    });

    // Sort lap times within each turn by lap number
    Object.keys(organized).forEach(circuit => {
      Object.keys(organized[circuit]).forEach(turn => {
        organized[circuit][parseInt(turn)].sort((a, b) => {
          if (a.playerId !== b.playerId) {
            return a.playerId.localeCompare(b.playerId);
          }
          return a.lapNumber - b.lapNumber;
        });
      });
    });

    return organized;
  }, [lapTimesData?.data, circuits]);

  const getPlayerName = (playerId: string) => {
    return players?.find(p => p.id === playerId)?.name || 'Unknown Player';
  };

  // New turn-based color system - Simple and clear
  const getTurnLapColor = (timeMs: number, turnData: LapTimeData[], playerId: string, circuit: Circuit) => {
    if (timeMs <= 0) return 'bg-zinc-800';

    // Get all valid times in this turn
    const turnTimes = turnData
      .filter(lap => lap.timeMs > 0)
      .map(lap => lap.timeMs);
    
    if (turnTimes.length === 0) return 'bg-zinc-800';

    // Find VR of this turn (fastest time in turn)
    const turnVR = Math.min(...turnTimes);
    
    // Get player's best time in this turn
    const playerTurnTimes = turnData
      .filter(lap => lap.playerId === playerId && lap.timeMs > 0)
      .map(lap => lap.timeMs);
    
    const playerTurnBest = playerTurnTimes.length > 0 ? Math.min(...playerTurnTimes) : null;

    // 🟣 Morado: ES récord histórico del circuito
    if (circuit.historicalBestLap && circuit.historicalBestLap > 0 && timeMs === circuit.historicalBestLap) {
      return 'bg-purple-600';
    }
    
    // 🟢 Verde: ES el VR del turno (más rápido de este turno)
    if (timeMs === turnVR) {
      return 'bg-green-600';
    }
    
    // 🟠 Naranja: ES el mejor personal del jugador en este turno (y no es VR del turno)
    if (playerTurnBest && timeMs === playerTurnBest && timeMs !== turnVR) {
      return 'bg-orange-600';
    }

    // ⚪ Gris: Tiempo normal
    return 'bg-zinc-800';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1A1A1A' }}>
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-white mb-2">Cargando histórico...</h2>
          <p className="text-zinc-400">Obteniendo datos de tiempos registrados</p>
        </div>
      </div>
    );
  }

  if (error || !lapTimesData?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1A1A1A' }}>
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Error al cargar datos</h2>
          <p className="text-zinc-400">No se pudieron obtener los tiempos históricos</p>
        </div>
      </div>
    );
  }

  const circuitNames = Object.keys(organizedData);

  if (circuitNames.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1A1A1A' }}>
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-white mb-2">Sin datos históricos</h2>
          <p className="text-zinc-400">No hay tiempos registrados para mostrar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: '#1A1A1A' }}>
      <div className="max-w-6xl mx-auto px-2 pt-4">
        
        {/* Podium Cards */}
        <PodiumCards 
          gameState={activeGame?.state} 
          players={players} 
          isActive={!!activeGame} 
        />

        {/* Excel-style Tables */}
        <div className="space-y-4">
          {circuitNames.map(circuitName => {
            const circuitData = organizedData[circuitName];
            const turns = Object.keys(circuitData).map(Number).sort((a, b) => a - b);

            return (
              <div key={circuitName} className="bg-zinc-800/50 rounded-lg p-3">
                <h2 className="text-lg font-bold text-white mb-3 text-center">
                  {circuitName.toUpperCase()}
                </h2>

                {/* Excel-style table for each turn */}
                {turns.map(turnNumber => {
                  const turnData = circuitData[turnNumber];
                  const playerGroups: Record<string, LapTimeData[]> = {};

                  // Group laps by player
                  turnData.forEach(lap => {
                    if (!playerGroups[lap.playerId]) {
                      playerGroups[lap.playerId] = [];
                    }
                    playerGroups[lap.playerId].push(lap);
                  });

                  const playerIds = Object.keys(playerGroups);
                  const maxLaps = Math.max(...Object.values(playerGroups).map(laps => laps.length));

                  return (
                    <div key={turnNumber} className="mb-4">
                      <h3 className="text-sm font-bold text-zinc-300 mb-2">T{turnNumber}</h3>
                      
                      {/* Excel-style table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-zinc-700">
                              <th className="text-left p-1 font-mono text-zinc-300 w-20">JUGADOR</th>
                              {Array.from({length: maxLaps}, (_, i) => (
                                <th key={i} className="text-center p-1 font-mono text-zinc-300 w-16">V{i+1}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {playerIds.map(playerId => {
                              const playerLaps = playerGroups[playerId].sort((a, b) => a.lapNumber - b.lapNumber);
                              return (
                                <tr key={playerId} className="border-b border-zinc-600">
                                  <td className="p-1 font-semibold text-white text-left">
                                    {getPlayerName(playerId).substring(0, 8)}
                                  </td>
                                  {Array.from({length: maxLaps}, (_, i) => {
                                    const lap = playerLaps[i];
                                    return (
                                      <td key={i} className="p-1">
                                        {lap ? (
                                          <div 
                                            className={`rounded px-1 py-0.5 text-center font-mono font-bold text-white text-xs ${getTurnLapColor(lap.timeMs, turnData, lap.playerId, circuits.find(c => c.id === lap.circuitId)!)}`}
                                          >
                                            {formatTime(lap.timeMs).replace(/^0:/, '').substring(0, 6)}
                                          </div>
                                        ) : (
                                          <div className="text-center text-zinc-600">-</div>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Results Cards Section - From RaceProgress */}
        {(activeGame?.state || gameHistory?.[0]?.state) && (
          <div className="space-y-6 mt-8">
            {(() => {
              // Get the appropriate game state
              const displayGameState = activeGame?.state || gameHistory?.[0]?.state;
              if (!displayGameState || !displayGameState.playerStats) return null;

              const calculator = new ScoreCalculator(displayGameState, players);
              const standings = calculator.getPlayerStandings();

              return (
                <>
                  {/* Card 1: Puntuación Actual (Current Score) */}
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-md">
                    <h3 className="text-lg font-bold text-zinc-100 mb-3">Puntuación Actual</h3>
                    <div className="space-y-2">
                      {standings.map((standing, index) => (
                        <div key={standing.player.id} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm w-6 ${
                              index === 0 ? 'text-yellow-400' :
                              index === 1 ? 'text-zinc-300' :
                              index === 2 ? 'text-amber-600' :
                              'text-zinc-400'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="text-zinc-100 font-semibold">{standing.player.name}</span>
                          </div>
                          <span className="font-bold text-zinc-100 font-mono">{standing.score} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 2: Resultados (Results Table) */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden">
                    <div className="p-4 border-b border-zinc-800">
                      <h3 className="text-xl font-bold text-zinc-100">Resultados</h3>
                    </div>
                    
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm font-mono">
                        <thead className="bg-zinc-800">
                          <tr className="text-left">
                            <th className="px-3 py-2 text-zinc-400 font-semibold text-xs uppercase tracking-wide">POS</th>
                            <th className="px-3 py-2 text-zinc-400 font-semibold text-xs uppercase tracking-wide">JUGADOR</th>
                            <th className="px-3 py-2 text-zinc-400 font-semibold text-xs uppercase tracking-wide text-center">PTS</th>
                            <th className="px-3 py-2 text-zinc-400 font-semibold text-xs uppercase tracking-wide text-center">VR</th>
                            <th className="px-3 py-2 text-zinc-400 font-semibold text-xs uppercase tracking-wide text-center">PR</th>
                            <th className="px-3 py-2 text-zinc-400 font-semibold text-xs uppercase tracking-wide text-center">1º</th>
                            <th className="px-3 py-2 text-zinc-400 font-semibold text-xs uppercase tracking-wide text-center">2º</th>
                            <th className="px-3 py-2 text-zinc-400 font-semibold text-xs uppercase tracking-wide text-center">3º</th>
                          </tr>
                        </thead>
                        <tbody>
                          {standings.map((standing, index) => (
                            <tr key={standing.player.id} className="border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                              <td className="px-3 py-2">
                                <span className={`font-bold ${
                                  index === 0 ? 'text-yellow-400' :
                                  index === 1 ? 'text-zinc-300' :
                                  index === 2 ? 'text-amber-600' :
                                  'text-zinc-400'
                                }`}>
                                  {index + 1}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <span className="font-semibold text-zinc-100">{standing.player.name}</span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="font-bold text-zinc-100">{standing.score}</span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="text-zinc-100 font-bold">{standing.bestLaps}</span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="text-zinc-100 font-bold">{standing.bestAverages}</span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="text-yellow-400 font-bold">{standing.firsts}</span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="text-zinc-300 font-bold">{standing.seconds}</span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="text-amber-600 font-bold">{standing.thirds}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Table */}
                    <div className="md:hidden">
                      {/* Mobile Header */}
                      <div className="grid grid-cols-9 gap-1 px-3 py-2 bg-zinc-800 text-xs font-mono uppercase tracking-wide border-b border-zinc-800">
                        <div className="text-zinc-400">POS</div>
                        <div className="text-zinc-400 col-span-3">JUGADOR</div>
                        <div className="text-zinc-400 text-center">VR</div>
                        <div className="text-zinc-400 text-center">PR</div>
                        <div className="text-zinc-400 text-center">1º</div>
                        <div className="text-zinc-400 text-center">2º</div>
                        <div className="text-zinc-400 text-center">3º</div>
                      </div>
                      
                      {/* Mobile Data Rows */}
                      {standings.map((standing, index) => (
                        <div key={standing.player.id} className="grid grid-cols-9 gap-1 px-3 py-2 border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors text-sm font-mono">
                          <div className={`font-bold ${
                            index === 0 ? 'text-yellow-400' :
                            index === 1 ? 'text-zinc-300' :
                            index === 2 ? 'text-amber-600' :
                            'text-zinc-400'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="text-zinc-100 font-semibold col-span-3 truncate">{standing.player.name}</div>
                          <div className="text-zinc-100 font-bold text-center">{standing.bestLaps}</div>
                          <div className="text-zinc-100 font-bold text-center">{standing.bestAverages}</div>
                          <div className="text-yellow-400 font-bold text-center">{standing.firsts}</div>
                          <div className="text-zinc-300 font-bold text-center">{standing.seconds}</div>
                          <div className="text-amber-600 font-bold text-center">{standing.thirds}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 3: Points Breakdown by Circuit */}
                  <div className="space-y-6">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
                      <h3 className="text-xl font-bold text-zinc-100 mb-2">Puntos por Circuito</h3>
                      <p className="text-zinc-400 text-sm">Desglose detallado de puntos obtenidos en cada circuito</p>
                    </div>
                    
                    {calculator.getCircuitBreakdown().map((circuit, circuitIndex) => {
                      if (!circuit) return null;
                      return (
                        <div key={circuitIndex} className="bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden">
                          <div className="px-4 py-3 border-b border-zinc-700 bg-zinc-800">
                            <h4 className="text-lg font-bold text-zinc-100 font-mono uppercase tracking-wide">
                              {circuit.name}
                            </h4>
                          </div>

                          {/* Desktop Circuit Table */}
                          <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm font-mono">
                              <thead className="bg-zinc-800">
                                <tr className="text-left">
                                  <th className="px-3 py-2 text-zinc-400 font-semibold text-xs uppercase tracking-wide">POS</th>
                                  <th className="px-3 py-2 text-zinc-400 font-semibold text-xs uppercase tracking-wide">JUGADOR</th>
                                  <th className="px-3 py-2 text-zinc-400 font-semibold text-xs uppercase tracking-wide text-center">TOTAL</th>
                                  <th className="px-3 py-2 text-zinc-400 font-semibold text-xs uppercase tracking-wide text-center">BASE</th>
                                  <th className="px-3 py-2 text-zinc-400 font-semibold text-xs uppercase tracking-wide text-center">BONUS</th>
                                  {Array.from({ length: displayGameState.settings?.turnsPerCircuit || 3 }, (_, i) => (
                                    <th key={i} className="px-3 py-2 text-zinc-400 font-semibold text-xs uppercase tracking-wide text-center">
                                      T{i + 1}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {circuit.players.map((playerData, index) => (
                                  <tr key={playerData.player.id} className="border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                                    <td className="px-3 py-2">
                                      <span className={`font-bold ${
                                        index === 0 ? 'text-yellow-400' :
                                        index === 1 ? 'text-zinc-300' :
                                        index === 2 ? 'text-amber-600' :
                                        'text-zinc-400'
                                      }`}>
                                        {index + 1}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className="font-semibold text-zinc-100">{playerData.player.name}</span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <span className="font-bold text-zinc-100">{playerData.totalPoints}</span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <span className="text-zinc-300">{playerData.basePoints}</span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <span className="text-amber-400">{playerData.bonusPoints}</span>
                                    </td>
                                    {playerData.turns.map((turnData, turnIndex) => (
                                      <td key={turnIndex} className="px-3 py-2 text-center">
                                        <span 
                                          className="text-zinc-300 cursor-help text-xs"
                                          title={`Posición: ${turnData.position}° | Base: ${turnData.basePoints}pts | Bonus: ${turnData.bonusPoints}pts`}
                                        >
                                          {turnData.totalPoints}
                                          {turnData.bonusPoints > 0 && (
                                            <span className="text-amber-400">+{turnData.bonusPoints}</span>
                                          )}
                                        </span>
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile Circuit Table - Grid System like Results */}
                          <div className="md:hidden overflow-x-auto">
                            <div className="min-w-fit">
                              {/* Mobile Header - Dynamic columns based on turns */}
                              <div className={`grid gap-1 px-3 py-2 bg-zinc-800 text-xs font-mono uppercase tracking-wide border-b border-zinc-800`}
                                   style={{ gridTemplateColumns: `40px 100px 50px 50px 60px repeat(${displayGameState.settings?.turnsPerCircuit || 3}, 40px)` }}>
                                <div className="text-zinc-400">POS</div>
                                <div className="text-zinc-400">JUGADOR</div>
                                <div className="text-zinc-400 text-center">TOTAL</div>
                                <div className="text-zinc-400 text-center">BASE</div>
                                <div className="text-zinc-400 text-center">BONUS</div>
                                {Array.from({ length: displayGameState.settings?.turnsPerCircuit || 3 }, (_, i) => (
                                  <div key={i} className="text-zinc-400 text-center">T{i + 1}</div>
                                ))}
                              </div>
                              
                              {/* Mobile Data Rows */}
                              {circuit.players.map((playerData, index) => (
                                <div key={playerData.player.id} 
                                     className={`grid gap-1 px-3 py-2 border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors text-sm font-mono`}
                                     style={{ gridTemplateColumns: `40px 100px 50px 50px 60px repeat(${displayGameState.settings?.turnsPerCircuit || 3}, 40px)` }}>
                                  <div className={`font-bold ${
                                    index === 0 ? 'text-yellow-400' :
                                    index === 1 ? 'text-zinc-300' :
                                    index === 2 ? 'text-amber-600' :
                                    'text-zinc-400'
                                  }`}>
                                    {index + 1}
                                  </div>
                                  <div className="text-zinc-100 font-semibold truncate">{playerData.player.name}</div>
                                  <div className="text-zinc-100 font-bold text-center">{playerData.totalPoints}</div>
                                  <div className="text-zinc-300 font-bold text-center">{playerData.basePoints}</div>
                                  <div className="text-amber-400 font-bold text-center">{playerData.bonusPoints}</div>
                                  {playerData.turns.map((turnData, turnIndex) => (
                                    <div key={turnIndex} className="text-center">
                                      <div className="text-zinc-100 font-bold">{turnData.totalPoints}</div>
                                      <div className="text-xs text-zinc-500">{turnData.position}°</div>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoricalTimesView;