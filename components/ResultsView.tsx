import React, { useState, useMemo } from 'react';
import { GameState, NightlyResult, Player, PlayerStats, Circuit, GameHistoryEntry } from '../types';
import NavigationBar from './NavigationBar';
import RaceProgress from './RaceProgress';
import { ScoreCalculator } from '../utils/ScoreCalculator';

interface ResultsViewProps {
  gameState: GameState;
  players: Player[];
  circuits: Circuit[];
  gameHistory: GameHistoryEntry[];
  onNewGame: () => void;
}

const formatTime = (ms: number | null | undefined): string => {
    if (ms === null || ms === undefined) return '-:--.---';
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = ms % 1000;
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

// Circuit Results Detail Component - for ResultsView
const CircuitResultsDetail: React.FC<{ gameState: GameState; players: Player[] }> = ({ gameState, players }) => {
  const calculator = new ScoreCalculator(gameState, players);
  const circuitBreakdown = calculator.getCircuitBreakdown();

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
        <h3 className="text-xl font-bold text-zinc-100 mb-2">Resultados por Circuito</h3>
        <p className="text-zinc-400 text-sm">Desglose detallado de puntuación por cada circuito corrido</p>
      </div>

      {circuitBreakdown.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-md p-8 text-center">
          <div className="text-zinc-500 mb-4">
            <svg className="w-16 h-16 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-zinc-400 mb-2">No hay datos por circuito</h3>
          <p className="text-zinc-500 text-sm">Los resultados aparecerán aquí una vez que se complete un campeonato</p>
        </div>
      ) : (
        circuitBreakdown.map((circuit, circuitIndex) => {
        if (!circuit) return null;
        return (
        <div key={circuitIndex} className="bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-700 bg-zinc-800">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-bold text-zinc-100 font-mono uppercase tracking-wide">
                {circuit.name}
              </h4>
              <span className="text-xs text-zinc-400 font-mono">
                CIRCUITO {circuit.circuitIndex + 1}
              </span>
            </div>
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
                  {Array.from({ length: gameState.settings.turnsPerCircuit }, (_, i) => (
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
                        <div className="flex flex-col items-center">
                          <span 
                            className="text-zinc-300 cursor-help text-xs font-bold"
                            title={`Posición: ${turnData.position}° | Base: ${turnData.basePoints}pts | Bonus: ${turnData.bonusPoints}pts`}
                          >
                            {turnData.totalPoints}
                          </span>
                          <span className="text-xs text-zinc-500">{turnData.position}°</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Circuit View */}
          <div className="md:hidden p-4 space-y-4">
            {circuit.players.map((playerData, index) => (
              <div key={playerData.player.id} className="border border-zinc-700 rounded-md p-3">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-lg ${
                      index === 0 ? 'text-yellow-400' :
                      index === 1 ? 'text-zinc-300' :
                      index === 2 ? 'text-amber-600' :
                      'text-zinc-400'
                    }`}>
                      {index + 1}°
                    </span>
                    <span className="font-semibold text-zinc-100 text-lg">{playerData.player.name}</span>
                  </div>
                  <span className="font-bold text-zinc-100 font-mono text-lg">{playerData.totalPoints} pts</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Base:</span>
                    <span className="text-zinc-300 font-mono">{playerData.basePoints}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Bonus:</span>
                    <span className="text-amber-400 font-mono">{playerData.bonusPoints}</span>
                  </div>
                </div>

                <div className="border-t border-zinc-700 pt-3">
                  <div className="text-xs text-zinc-400 mb-2 font-mono uppercase tracking-wide">Detalle por Turno</div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {playerData.turns.map((turnData, turnIndex) => (
                      <div key={turnIndex} className="text-center bg-zinc-800 p-2 rounded">
                        <div className="text-zinc-400 text-xs">T{turnIndex + 1}</div>
                        <div className="font-mono font-bold text-zinc-100">
                          {turnData.totalPoints}
                        </div>
                        <div className="text-zinc-500 text-xs">{turnData.position}°</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        );
      })
      )}
    </div>
  );
};

const FinalResults: React.FC<{ gameState: GameState; players: Player[]; onNewGame: () => void }> = ({ gameState, players, onNewGame }) => {
    const finalStandings = Object.entries(gameState.playerStats)
        .map(([playerId, stats]) => ({
            player: players.find(p => p.id === playerId)!,
            ...(stats as PlayerStats),
        }))
        .filter(s => s.player)
        .sort((a, b) => b.totalScore - a.totalScore);

    const winner = finalStandings[0];

    return (
        <div className="max-w-md mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-zinc-100 text-center mb-6">CAMPEONATO FINALIZADO</h1>
            
            {winner && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-md p-6 text-center">
                    <p className="text-lg text-zinc-300 mb-4">🏆 Campeón</p>
                    <p className="text-3xl font-bold text-yellow-400">{winner.player.name}</p>
                    <p className="text-xl text-zinc-100 mt-2">{winner.totalScore} puntos</p>
                </div>
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden">
                <div className="p-4 border-b border-zinc-800">
                    <h3 className="text-xl font-bold text-zinc-100">Clasificación Final</h3>
                </div>
                <div className="divide-y divide-zinc-800">
                    {finalStandings.map(({ player, totalScore }, index) => (
                        <div key={player.id} className="p-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className={`font-bold text-xl w-8 ${
                                    index === 0 ? 'text-yellow-400' :
                                    index === 1 ? 'text-zinc-300' :
                                    index === 2 ? 'text-amber-600' :
                                    'text-zinc-400'
                                }`}>{index + 1}</span>
                                <span className="text-zinc-100 font-semibold text-lg">{player.name}</span>
                            </div>
                            <span className="text-zinc-100 font-bold text-xl">{totalScore}</span>
                        </div>
                    ))}
                </div>
            </div>

            <button 
                onClick={onNewGame} 
                className="w-full touch-target bg-red-600 text-white font-bold text-xl rounded-md py-4 transition-all hover:bg-red-700"
            >
                NUEVO CAMPEONATO
            </button>
        </div>
    );
};

interface TopStatsProps {
    circuits: Circuit[];
    players: Player[];
    gameHistory: GameHistoryEntry[];
}

const TopStats: React.FC<TopStatsProps> = ({ circuits, players, gameHistory }) => {
    const [selectedCircuitId, setSelectedCircuitId] = useState<string>(circuits[0]?.id || '');

    const playerStats = useMemo(() => {
        const stats: Record<string, { 
            championships: number; 
            fastLapVictories: number; 
            avgVictories: number; 
            totalVictories: number;
            circuitRecords: number;
            avgRecords: number;
        }> = {};
        
        // Initialize stats for all players
        players.forEach(p => {
            stats[p.id] = { 
                championships: 0, 
                fastLapVictories: 0, 
                avgVictories: 0, 
                totalVictories: 0,
                circuitRecords: 0,
                avgRecords: 0
            };
        });

        // Count circuit records (historical bests)
        circuits.forEach(c => {
            if (c.bestLapHolderId && stats[c.bestLapHolderId]) {
                stats[c.bestLapHolderId].circuitRecords++;
            }
            if (c.bestAverageHolderId && stats[c.bestAverageHolderId]) {
                stats[c.bestAverageHolderId].avgRecords++;
            }
        });

        // Process game history for victories and championships
        gameHistory.forEach(game => {
            if (!game.state || typeof game.state !== 'object') return;
            
            const gameState = game.state as any;
            
            // Count championships
            const standings = Object.entries(gameState.playerStats || {})
                .map(([id, stats]: [string, any]) => ({ playerId: id, totalScore: stats.totalScore || 0 }))
                .sort((a, b) => b.totalScore - a.totalScore);
            
            if (standings.length > 0) {
                const winnerId = standings[0].playerId;
                if (stats[winnerId]) {
                    stats[winnerId].championships++;
                }
            }

            // Count turn/circuit victories from circuitResults
            if (gameState.circuitResults && Array.isArray(gameState.circuitResults)) {
                gameState.circuitResults.forEach((circuitResult: any) => {
                    if (circuitResult.turns && Array.isArray(circuitResult.turns)) {
                        circuitResult.turns.forEach((turn: any) => {
                            if (Array.isArray(turn)) {
                                // Best average victory
                                const sortedByAverage = turn
                                    .filter((p: any) => p.averageTime && p.averageTime > 0)
                                    .sort((a: any, b: any) => a.averageTime - b.averageTime);
                                
                                if (sortedByAverage.length > 0) {
                                    const winnerId = sortedByAverage[0].playerId;
                                    if (stats[winnerId]) {
                                        stats[winnerId].avgVictories++;
                                        stats[winnerId].totalVictories++;
                                    }
                                }
                                
                                // Best lap victory
                                const sortedByLap = turn
                                    .map((p: any) => ({
                                        ...p,
                                        bestLap: p.lapTimes ? Math.min(...p.lapTimes.filter((t: number) => t > 0)) : Infinity
                                    }))
                                    .filter((p: any) => p.bestLap !== Infinity)
                                    .sort((a: any, b: any) => a.bestLap - b.bestLap);
                                
                                if (sortedByLap.length > 0) {
                                    const winnerId = sortedByLap[0].playerId;
                                    if (stats[winnerId]) {
                                        stats[winnerId].fastLapVictories++;
                                        stats[winnerId].totalVictories++;
                                    }
                                }
                            }
                        });
                    }
                });
            }
        });

        return stats;
    }, [gameHistory, players, circuits]);

    const selectedCircuit = circuits.find(c => c.id === selectedCircuitId);

    const playerStatsArray = Object.entries(playerStats)
        .map(([playerId, stats]) => ({
            player: players.find(p => p.id === playerId),
            ...stats
        }))
        .filter(s => s.player)
        .sort((a, b) => b.totalVictories - a.totalVictories);

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-md">
                <div className="p-4 border-b border-zinc-800">
                    <h2 className="text-xl font-bold text-zinc-100">Récords Históricos</h2>
                </div>
                <div className="p-4">
                    <select
                        value={selectedCircuitId}
                        onChange={(e) => setSelectedCircuitId(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-4 py-3 text-zinc-100 mb-4 text-lg touch-target"
                    >
                        {circuits.map(circuit => (
                            <option key={circuit.id} value={circuit.id}>{circuit.name}</option>
                        ))}
                    </select>

                    {selectedCircuit && (
                        <div className="space-y-6">
                            <div>
                                <p className="text-zinc-400 text-base mb-2">Vuelta más rápida</p>
                                {selectedCircuit.historicalBestLap ? (
                                    <>
                                        <p className="text-green-400 font-mono text-2xl font-bold">
                                            {formatTime(selectedCircuit.historicalBestLap)}
                                        </p>
                                        <p className="text-zinc-100 mt-2 text-lg">
                                            {selectedCircuit.bestLapHolderId 
                                                ? (players.find(p => p.id === selectedCircuit.bestLapHolderId)?.name || 'Desconocido')
                                                : 'Récord Histórico'
                                            }
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-zinc-500 text-xl font-semibold">Sin récord</p>
                                )}
                            </div>

                            <div>
                                <p className="text-zinc-400 text-base mb-2">Mejor promedio</p>
                                {selectedCircuit.historicalBestAverage ? (
                                    <>
                                        <p className="text-yellow-400 font-mono text-2xl font-bold">
                                            {formatTime(selectedCircuit.historicalBestAverage)}
                                        </p>
                                        <p className="text-zinc-100 mt-2 text-lg">
                                            {selectedCircuit.bestAverageHolderId 
                                                ? (players.find(p => p.id === selectedCircuit.bestAverageHolderId)?.name || 'Desconocido')
                                                : 'Récord Histórico'
                                            }
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-zinc-500 text-xl font-semibold">Sin récord</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-md">
                <div className="p-4 border-b border-zinc-800">
                    <h3 className="text-xl font-bold text-zinc-100">Ranking de Jugadores</h3>
                </div>
                <div className="divide-y divide-zinc-800">
                    {playerStatsArray.map(({ player, championships, fastLapVictories, avgVictories, totalVictories, circuitRecords, avgRecords }) => (
                        <div key={player!.id} className="p-4">
                            <p className="text-zinc-100 font-semibold mb-3 text-lg">{player!.name}</p>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-400 text-base">Campeonatos</span>
                                    <span className="text-yellow-400 font-bold text-lg">{championships}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-400 text-base">Total Victorias</span>
                                    <span className="text-f1-red font-bold text-lg">{totalVictories}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-400 text-base">V. Rápidas</span>
                                    <span className="text-green-400 font-bold text-lg">{fastLapVictories}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-400 text-base">V. Promedios</span>
                                    <span className="text-purple-400 font-bold text-lg">{avgVictories}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-400 text-base">Récords V.R.</span>
                                    <span className="text-zinc-100 font-bold text-lg">{circuitRecords}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-400 text-base">Récords Prom.</span>
                                    <span className="text-zinc-100 font-bold text-lg">{avgRecords}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ResultsView: React.FC<ResultsViewProps> = ({ gameState, players, circuits, gameHistory, onNewGame }) => {
    const [activeTab, setActiveTab] = useState<'tiempos' | 'acumulados'>('acumulados');

    return (
        <div className="min-h-screen bg-black">            
            <div className="sticky top-0 z-10 bg-black border-b border-zinc-800">
                <div className="flex max-w-2xl mx-auto">
                    <button
                        onClick={() => setActiveTab('tiempos')}
                        className={`flex-1 py-4 text-lg font-bold transition-colors touch-target ${
                            activeTab === 'tiempos' 
                                ? 'text-zinc-100 border-b-2 border-red-500' 
                                : 'text-zinc-400'
                        }`}
                    >
                        TIEMPOS
                    </button>
                    <button
                        onClick={() => setActiveTab('acumulados')}
                        className={`flex-1 py-4 text-lg font-bold transition-colors touch-target ${
                            activeTab === 'acumulados' 
                                ? 'text-zinc-100 border-b-2 border-red-500' 
                                : 'text-zinc-400'
                        }`}
                    >
                        ACUMULADOS
                    </button>
                </div>
            </div>

            <div className="p-4">
                {activeTab === 'tiempos' && (
                    <div className="space-y-6">
                        <CircuitResultsDetail gameState={gameState} players={players} />
                        <TopStats circuits={circuits} players={players} gameHistory={gameHistory} />
                    </div>
                )}
                {activeTab === 'acumulados' && (
                    <div className="space-y-6">
                        <RaceProgress gameState={gameState} players={players} />
                        <FinalResults gameState={gameState} players={players} onNewGame={onNewGame} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResultsView;