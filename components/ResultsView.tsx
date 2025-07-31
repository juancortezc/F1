

import React, { useState, useMemo } from 'react';
import { GameState, NightlyResult, Player, PlayerStats, Circuit, GameHistoryEntry } from '../types';
import { TrophyIcon } from './icons';

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
        <div className="text-center p-4 md:p-8 max-w-2xl mx-auto">
            <TrophyIcon className="w-28 h-28 mx-auto text-yellow-400" />
            <h1 className="text-4xl font-black mt-4 uppercase tracking-wider">¡Juego Terminado!</h1>
            <h2 className="text-2xl text-slate-300 mt-2">El ganador es...</h2>
            {winner && <div className="mt-4 flex items-center justify-center gap-4">
                <img src={winner.player.imageUrl} alt={winner.player.name} className="w-20 h-20 rounded-full border-4 border-yellow-400" />
                <div>
                    <p className="text-4xl font-bold text-yellow-300">{winner.player.name}</p>
                    <p className="text-xl font-semibold text-slate-200">{winner.totalScore} Puntos</p>
                </div>
            </div>}

            <div className="mt-8 text-left bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <h3 className="font-bold text-xl mb-3 text-center">Clasificación Final</h3>
                {finalStandings.map(({ player, totalScore }, index) => (
                    <div key={player.id} className={`flex justify-between items-center p-3 rounded mb-2 ${index === 0 ? 'bg-yellow-400/20' : 'bg-slate-700/50'}`}>
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-lg w-6">{index + 1}.</span>
                            <img src={player.imageUrl} alt={player.name} className="w-8 h-8 rounded-full" />
                            <span className="font-semibold">{player.name}</span>
                        </div>
                        <span className="font-bold text-lg">{totalScore} pts</span>
                    </div>
                ))}
            </div>

             <button onClick={onNewGame} className="mt-8 w-full bg-[#FF1801] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#E61601] transition-all">
                Start a New Game
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
            if (c.bestLapHolderId) {
                 if (stats[c.bestLapHolderId]) {
                    stats[c.bestLapHolderId].lapRecords++;
                }
            }
            if (c.bestAverageHolderId) {
                if (stats[c.bestAverageHolderId]) {
                    stats[c.bestAverageHolderId].avgRecords++;
                }
            }
        });
        return stats;
    }, [circuits, players]);

    const playerCareerStats = useMemo(() => {
        const stats: Record<string, { wins: number; circuitWinCounts: Record<string, number> }> = {};
        players.forEach(p => {
            stats[p.id] = { wins: 0, circuitWinCounts: {} };
        });

        gameHistory.forEach(game => {
            const gameState = game.state as unknown as GameState; // Cast from JSON
            if (!gameState || !gameState.circuitResults) return;
            
            gameState.circuitResults.forEach((cr) => {
                if (!cr.circuitId) return;
                // Determine winner of a circuit
                const circuitScores = new Map<string, number>();
                 cr.turns.flat().forEach(turn => {
                    circuitScores.set(turn.playerId, (circuitScores.get(turn.playerId) || 0) + turn.turnScore);
                });
                const circuitStandings = [...circuitScores.entries()].sort((a,b) => b[1] - a[1]);
                if (circuitStandings.length > 0) {
                    const winnerId = circuitStandings[0][0];
                    if (stats[winnerId]) {
                        stats[winnerId].wins++;
                        stats[winnerId].circuitWinCounts[cr.circuitId] = (stats[winnerId].circuitWinCounts[cr.circuitId] || 0) + 1;
                    }
                }
            });
        });

        const finalStats: Record<string, { wins: number; mostWonCircuit: string | null; }> = {};
        players.forEach(p => {
            const playerStats = stats[p.id];
            let mostWonCircuitId: string | null = null;
            let maxWins = 0;
            for (const circuitId in playerStats.circuitWinCounts) {
                if (playerStats.circuitWinCounts[circuitId] > maxWins) {
                    maxWins = playerStats.circuitWinCounts[circuitId];
                    mostWonCircuitId = circuitId;
                }
            }
            const mostWonCircuitName = mostWonCircuitId ? (circuits.find(c => c.id === mostWonCircuitId)?.name || 'Unknown') : 'N/A';
            finalStats[p.id] = {
                wins: playerStats.wins,
                mostWonCircuit: mostWonCircuitName,
            };
        });
        return finalStats;
    }, [gameHistory, players, circuits]);


    const selectedCircuit = circuits.find(c => c.id === selectedCircuitId);

    const calculateDaysHeld = (date: Date | string | null | undefined): string => {
        if (!date) return '-';
        const recordDate = date instanceof Date ? date : new Date(date);
        if (isNaN(recordDate.getTime())) return '-';
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - recordDate.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return `${diffDays} days`;
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Player Career Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {players.map(player => {
                    const records = playerRecordStats[player.id];
                    const career = playerCareerStats[player.id];
                    return (
                       <div key={player.id} className="bg-slate-800/50 p-4 rounded-lg text-center border border-slate-700">
                            <img src={player.imageUrl} alt={player.name} className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-slate-600" />
                            <h4 className="font-bold text-lg">{player.name}</h4>
                            
                            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                                <div>
                                    <p className="text-slate-400 text-xs font-semibold">GANA</p>
                                    <p className="font-bold text-xl text-[#FF1801]">{career?.wins ?? 0}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-xs font-semibold">M VLTA</p>
                                    <p className="font-bold text-xl text-[#FF1801]">{records?.lapRecords ?? 0}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-xs font-semibold">M PROM</p>
                                    <p className="font-bold text-xl text-[#FF1801]">{records?.avgRecords ?? 0}</p>
                                </div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-slate-700/50">
                                <p className="text-slate-400 text-xs font-semibold">GANA MAS EN</p>
                                <p className="font-semibold text-[#FF1801] truncate" title={career?.mostWonCircuit || 'N/A'}>
                                    {career?.mostWonCircuit || 'N/A'}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <h2 className="text-2xl font-bold mt-4">Records Históricos</h2>
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <label htmlFor="circuit-select" className="sr-only">Seleccionar Circuito</label>
                <select 
                    id="circuit-select"
                    value={selectedCircuitId} 
                    onChange={e => setSelectedCircuitId(e.target.value)}
                    className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg mb-4 focus:ring-2 focus:ring-[#FF1801] focus:border-[#FF1801]"
                >
                    <option value="" disabled>-- Circuito --</option>
                    {circuits.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>

                {selectedCircuit && (
                    <div className="space-y-4">
                        {/* Best Lap Card */}
                        <div className="bg-slate-900/50 p-4 rounded-lg">
                            <h4 className="font-semibold text-lg">Vuelta Rápida</h4>
                            <div className="flex justify-between items-center mt-2">
                                <p className="font-mono text-2xl text-[#FF1801] font-bold">{formatTime(selectedCircuit.historicalBestLap)}</p>
                                <div className="text-right">
                                    <p className="font-semibold">{players.find(p=>p.id === selectedCircuit.bestLapHolderId)?.name || 'N/A'}</p>
                                    <p className="text-sm text-slate-400">{selectedCircuit.historicalBestLapDate ? new Date(selectedCircuit.historicalBestLapDate).toLocaleDateString() : 'No date'}</p>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2 text-right">
                                Record desde hace {calculateDaysHeld(selectedCircuit.historicalBestLapDate)}
                            </p>
                        </div>
                        {/* Best Average Card */}
                        <div className="bg-slate-900/50 p-4 rounded-lg">
                            <h4 className="font-semibold text-lg">Best Average</h4>
                             <div className="flex justify-between items-center mt-2">
                                <p className="font-mono text-2xl text-green-400 font-bold">{formatTime(selectedCircuit.historicalBestAverage)}</p>
                                <div className="text-right">
                                    <p className="font-semibold">{players.find(p=>p.id === selectedCircuit.bestAverageHolderId)?.name || 'N/A'}</p>
                                    <p className="text-sm text-slate-400">{selectedCircuit.historicalBestAverageDate ? new Date(selectedCircuit.historicalBestAverageDate).toLocaleDateString() : 'No date'}</p>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2 text-right">
                                Record desde hace {calculateDaysHeld(selectedCircuit.historicalBestAverageDate)}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


const ResultsView: React.FC<ResultsViewProps> = ({ gameState, players, circuits, gameHistory, onNewGame }) => {
  const [activeTab, setActiveTab] = useState<'standings' | 'nightly' | 'top'>('standings');
  const [nightlyView, setNightlyView] = useState<'lap' | 'average'>('lap');

  const placementStats = useMemo(() => {
    if (!gameState) return {};
    
    const stats: Record<string, { first: number, second: number, third: number }> = {};
    gameState.settings.players.forEach(p => {
        stats[p.id] = { first: 0, second: 0, third: 0 };
    });

    const { scoringMethod } = gameState.settings;

    gameState.circuitResults.forEach(circuitResult => {
        circuitResult.turns.forEach(turn => {
            if (turn.length < gameState.settings.players.length) return;

            if (scoringMethod === 'average' || scoringMethod === 'both') {
                const sortedByAverage = [...turn].sort((a, b) => (a.averageTime ?? Infinity) - (b.averageTime ?? Infinity));
                if (sortedByAverage[0]) stats[sortedByAverage[0].playerId].first++;
                if (sortedByAverage[1]) stats[sortedByAverage[1].playerId].second++;
                if (sortedByAverage[2]) stats[sortedByAverage[2].playerId].third++;
            }

            if (scoringMethod === 'lap' || scoringMethod === 'both') {
                const sortedByLap = turn.map(tr => ({
                    playerId: tr.playerId,
                    bestLap: Math.min(...tr.lapTimes)
                })).sort((a, b) => a.bestLap - b.bestLap);
                if (sortedByLap[0]) stats[sortedByLap[0].playerId].first++;
                if (sortedByLap[1]) stats[sortedByLap[1].playerId].second++;
                if (sortedByLap[2]) stats[sortedByLap[2].playerId].third++;
            }
        });
    });
    
    return stats;
  }, [gameState]);

  if (gameState.currentCircuitIndex >= gameState.settings.circuits.length) {
      return <FinalResults gameState={gameState} players={players} onNewGame={onNewGame}/>;
  }
  
  const sortedLapResults = [...(gameState?.lapTimesLog || [])].sort((a,b) => a.time - b.time);
  const bestLapTime = sortedLapResults[0]?.time;
  
  const allAverages: Array<{ playerId: string, circuitName: string, turn: number, time: number}> = [];
    gameState.circuitResults.forEach(cr => {
        const circuitName = circuits.find(c => c.id === cr.circuitId)?.name || 'Unknown Circuit';
        cr.turns.forEach((turnData, turnIndex) => {
            turnData.forEach(playerTurn => {
                if (playerTurn.averageTime) {
                    allAverages.push({
                        playerId: playerTurn.playerId,
                        circuitName: circuitName,
                        turn: turnIndex + 1,
                        time: playerTurn.averageTime
                    });
                }
            });
        });
    });
  const sortedAverageResults = allAverages.sort((a, b) => a.time - b.time);
  const bestAverageTime = sortedAverageResults[0]?.time;


  const sortedStandings = Object.entries(gameState.playerStats)
        .map(([playerId, stats]) => ({
            player: players.find(p => p.id === playerId)!,
            ...(stats as PlayerStats)
        }))
        .filter(s => s.player)
        .sort((a,b) => b.totalScore - a.totalScore);

  const renderScoringSummary = () => {
    if (!gameState) return null;
    const { settings } = gameState;
    const { scoringMethod, scoringMultiplier, pointsForBestLap, pointsForBestAverage, awardBestTimeFor } = settings;

    let mainScoringText = '';
    switch (scoringMethod) {
        case 'average': mainScoringText = 'Best Average Time'; break;
        case 'lap': mainScoringText = 'Fastest Lap'; break;
        case 'both': mainScoringText = 'Best Average & Fastest Lap'; break;
    }

    return (
        <div className="mt-6 bg-slate-800/50 p-4 rounded-lg border border-slate-700 text-sm text-slate-300 space-y-2">
            <h4 className="font-bold text-lg mb-2 text-center text-[#FF1801]">Reglas de Puntaje</h4>
            <p>• <strong>Puntos Principales:</strong> en base a <strong>{mainScoringText}</strong>.</p>
            {scoringMethod === 'both' && scoringMultiplier && (
                 <p className="pl-4">↳ Con un multipicador de <strong>x{scoringMultiplier.factor} </strong> en puntos de <strong>{scoringMultiplier.appliesTo === 'average' ? 'Best Average' : 'Fastest Lap'}</strong>.</p>
            )}
            {scoringMethod === 'both' && !scoringMultiplier && (
                 <p className="pl-4">↳ Puntos iguales en las dos opciones de puntaje (3-2-1).</p>
            )}
            {(pointsForBestLap > 0 || pointsForBestAverage > 0) && (
                <p>• <strong>Puntos Extra:</strong> Entregados por <strong>{awardBestTimeFor}</strong>:
                    <span className="ml-2">{pointsForBestLap} pt(s) por Vuelta Rápida</span>
                    <span className="ml-2">& {pointsForBestAverage} pt(s) por Mejor Promedio.</span>
                </p>
            )}
            {settings.lapsPerTurn === 5 && (
                <p>• <strong>Cálculo de veutlas:</strong> Promedios se calculan en base a  <strong>{settings.useBest4Of5Laps ? 'best 4 of 5 laps' : 'all 5 laps'}</strong>.</p>
            )}
        </div>
    );
  }

  const renderTabContent = () => {
    switch(activeTab) {
        case 'standings':
            return (
                 <div>
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 space-y-2">
                        <h3 className="font-bold text-xl mb-3 text-center">Posiciones</h3>
                        {sortedStandings.map(({ player, totalScore, bestLaps, bestAverages }, index) => {
                            const placements = placementStats[player.id] || { first: 0, second: 0, third: 0 };
                            return (
                                <div key={player.id} className={`p-3 rounded-lg ${index === 0 ? 'bg-[#FF1801]/20 border border-[#FF1801]/50' : 'bg-slate-700/50'}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="font-black text-xl w-6 text-center">{index + 1}</span>
                                            <img src={player.imageUrl} alt={player.name} className="w-10 h-10 rounded-full" />
                                            <span className="font-semibold text-lg">{player.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-xl">{totalScore} pts</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-5 gap-1 text-center text-xs bg-slate-900/40 p-2 rounded-md">
                                        <div><p className="font-semibold text-slate-400">1st</p><p className="font-bold text-lg">{placements.first}</p></div>
                                        <div><p className="font-semibold text-slate-400">2nd</p><p className="font-bold text-lg">{placements.second}</p></div>
                                        <div><p className="font-semibold text-slate-400">3rd</p><p className="font-bold text-lg">{placements.third}</p></div>
                                        <div><p className="font-semibold text-slate-400">Best Laps</p><p className="font-bold text-lg">{bestLaps}</p></div>
                                        <div><p className="font-semibold text-slate-400">Best Avgs</p><p className="font-bold text-lg">{bestAverages}</p></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {renderScoringSummary()}
                </div>
            );
        case 'nightly':
            // Group results by circuit
            const resultsByCircuit = nightlyView === 'lap' ? 
                sortedLapResults.reduce((acc, result) => {
                    if (!acc[result.circuitName]) acc[result.circuitName] = [];
                    acc[result.circuitName].push(result);
                    return acc;
                }, {} as Record<string, typeof sortedLapResults>) :
                sortedAverageResults.reduce((acc, result) => {
                    if (!acc[result.circuitName]) acc[result.circuitName] = [];
                    acc[result.circuitName].push(result);
                    return acc;
                }, {} as Record<string, typeof sortedAverageResults>);
            
            return (
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <div className="mb-6">
                        <div className="bg-slate-700/50 backdrop-blur-sm border border-slate-600 rounded-lg p-1 inline-flex">
                            <button 
                                onClick={() => setNightlyView('lap')} 
                                className={`py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 ${
                                    nightlyView === 'lap' 
                                        ? 'bg-[#FF1801] text-white shadow-md' 
                                        : 'text-slate-400 hover:text-white hover:bg-slate-600/50'
                                }`}
                            >
                                By Lap
                            </button>
                            <button 
                                onClick={() => setNightlyView('average')} 
                                className={`py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 ${
                                    nightlyView === 'average' 
                                        ? 'bg-[#FF1801] text-white shadow-md' 
                                        : 'text-slate-400 hover:text-white hover:bg-slate-600/50'
                                }`}
                            >
                                By Average
                            </button>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        {Object.entries(resultsByCircuit).map(([circuitName, results]) => {
                            const bestTimeInCircuit = Math.min(...results.map(r => r.time));
                            return (
                                <div key={circuitName} className="bg-slate-700/30 rounded-lg overflow-hidden">
                                    {/* Circuit Header */}
                                    <div className="bg-slate-700/50 p-3 border-b border-slate-600">
                                        <h3 className="text-lg font-semibold text-[#FF1801]">{circuitName}</h3>
                                    </div>
                                    
                                    {/* Circuit Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left text-slate-300">
                                            <thead className="text-xs text-slate-400 uppercase bg-slate-700/30">
                                                <tr>
                                                    <th scope="col" className="px-3 py-2">#</th>
                                                    <th scope="col" className="px-3 py-2">Jugador</th>
                                                    <th scope="col" className="px-3 py-2">Tiempo</th>
                                                    <th scope="col" className="px-3 py-2">Delta</th>
                                                    <th scope="col" className="px-3 py-2">Turno</th>
                                                    {nightlyView === 'lap' && <th scope="col" className="px-3 py-2">Vuelta</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {results.sort((a, b) => a.time - b.time).map((result, index) => {
                                                    const player = players.find(p => p.id === result.playerId);
                                                    const delta = result.time - bestTimeInCircuit;
                                                    const isCircuitBest = result.time === bestTimeInCircuit;
                                                    return (
                                                        <tr key={`${result.playerId}-${result.turn}`} className={`border-b border-slate-600/50 hover:bg-slate-700/30 ${isCircuitBest ? 'bg-green-900/20' : ''}`}>
                                                            <td className="px-3 py-2 font-medium">{index + 1}</td>
                                                            <td className="px-3 py-2 font-semibold whitespace-nowrap">{player?.name}</td>
                                                            <td className="px-3 py-2 font-mono text-cyan-400">{formatTime(result.time)}</td>
                                                            <td className="px-3 py-2 font-mono text-slate-400">
                                                                {delta > 0 ? `+${formatTime(delta)}` : '-'}
                                                            </td>
                                                            <td className="px-3 py-2">{result.turn}</td>
                                                            {nightlyView === 'lap' && <td className="px-3 py-2">{'lap' in result ? (result as NightlyResult).lap : '-'}</td>}
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        case 'top':
            return <TopStats circuits={circuits} players={players} gameHistory={gameHistory} />;
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
        {/* Elegant Tab Navigation */}
        <div className="mb-6">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-1">
                <div className="flex">
                    <button 
                        onClick={() => setActiveTab('standings')} 
                        className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                            activeTab === 'standings' 
                                ? 'bg-[#FF1801] text-white shadow-lg' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }`}
                    >
                        Posiciones
                    </button>
                    <button 
                        onClick={() => setActiveTab('nightly')} 
                        className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                            activeTab === 'nightly' 
                                ? 'bg-[#FF1801] text-white shadow-lg' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }`}
                    >
                        Resultados
                    </button>
                    <button 
                        onClick={() => setActiveTab('top')} 
                        className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                            activeTab === 'top' 
                                ? 'bg-[#FF1801] text-white shadow-lg' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }`}
                    >
                        Top Stats
                    </button>
                </div>
            </div>
        </div>
        
        <div>
            {renderTabContent()}
        </div>
    </div>
  );
};

export default ResultsView;