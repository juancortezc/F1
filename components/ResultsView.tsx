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
        <div className="text-center p-4 max-w-md mx-auto">
            <h1 className="text-f1-3xl font-bold text-primary mb-4">CAMPEONATO FINALIZADO</h1>
            
            {winner && (
                <div className="surface-primary border border-subtle rounded-md p-6 mb-6">
                    <p className="text-f1-lg text-secondary mb-4">Campeón</p>
                    <p className="text-f1-3xl font-bold text-f1-yellow">{winner.player.name}</p>
                    <p className="text-f1-xl text-primary mt-2">{winner.totalScore} puntos</p>
                </div>
            )}

            <div className="surface-primary border border-subtle rounded-md mb-6">
                <div className="p-4 border-b border-subtle">
                    <h3 className="text-f1-lg font-bold text-primary">Clasificación Final</h3>
                </div>
                <div className="divide-y divide-subtle">
                    {finalStandings.map(({ player, totalScore }, index) => (
                        <div key={player.id} className="p-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className={`font-bold text-f1-lg w-8 ${
                                    index === 0 ? 'text-f1-yellow' :
                                    index === 1 ? 'text-primary' :
                                    index === 2 ? 'text-secondary' :
                                    'text-muted'
                                }`}>{index + 1}</span>
                                <span className="text-primary font-semibold">{player.name}</span>
                            </div>
                            <span className="text-primary font-bold text-f1-lg">{totalScore}</span>
                        </div>
                    ))}
                </div>
            </div>

            <button 
                onClick={onNewGame} 
                className="w-full touch-target bg-f1-red text-white font-bold text-f1-lg rounded-md transition-opacity hover:opacity-90"
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

    const playerRecordStats = useMemo(() => {
        const stats: Record<string, { lapRecords: number, avgRecords: number }> = {};
        players.forEach(p => {
            stats[p.id] = { lapRecords: 0, avgRecords: 0 };
        });
        circuits.forEach(c => {
            if (c.bestLapHolderId && stats[c.bestLapHolderId]) {
                stats[c.bestLapHolderId].lapRecords++;
            }
            if (c.bestAverageHolderId && stats[c.bestAverageHolderId]) {
                stats[c.bestAverageHolderId].avgRecords++;
            }
        });
        return stats;
    }, [circuits, players]);

    const playerCareerStats = useMemo(() => {
        const stats: Record<string, { wins: number; circuitWinCounts: Record<string, number> }> = {};
        players.forEach(p => {
            stats[p.id] = { wins: 0, circuitWinCounts: {} };
            circuits.forEach(c => {
                stats[p.id].circuitWinCounts[c.id] = 0;
            });
        });

        gameHistory.forEach(game => {
            const standings = Object.entries(game.finalStandings)
                .sort(([, a], [, b]) => b.totalScore - a.totalScore);
            
            if (standings.length > 0) {
                const winnerId = standings[0][0];
                if (stats[winnerId]) {
                    stats[winnerId].wins++;
                }
            }

            if (game.circuitWinners) {
                Object.entries(game.circuitWinners).forEach(([circuitId, winnerId]) => {
                    if (stats[winnerId] && stats[winnerId].circuitWinCounts[circuitId] !== undefined) {
                        stats[winnerId].circuitWinCounts[circuitId]++;
                    }
                });
            }
        });

        return stats;
    }, [gameHistory, players, circuits]);

    const selectedCircuit = circuits.find(c => c.id === selectedCircuitId);

    const playerStatsArray = Object.entries(playerRecordStats)
        .map(([playerId, stats]) => ({
            player: players.find(p => p.id === playerId),
            ...stats,
            careerWins: playerCareerStats[playerId]?.wins || 0,
            circuitWins: playerCareerStats[playerId]?.circuitWinCounts[selectedCircuitId] || 0
        }))
        .filter(s => s.player)
        .sort((a, b) => (b.lapRecords + b.avgRecords) - (a.lapRecords + a.avgRecords));

    return (
        <div className="p-4 max-w-2xl mx-auto space-y-6">
            <div className="surface-primary border border-subtle rounded-md">
                <div className="p-4 border-b border-subtle">
                    <h2 className="text-f1-lg font-bold text-primary">Récords Históricos</h2>
                </div>
                <div className="p-4">
                    <select
                        value={selectedCircuitId}
                        onChange={(e) => setSelectedCircuitId(e.target.value)}
                        className="w-full surface-secondary border border-subtle rounded-md px-4 py-2 text-primary mb-4"
                    >
                        {circuits.map(circuit => (
                            <option key={circuit.id} value={circuit.id}>{circuit.name}</option>
                        ))}
                    </select>

                    {selectedCircuit && (
                        <div className="space-y-4">
                            <div>
                                <p className="text-secondary text-f1-sm mb-2">Vuelta más rápida</p>
                                <p className="text-f1-green font-mono text-f1-xl font-bold">
                                    {formatTime(selectedCircuit.bestLap)}
                                </p>
                                {selectedCircuit.bestLapHolderId && (
                                    <p className="text-primary mt-1">
                                        {players.find(p => p.id === selectedCircuit.bestLapHolderId)?.name || 'Desconocido'}
                                    </p>
                                )}
                            </div>

                            <div>
                                <p className="text-secondary text-f1-sm mb-2">Mejor promedio</p>
                                <p className="text-f1-yellow font-mono text-f1-xl font-bold">
                                    {formatTime(selectedCircuit.bestAverage)}
                                </p>
                                {selectedCircuit.bestAverageHolderId && (
                                    <p className="text-primary mt-1">
                                        {players.find(p => p.id === selectedCircuit.bestAverageHolderId)?.name || 'Desconocido'}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="surface-primary border border-subtle rounded-md">
                <div className="p-4 border-b border-subtle">
                    <h3 className="text-f1-lg font-bold text-primary">Ranking de Jugadores</h3>
                </div>
                <div className="divide-y divide-subtle">
                    {playerStatsArray.map(({ player, lapRecords, avgRecords, careerWins, circuitWins }) => (
                        <div key={player!.id} className="p-4">
                            <p className="text-primary font-semibold mb-2">{player!.name}</p>
                            <div className="grid grid-cols-2 gap-2 text-f1-sm">
                                <div>
                                    <span className="text-secondary">Récords vuelta:</span>
                                    <span className="text-primary font-bold ml-2">{lapRecords}</span>
                                </div>
                                <div>
                                    <span className="text-secondary">Récords promedio:</span>
                                    <span className="text-primary font-bold ml-2">{avgRecords}</span>
                                </div>
                                <div>
                                    <span className="text-secondary">Campeonatos:</span>
                                    <span className="text-primary font-bold ml-2">{careerWins}</span>
                                </div>
                                <div>
                                    <span className="text-secondary">Victorias en {selectedCircuit?.name}:</span>
                                    <span className="text-primary font-bold ml-2">{circuitWins}</span>
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
    const [activeTab, setActiveTab] = useState<'final' | 'stats'>('final');

    return (
        <div className="min-h-screen bg-f1-black">
            <NavigationBar 
                title="Resultados"
                subtitle={gameState.settings.name}
            />
            
            <div className="sticky top-16 z-10 bg-f1-black border-b border-subtle">
                <div className="flex max-w-2xl mx-auto">
                    <button
                        onClick={() => setActiveTab('final')}
                        className={`flex-1 py-4 text-f1-base font-semibold transition-colors ${
                            activeTab === 'final' 
                                ? 'text-primary border-b-2 border-f1-red' 
                                : 'text-secondary'
                        }`}
                    >
                        FINAL
                    </button>
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`flex-1 py-4 text-f1-base font-semibold transition-colors ${
                            activeTab === 'stats' 
                                ? 'text-primary border-b-2 border-f1-red' 
                                : 'text-secondary'
                        }`}
                    >
                        HISTÓRICOS
                    </button>
                </div>
            </div>

            <div className="mt-4">
                {activeTab === 'final' && (
                    <FinalResults gameState={gameState} players={players} onNewGame={onNewGame} />
                )}
                {activeTab === 'stats' && (
                    <TopStats circuits={circuits} players={players} gameHistory={gameHistory} />
                )}
            </div>
        </div>
    );
};

export default ResultsView;