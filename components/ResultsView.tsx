

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

    // Sort players by total performance for podium
    const sortedPlayers = players.map(player => {
        const records = playerRecordStats[player.id];
        const career = playerCareerStats[player.id];
        const totalScore = (career?.wins ?? 0) * 3 + (records?.lapRecords ?? 0) + (records?.avgRecords ?? 0);
        return { player, records, career, totalScore };
    }).sort((a, b) => b.totalScore - a.totalScore);

    return (
        <div className="space-y-8">
            {/* Header with Podium */}
            <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                        <span className="text-lg">🏆</span>
                    </div>
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
                        Hall of Fame
                    </h2>
                    <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                        <span className="text-lg">🏆</span>
                    </div>
                </div>
                <p className="text-slate-400 text-lg">Las leyendas de la pista • Los campeones eternos</p>
            </div>

            {/* Podium Section */}
            {sortedPlayers.length >= 3 && (
                <div className="relative mb-12">
                    <div className="flex items-end justify-center gap-8 mb-6">
                        {/* 2nd Place */}
                        <div className="flex flex-col items-center">
                            <div className="relative mb-4">
                                <img 
                                    src={sortedPlayers[1].player.imageUrl} 
                                    alt={sortedPlayers[1].player.name}
                                    className="w-20 h-20 rounded-full border-4 border-slate-400 shadow-lg"
                                />
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    2
                                </div>
                            </div>
                            <div className="bg-gradient-to-t from-slate-400 to-slate-300 h-24 w-20 rounded-t-lg flex items-end justify-center pb-2">
                                <span className="text-white font-bold text-lg">🥈</span>
                            </div>
                            <h3 className="font-bold text-lg mt-2">{sortedPlayers[1].player.name}</h3>
                            <p className="text-slate-400 text-sm">{sortedPlayers[1].totalScore} puntos</p>
                        </div>

                        {/* 1st Place */}
                        <div className="flex flex-col items-center">
                            <div className="relative mb-4">
                                <img 
                                    src={sortedPlayers[0].player.imageUrl} 
                                    alt={sortedPlayers[0].player.name}
                                    className="w-24 h-24 rounded-full border-4 border-yellow-400 shadow-xl"
                                />
                                <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold">
                                    1
                                </div>
                                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                                    <span className="text-2xl">👑</span>
                                </div>
                            </div>
                            <div className="bg-gradient-to-t from-yellow-600 to-yellow-400 h-32 w-20 rounded-t-lg flex items-end justify-center pb-3">
                                <span className="text-white font-bold text-xl">🥇</span>
                            </div>
                            <h3 className="font-bold text-xl mt-2 text-yellow-400">{sortedPlayers[0].player.name}</h3>
                            <p className="text-yellow-300 text-sm font-semibold">{sortedPlayers[0].totalScore} puntos</p>
                        </div>

                        {/* 3rd Place */}
                        <div className="flex flex-col items-center">
                            <div className="relative mb-4">
                                <img 
                                    src={sortedPlayers[2].player.imageUrl} 
                                    alt={sortedPlayers[2].player.name}
                                    className="w-20 h-20 rounded-full border-4 border-amber-600 shadow-lg"
                                />
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    3
                                </div>
                            </div>
                            <div className="bg-gradient-to-t from-amber-700 to-amber-600 h-16 w-20 rounded-t-lg flex items-end justify-center pb-2">
                                <span className="text-white font-bold text-lg">🥉</span>
                            </div>
                            <h3 className="font-bold text-lg mt-2">{sortedPlayers[2].player.name}</h3>
                            <p className="text-slate-400 text-sm">{sortedPlayers[2].totalScore} puntos</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Player Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedPlayers.map(({player, records, career}, index) => (
                    <div 
                        key={player.id} 
                        className={`relative overflow-hidden rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                            index === 0 ? 'bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-2 border-yellow-400/50' :
                            index === 1 ? 'bg-gradient-to-br from-slate-600/20 to-slate-800/20 border-2 border-slate-400/50' :
                            index === 2 ? 'bg-gradient-to-br from-amber-600/20 to-amber-800/20 border-2 border-amber-600/50' :
                            'bg-gradient-to-br from-slate-700/50 to-slate-900/50 border border-slate-600'
                        }`}
                    >
                        {/* Position Badge */}
                        <div className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                            index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                            index === 1 ? 'bg-gradient-to-r from-slate-400 to-slate-600' :
                            index === 2 ? 'bg-gradient-to-r from-amber-600 to-amber-700' :
                            'bg-slate-600'
                        }`}>
                            #{index + 1}
                        </div>

                        {/* Player Avatar */}
                        <div className="flex flex-col items-center mb-4">
                            <div className={`relative mb-3 ${index < 3 ? 'animate-pulse' : ''}`}>
                                <img 
                                    src={player.imageUrl} 
                                    alt={player.name} 
                                    className={`w-20 h-20 rounded-full shadow-lg ${
                                        index === 0 ? 'border-4 border-yellow-400' :
                                        index === 1 ? 'border-4 border-slate-400' :
                                        index === 2 ? 'border-4 border-amber-600' :
                                        'border-2 border-slate-500'
                                    }`}
                                />
                                {index < 3 && (
                                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                                        <span className="text-xl">
                                            {index === 0 ? '👑' : index === 1 ? '🥈' : '🥉'}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <h4 className={`font-bold text-xl text-center ${
                                index === 0 ? 'text-yellow-400' : 'text-white'
                            }`}>
                                {player.name}
                            </h4>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-2 bg-[#FF1801]/20 rounded-full flex items-center justify-center">
                                    <span className="text-2xl">🏆</span>
                                </div>
                                <p className="text-3xl font-bold text-[#FF1801]">{career?.wins ?? 0}</p>
                                <p className="text-xs text-slate-400 font-medium">VICTORIAS</p>
                            </div>
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-2 bg-purple-500/20 rounded-full flex items-center justify-center">
                                    <span className="text-2xl">⚡</span>
                                </div>
                                <p className="text-3xl font-bold text-purple-400">{records?.lapRecords ?? 0}</p>
                                <p className="text-xs text-slate-400 font-medium">V. RÁPIDAS</p>
                            </div>
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-2 bg-green-500/20 rounded-full flex items-center justify-center">
                                    <span className="text-2xl">📊</span>
                                </div>
                                <p className="text-3xl font-bold text-green-400">{records?.avgRecords ?? 0}</p>
                                <p className="text-xs text-slate-400 font-medium">PROMEDIOS</p>
                            </div>
                        </div>

                        {/* Specialty Circuit */}
                        <div className="text-center pt-4 border-t border-slate-600/50">
                            <p className="text-slate-400 text-xs font-medium mb-1">ESPECIALISTA EN</p>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-lg">🏁</span>
                                <p className="font-bold text-[#FF1801] text-sm">
                                    {career?.mostWonCircuit || 'Pendiente'}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Circuit Records Section */}
            <div className="mt-12">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="text-2xl">🏁</span>
                        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                            Récords de Circuito
                        </h2>
                        <span className="text-2xl">🏁</span>
                    </div>
                    <p className="text-slate-400">Los tiempos más rápidos de cada pista</p>
                </div>

                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50">
                    <select 
                        value={selectedCircuitId} 
                        onChange={e => setSelectedCircuitId(e.target.value)}
                        className="w-full p-4 bg-slate-700/50 border border-slate-600 rounded-xl mb-6 focus:ring-2 focus:ring-[#FF1801] focus:border-[#FF1801] text-lg font-medium"
                    >
                        <option value="" disabled>🏁 Selecciona un Circuito</option>
                        {circuits.map(c => (
                            <option key={c.id} value={c.id}>🏁 {c.name}</option>
                        ))}
                    </select>

                    {selectedCircuit && (
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Best Lap Record */}
                            <div className="relative overflow-hidden bg-gradient-to-br from-[#FF1801]/10 to-red-900/10 p-6 rounded-xl border border-[#FF1801]/30">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-[#FF1801]/10 rounded-full -translate-y-4 translate-x-4"></div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-[#FF1801]/20 rounded-full flex items-center justify-center">
                                        <span className="text-2xl">⚡</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-[#FF1801]">Vuelta Más Rápida</h3>
                                </div>
                                <div className="space-y-3">
                                    <p className="font-mono text-4xl text-[#FF1801] font-bold">
                                        {formatTime(selectedCircuit.historicalBestLap)}
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <img 
                                            src={players.find(p=>p.id === selectedCircuit.bestLapHolderId)?.imageUrl || '/default-avatar.png'} 
                                            alt="Record holder" 
                                            className="w-10 h-10 rounded-full border-2 border-[#FF1801]/50"
                                        />
                                        <div>
                                            <p className="font-bold text-lg">
                                                {players.find(p=>p.id === selectedCircuit.bestLapHolderId)?.name || 'Sin récord'}
                                            </p>
                                            <p className="text-sm text-slate-400">
                                                {selectedCircuit.historicalBestLapDate ? new Date(selectedCircuit.historicalBestLapDate).toLocaleDateString() : 'Sin fecha'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2 border-t border-[#FF1801]/20">
                                        <span className="text-lg">⏰</span>
                                        <p className="text-sm text-slate-400">
                                            Récord mantenido por <strong>{calculateDaysHeld(selectedCircuit.historicalBestLapDate)}</strong>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Best Average Record */}
                            <div className="relative overflow-hidden bg-gradient-to-br from-green-500/10 to-emerald-900/10 p-6 rounded-xl border border-green-500/30">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -translate-y-4 translate-x-4"></div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                                        <span className="text-2xl">📊</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-green-400">Mejor Promedio</h3>
                                </div>
                                <div className="space-y-3">
                                    <p className="font-mono text-4xl text-green-400 font-bold">
                                        {formatTime(selectedCircuit.historicalBestAverage)}
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <img 
                                            src={players.find(p=>p.id === selectedCircuit.bestAverageHolderId)?.imageUrl || '/default-avatar.png'} 
                                            alt="Record holder" 
                                            className="w-10 h-10 rounded-full border-2 border-green-500/50"
                                        />
                                        <div>
                                            <p className="font-bold text-lg">
                                                {players.find(p=>p.id === selectedCircuit.bestAverageHolderId)?.name || 'Sin récord'}
                                            </p>
                                            <p className="text-sm text-slate-400">
                                                {selectedCircuit.historicalBestAverageDate ? new Date(selectedCircuit.historicalBestAverageDate).toLocaleDateString() : 'Sin fecha'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2 border-t border-green-500/20">
                                        <span className="text-lg">⏰</span>
                                        <p className="text-sm text-slate-400">
                                            Récord mantenido por <strong>{calculateDaysHeld(selectedCircuit.historicalBestAverageDate)}</strong>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
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