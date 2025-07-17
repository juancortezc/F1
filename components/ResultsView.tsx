

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
            <h1 className="text-4xl font-black mt-4 uppercase tracking-wider">Game Over!</h1>
            <h2 className="text-2xl text-slate-300 mt-2">The winner is...</h2>
            {winner && <div className="mt-4 flex items-center justify-center gap-4">
                <img src={winner.player.imageUrl} alt={winner.player.name} className="w-20 h-20 rounded-full border-4 border-yellow-400" />
                <div>
                    <p className="text-4xl font-bold text-yellow-300">{winner.player.name}</p>
                    <p className="text-xl font-semibold text-slate-200">{winner.totalScore} Points</p>
                </div>
            </div>}

            <div className="mt-8 text-left bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <h3 className="font-bold text-xl mb-3 text-center">Final Standings</h3>
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

    const calculateDaysHeld = (dateString: string | null | undefined): string => {
        if (!dateString) return '-';
        const recordDate = new Date(dateString);
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
                                    <p className="text-slate-400 text-xs font-semibold">WINS</p>
                                    <p className="font-bold text-xl text-[#FF1801]">{career?.wins ?? 0}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-xs font-semibold">LAP REC</p>
                                    <p className="font-bold text-xl text-[#FF1801]">{records?.lapRecords ?? 0}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-xs font-semibold">AVG REC</p>
                                    <p className="font-bold text-xl text-[#FF1801]">{records?.avgRecords ?? 0}</p>
                                </div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-slate-700/50">
                                <p className="text-slate-400 text-xs font-semibold">MOST WINS ON</p>
                                <p className="font-semibold text-[#FF1801] truncate" title={career?.mostWonCircuit || 'N/A'}>
                                    {career?.mostWonCircuit || 'N/A'}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <h2 className="text-2xl font-bold mt-4">All-Time Circuit Records</h2>
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <label htmlFor="circuit-select" className="sr-only">Select a circuit</label>
                <select 
                    id="circuit-select"
                    value={selectedCircuitId} 
                    onChange={e => setSelectedCircuitId(e.target.value)}
                    className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg mb-4 focus:ring-2 focus:ring-[#FF1801] focus:border-[#FF1801]"
                >
                    <option value="" disabled>-- Select a circuit --</option>
                    {circuits.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>

                {selectedCircuit && (
                    <div className="space-y-4">
                        {/* Best Lap Card */}
                        <div className="bg-slate-900/50 p-4 rounded-lg">
                            <h4 className="font-semibold text-lg">Best Lap</h4>
                            <div className="flex justify-between items-center mt-2">
                                <p className="font-mono text-2xl text-[#FF1801] font-bold">{formatTime(selectedCircuit.historicalBestLap)}</p>
                                <div className="text-right">
                                    <p className="font-semibold">{players.find(p=>p.id === selectedCircuit.bestLapHolderId)?.name || 'N/A'}</p>
                                    <p className="text-sm text-slate-400">{selectedCircuit.historicalBestLapDate ? new Date(selectedCircuit.historicalBestLapDate).toLocaleDateString() : 'No date'}</p>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2 text-right">
                                Record held for {calculateDaysHeld(selectedCircuit.historicalBestLapDate)}
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
                                Record held for {calculateDaysHeld(selectedCircuit.historicalBestAverageDate)}
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
            <h4 className="font-bold text-lg mb-2 text-center text-[#FF1801]">Scoring Rules Summary</h4>
            <p>• <strong>Main Points:</strong> Awarded per turn based on <strong>{mainScoringText}</strong>.</p>
            {scoringMethod === 'both' && scoringMultiplier && (
                 <p className="pl-4">↳ With a <strong>x{scoringMultiplier.factor} multiplier</strong> on points for <strong>{scoringMultiplier.appliesTo === 'average' ? 'Best Average' : 'Fastest Lap'}</strong>.</p>
            )}
            {scoringMethod === 'both' && !scoringMultiplier && (
                 <p className="pl-4">↳ Both categories are awarded equal points (3-2-1).</p>
            )}
            {(pointsForBestLap > 0 || pointsForBestAverage > 0) && (
                <p>• <strong>Extra Points:</strong> Awarded per <strong>{awardBestTimeFor}</strong>:
                    <span className="ml-2">{pointsForBestLap} pt(s) for Best Lap</span>
                    <span className="ml-2">& {pointsForBestAverage} pt(s) for Best Average.</span>
                </p>
            )}
            {settings.lapsPerTurn === 5 && (
                <p>• <strong>Lap Calculation:</strong> Averages are calculated using the <strong>{settings.useBest4Of5Laps ? 'best 4 of 5 laps' : 'all 5 laps'}</strong>.</p>
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
                        <h3 className="font-bold text-xl mb-3 text-center">Current Standings</h3>
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
            return (
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <div className="mb-4 flex border-b border-slate-600">
                        <button onClick={() => setNightlyView('lap')} className={`py-2 px-4 font-semibold ${nightlyView === 'lap' ? 'border-b-2 border-[#FF1801] text-[#FF1801]' : 'text-slate-400'}`}>By Lap</button>
                        <button onClick={() => setNightlyView('average')} className={`py-2 px-4 font-semibold ${nightlyView === 'average' ? 'border-b-2 border-[#FF1801] text-[#FF1801]' : 'text-slate-400'}`}>By Average</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-300">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
                                <tr>
                                    <th scope="col" className="px-4 py-3">#</th>
                                    <th scope="col" className="px-4 py-3">Circuit</th>
                                    <th scope="col" className="px-4 py-3">Player</th>
                                    <th scope="col" className="px-4 py-3">Turn</th>
                                    {nightlyView === 'lap' && <th scope="col" className="px-4 py-3">Lap</th>}
                                    <th scope="col" className="px-4 py-3 text-right">Time</th>
                                    <th scope="col" className="px-4 py-3 text-right">Delta</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(nightlyView === 'lap' ? sortedLapResults : sortedAverageResults).map((result, index) => {
                                    const player = players.find(p => p.id === result.playerId);
                                    const delta = result.time - (nightlyView === 'lap' ? bestLapTime : bestAverageTime);
                                    return (
                                        <tr key={index} className="border-b border-slate-700 hover:bg-slate-800/50">
                                            <td className="px-4 py-3 font-medium">{index + 1}</td>
                                            <td className="px-4 py-3">{result.circuitName}</td>
                                            <td className="px-4 py-3 font-semibold whitespace-nowrap">{player?.name}</td>
                                            <td className="px-4 py-3">{result.turn}</td>
                                            {nightlyView === 'lap' && <td className="px-4 py-3">{'lap' in result ? (result as NightlyResult).lap : '-'}</td>}
                                            <td className="px-4 py-3 text-right font-mono">{formatTime(result.time)}</td>
                                            <td className="px-4 py-3 text-right font-mono text-slate-400">
                                                {delta > 0 ? `+${formatTime(delta)}` : '-'}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        case 'top':
            return <TopStats circuits={circuits} players={players} gameHistory={gameHistory} />;
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
        <div className="mb-4 flex border-b border-slate-700">
             <button onClick={() => setActiveTab('standings')} className={`py-2 px-4 font-semibold ${activeTab === 'standings' ? 'border-b-2 border-[#FF1801] text-[#FF1801]' : 'text-slate-400'}`}>Standings</button>
             <button onClick={() => setActiveTab('nightly')} className={`py-2 px-4 font-semibold ${activeTab === 'nightly' ? 'border-b-2 border-[#FF1801] text-[#FF1801]' : 'text-slate-400'}`}>Night's Results</button>
             <button onClick={() => setActiveTab('top')} className={`py-2 px-4 font-semibold ${activeTab === 'top' ? 'border-b-2 border-[#FF1801] text-[#FF1801]' : 'text-slate-400'}`}>Top Stats</button>
        </div>
        <div>
            {renderTabContent()}
        </div>
    </div>
  );
};

export default ResultsView;