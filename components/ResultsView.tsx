import React, { useState, useMemo } from 'react';
import { GameState, NightlyResult, Player, PlayerStats, Circuit, GameHistoryEntry } from '../types';
import NavigationBar from './NavigationBar';

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
                                <p className="text-green-400 font-mono text-2xl font-bold">
                                    {formatTime(selectedCircuit.historicalBestLap)}
                                </p>
                                {selectedCircuit.bestLapHolderId && (
                                    <p className="text-zinc-100 mt-2 text-lg">
                                        {players.find(p => p.id === selectedCircuit.bestLapHolderId)?.name || 'Desconocido'}
                                    </p>
                                )}
                            </div>

                            <div>
                                <p className="text-zinc-400 text-base mb-2">Mejor promedio</p>
                                <p className="text-yellow-400 font-mono text-2xl font-bold">
                                    {formatTime(selectedCircuit.historicalBestAverage)}
                                </p>
                                {selectedCircuit.bestAverageHolderId && (
                                    <p className="text-zinc-100 mt-2 text-lg">
                                        {players.find(p => p.id === selectedCircuit.bestAverageHolderId)?.name || 'Desconocido'}
                                    </p>
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
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="text-zinc-400">Campeonatos:</span>
                                    <span className="text-yellow-400 font-bold ml-2">{championships}</span>
                                </div>
                                <div>
                                    <span className="text-zinc-400">Total Victorias:</span>
                                    <span className="text-f1-red font-bold ml-2">{totalVictories}</span>
                                </div>
                                <div>
                                    <span className="text-zinc-400">Victorias V.Rápidas:</span>
                                    <span className="text-green-400 font-bold ml-2">{fastLapVictories}</span>
                                </div>
                                <div>
                                    <span className="text-zinc-400">Victorias Promedios:</span>
                                    <span className="text-purple-400 font-bold ml-2">{avgVictories}</span>
                                </div>
                                <div>
                                    <span className="text-zinc-400">Récords V.Rápida:</span>
                                    <span className="text-zinc-100 font-bold ml-2">{circuitRecords}</span>
                                </div>
                                <div>
                                    <span className="text-zinc-400">Récords Promedio:</span>
                                    <span className="text-zinc-100 font-bold ml-2">{avgRecords}</span>
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
                    <TopStats circuits={circuits} players={players} gameHistory={gameHistory} />
                )}
                {activeTab === 'acumulados' && (
                    <FinalResults gameState={gameState} players={players} onNewGame={onNewGame} />
                )}
            </div>
        </div>
    );
};

export default ResultsView;