import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { GameState, Player, Circuit, GameHistoryEntry, PlayerStats } from '../types';
import UserAvatar from './UserAvatar';
import { fetcher } from '../lib/fetcher';
import { formatShortDateEC } from '../utils/dateUtils';

interface Tournament {
  id: string;
  name: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  playedCircuitIds: string[];
  startDate: string;
  endDate?: string;
  participants: {
    id: string;
    playerId: string;
    totalPoints: number;
    championshipsWon: number;
    championshipsSecond: number;
    championshipsThird: number;
    championshipsPlayed: number;
    player?: Player;
  }[];
  games?: {
    id: string;
    status: string;
    position: number;
    gameMode: string;
    state: any;
  }[];
}

interface F1HallOfFameProps {
  gameState: GameState;
  players: Player[];
  circuits: Circuit[];
  gameHistory: GameHistoryEntry[];
}

interface Settings {
  historicalCutoffDate: string | null;
}

interface AccumulatedStats {
  player: Player;
  championships: number;    // Campeonatos ganados (1° lugar)
  secondPlaces: number;     // Subcampeonatos (2° lugar)
  thirdPlaces: number;      // Terceros lugares (3° lugar)
  fastestLaps: number;      // VR: Récords de vuelta rápida por circuito
  bestAverages: number;     // PR: Récords de promedio por circuito
  totalScore: number;       // Puntos acumulados por posiciones en campeonatos
  vrCircuits: string[];     // Circuitos donde logró VR
  prCircuits: string[];     // Circuitos donde logró PR
  circuitWins: Record<string, number>; // Victorias por circuito
}

const F1HallOfFame: React.FC<F1HallOfFameProps> = ({
  gameState,
  players = [],
  circuits = [],
  gameHistory = []
}) => {
  // Fetch settings to check for cutoff date
  const { data: settings } = useSWR<Settings>('/api/settings', fetcher);
  const cutoffDate = settings?.historicalCutoffDate ? new Date(settings.historicalCutoffDate) : null;

  // Fetch tournaments
  const { data: tournamentsResponse } = useSWR<{success: boolean, tournaments: Tournament[]}>('/api/tournaments', fetcher);
  const tournaments = tournamentsResponse?.tournaments;

  // State for tabs
  const [activeTab, setActiveTab] = useState<'general' | 'torneos'>('general');

  // State for modals
  const [showPtsExplanation, setShowPtsExplanation] = useState(false);
  const [showVRModal, setShowVRModal] = useState(false);
  const [showPRModal, setShowPRModal] = useState(false);
  const [showCircuitDominationModal, setShowCircuitDominationModal] = useState(false);

  const { accumulatedStats } = useMemo(() => {
    // Include ALL players (including guests) - they will be filtered at the end
    // based on whether they have any stats (participated in games)
    const allPlayers = players;

    // Initialize accumulated stats for each player
    const playerAccStats: Record<string, AccumulatedStats> = {};
    allPlayers.forEach(player => {
      playerAccStats[player.id] = {
        player,
        championships: 0,
        secondPlaces: 0,
        thirdPlaces: 0,
        fastestLaps: 0,
        bestAverages: 0,
        totalScore: 0,
        vrCircuits: [],
        prCircuits: [],
        circuitWins: {}
      };
    });

    // Process completed games - NEW SYSTEM: Award points based on championship position
    gameHistory.forEach((game, gameIndex) => {
      if (game.state && game.state.playerStats) {
        // Get standings sorted by total score
        const standings = Object.entries(game.state.playerStats)
          .map(([playerId, stats]) => ({
            playerId,
            totalScore: (stats as PlayerStats).totalScore || 0
          }))
          .sort((a, b) => b.totalScore - a.totalScore)
          .filter(s => s.totalScore > 0); // Only count players with points

        // Award points based on position: 10, 8, 6, 4, 3, 2, 1, 0...
        const positionPoints = [10, 8, 6, 4, 3, 2, 1];
        standings.forEach((standing, index) => {
          if (playerAccStats[standing.playerId]) {
            const points = positionPoints[index] || 0;
            playerAccStats[standing.playerId].totalScore += points;

            // Count podium positions
            if (index === 0) {
              playerAccStats[standing.playerId].championships++;
            } else if (index === 1) {
              playerAccStats[standing.playerId].secondPlaces++;
            } else if (index === 2) {
              playerAccStats[standing.playerId].thirdPlaces++;
            }
          }
        });

        // Count circuit wins for each player in this championship
        if (game.state.circuitResults && Array.isArray(game.state.circuitResults)) {
          game.state.circuitResults.forEach((circuitResult: any, circuitIndex: number) => {
            if (circuitResult.turns && Array.isArray(circuitResult.turns)) {
              const circuitPoints: Record<string, number> = {};

              circuitResult.turns.forEach((turn: any) => {
                if (Array.isArray(turn)) {
                  turn.forEach((playerData: any) => {
                    if (!circuitPoints[playerData.playerId]) {
                      circuitPoints[playerData.playerId] = 0;
                    }
                    circuitPoints[playerData.playerId] += playerData.turnScore || 0;
                  });
                }
              });

              const circuitWinner = Object.entries(circuitPoints)
                .reduce((winner, [playerId, points]) =>
                  points > winner.points ? { playerId, points } : winner
                , { playerId: '', points: 0 });

              if (circuitWinner.playerId && circuitWinner.points > 0 && playerAccStats[circuitWinner.playerId]) {
                const circuitName = game.state.circuits[circuitIndex]?.name || `Circuit ${circuitIndex + 1}`;
                if (!playerAccStats[circuitWinner.playerId].circuitWins[circuitName]) {
                  playerAccStats[circuitWinner.playerId].circuitWins[circuitName] = 0;
                }
                playerAccStats[circuitWinner.playerId].circuitWins[circuitName]++;
              }
            }
          });
        }

      }
    });

    // Count VR and PR from sessionBestTimes in each filtered game
    // This respects the cutoff date filter applied to gameHistory
    gameHistory.forEach((game) => {
      if (game.state && game.state.sessionBestTimes) {
        const sessionBestTimes = game.state.sessionBestTimes as Record<string, {
          bestLapPlayerId?: string;
          bestAveragePlayerId?: string;
        }>;

        Object.entries(sessionBestTimes).forEach(([circuitId, circuitBest]) => {
          // Find circuit name
          const circuitName = game.state.circuits?.find((c: any) => c.id === circuitId)?.name || circuitId;

          // VR: Count fastest lap records from this game's session
          if (circuitBest.bestLapPlayerId && playerAccStats[circuitBest.bestLapPlayerId]) {
            playerAccStats[circuitBest.bestLapPlayerId].fastestLaps++;
            if (!playerAccStats[circuitBest.bestLapPlayerId].vrCircuits.includes(circuitName)) {
              playerAccStats[circuitBest.bestLapPlayerId].vrCircuits.push(circuitName);
            }
          }

          // PR: Count best average records from this game's session
          if (circuitBest.bestAveragePlayerId && playerAccStats[circuitBest.bestAveragePlayerId]) {
            playerAccStats[circuitBest.bestAveragePlayerId].bestAverages++;
            if (!playerAccStats[circuitBest.bestAveragePlayerId].prCircuits.includes(circuitName)) {
              playerAccStats[circuitBest.bestAveragePlayerId].prCircuits.push(circuitName);
            }
          }
        });
      }
    });

    // NEW SYSTEM: Rank by totalScore with tiebreakers
    const rankedStats = Object.values(playerAccStats)
      // Filter: only show players who participated in championships
      .filter(stats => stats.totalScore > 0)
      .sort((a, b) => {
        // Primary: Total points
        if (b.totalScore !== a.totalScore) {
          return b.totalScore - a.totalScore;
        }
        // Tiebreaker 1: Most championships (1st places)
        if (b.championships !== a.championships) {
          return b.championships - a.championships;
        }
        // Tiebreaker 2: Most second places
        if (b.secondPlaces !== a.secondPlaces) {
          return b.secondPlaces - a.secondPlaces;
        }
        // Tiebreaker 3: Most third places
        return b.thirdPlaces - a.thirdPlaces;
      });

    return {
      accumulatedStats: rankedStats
    };
  }, [gameHistory, gameState, players, circuits]);

  // Get top 3 for podium
  const podiumPlayers = accumulatedStats.slice(0, 3);
  const [first, second, third] = podiumPlayers;

  // Safety check for empty data
  if (accumulatedStats.length === 0) {
    return (
      <div className="min-h-screen pb-20" style={{ backgroundColor: '#1A1A1A' }}>
        <div className="max-w-4xl mx-auto px-4 pt-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">HALL OF FAME</h1>
          </div>
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-white mb-2">No hay datos disponibles</h2>
            <p className="text-zinc-400">Aún no se han registrado campeonatos</p>
          </div>
        </div>
      </div>
    );
  }

  // Filter tournaments with participants
  const tournamentsWithData = tournaments?.filter(t =>
    t.participants && t.participants.length > 0 &&
    (t.status === 'COMPLETED' || t.status === 'ACTIVE')
  ) || [];

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#1A1A1A' }}>
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        {/* Hall of Fame Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">HALL OF FAME</h1>
          {cutoffDate && activeTab === 'general' && (
            <div className="inline-flex items-center gap-2 bg-purple-900/30 border border-purple-600/50 rounded-md px-3 py-1.5 mt-2">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-purple-300 text-sm">
                Desde: {formatShortDateEC(cutoffDate.toISOString())}
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 justify-center">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-6 py-2 rounded-lg font-semibold text-sm transition-colors ${
              activeTab === 'general'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            GENERAL
          </button>
          <button
            onClick={() => setActiveTab('torneos')}
            className={`px-6 py-2 rounded-lg font-semibold text-sm transition-colors ${
              activeTab === 'torneos'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            TORNEOS {tournamentsWithData.length > 0 && `(${tournamentsWithData.length})`}
          </button>
        </div>

        {/* TORNEOS Tab Content */}
        {activeTab === 'torneos' && (
          <div className="space-y-4">
            {tournamentsWithData.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🏆</div>
                <h2 className="text-xl font-bold text-white mb-2">No hay torneos registrados</h2>
                <p className="text-zinc-400">Los torneos aparecerán aquí cuando se creen y tengan participantes</p>
              </div>
            ) : (
              tournamentsWithData.map(tournament => {
                const sortedParticipants = [...tournament.participants]
                  .sort((a, b) => b.totalPoints - a.totalPoints);
                const topThree = sortedParticipants.slice(0, 3);
                const leader = sortedParticipants[0];
                const totalChampionships = tournament.participants.reduce(
                  (sum, p) => sum + (p.championshipsPlayed || 0), 0
                ) / Math.max(tournament.participants.length, 1);
                const completedChampionships = Math.round(totalChampionships);

                // Calculate gap to leader for second place
                const gapToLeader = topThree[1] && leader
                  ? leader.totalPoints - topThree[1].totalPoints
                  : 0;

                // === KPI CALCULATIONS ===
                // Use tournament's own games (includes ACTIVE games for live KPIs)
                const tournamentGames = ((tournament as any).games || [])
                  .filter((g: any) => g.gameMode === 'tournament' && g.state);

                // Helper: format ms to mm:ss.xxx
                const formatTime = (ms: number | null | undefined): string => {
                  if (!ms || ms <= 0) return '—';
                  const m = Math.floor(ms / 60000);
                  const s = Math.floor((ms % 60000) / 1000);
                  const x = ms % 1000;
                  return `${m}:${s.toString().padStart(2, '0')}.${x.toString().padStart(3, '0')}`;
                };

                // Helper: get participant by playerId
                const getParticipant = (playerId: string) =>
                  tournament.participants.find(p => p.playerId === playerId);
                const getPlayerName = (playerId: string) =>
                  getParticipant(playerId)?.player?.name || 'Jugador';

                // KPI 1: Player with most VR (best laps) across tournament
                const vrCounts: Record<string, number> = {};
                tournamentGames.forEach((game: any) => {
                  const stats = game.state?.playerStats || {};
                  Object.entries(stats).forEach(([pid, s]: [string, any]) => {
                    vrCounts[pid] = (vrCounts[pid] || 0) + (s.bestLaps || 0);
                  });
                });
                const vrLeader = Object.entries(vrCounts)
                  .filter(([pid]) => getParticipant(pid))
                  .sort((a, b) => b[1] - a[1])[0];

                // KPI 1b: Player with most PR (best averages)
                const prCounts: Record<string, number> = {};
                tournamentGames.forEach((game: any) => {
                  const stats = game.state?.playerStats || {};
                  Object.entries(stats).forEach(([pid, s]: [string, any]) => {
                    prCounts[pid] = (prCounts[pid] || 0) + (s.bestAverages || 0);
                  });
                });
                const prLeader = Object.entries(prCounts)
                  .filter(([pid]) => getParticipant(pid))
                  .sort((a, b) => b[1] - a[1])[0];

                // KPI 2: Largest time gap in a single circuit
                let biggestGap: { circuitName: string; gap: number; leaderName: string; lastName: string; leaderTime: number; lastTime: number } | null = null;
                tournamentGames.forEach((game: any) => {
                  const circuits = game.state?.settings?.circuits || [];
                  const circuitResults = game.state?.circuitResults || [];
                  circuits.forEach((circuit: any) => {
                    const results = circuitResults.find((r: any) => r.circuitId === circuit.id);
                    if (!results) return;
                    // Aggregate avg per player across all turns of that circuit
                    const playerAvgs: Record<string, { sum: number; count: number }> = {};
                    results.turns.forEach((turn: any[]) => {
                      turn.forEach((tr: any) => {
                        if (tr.averageTime && tr.averageTime > 0) {
                          if (!playerAvgs[tr.playerId]) playerAvgs[tr.playerId] = { sum: 0, count: 0 };
                          playerAvgs[tr.playerId].sum += tr.averageTime;
                          playerAvgs[tr.playerId].count += 1;
                        }
                      });
                    });
                    const avgs = Object.entries(playerAvgs)
                      .filter(([, v]) => v.count > 0)
                      .map(([pid, v]) => ({ playerId: pid, avg: v.sum / v.count }));
                    if (avgs.length < 2) return;
                    avgs.sort((a, b) => a.avg - b.avg);
                    const best = avgs[0];
                    const worst = avgs[avgs.length - 1];
                    const gap = worst.avg - best.avg;
                    if (!biggestGap || gap > biggestGap.gap) {
                      biggestGap = {
                        circuitName: circuit.name,
                        gap,
                        leaderName: getPlayerName(best.playerId),
                        lastName: getPlayerName(worst.playerId),
                        leaderTime: best.avg,
                        lastTime: worst.avg
                      };
                    }
                  });
                });

                // KPI 3: Best circuit per player (where they scored most points)
                const playerCircuitScores: Record<string, Record<string, { name: string; score: number }>> = {};
                tournamentGames.forEach((game: any) => {
                  const circuits = game.state?.settings?.circuits || [];
                  const circuitResults = game.state?.circuitResults || [];
                  circuits.forEach((circuit: any) => {
                    const results = circuitResults.find((r: any) => r.circuitId === circuit.id);
                    if (!results) return;
                    results.turns.forEach((turn: any[]) => {
                      turn.forEach((tr: any) => {
                        if (!playerCircuitScores[tr.playerId]) playerCircuitScores[tr.playerId] = {};
                        if (!playerCircuitScores[tr.playerId][circuit.id]) {
                          playerCircuitScores[tr.playerId][circuit.id] = { name: circuit.name, score: 0 };
                        }
                        playerCircuitScores[tr.playerId][circuit.id].score += (tr.turnScore || 0);
                      });
                    });
                  });
                });
                const bestCircuitPerPlayer = sortedParticipants
                  .map(p => {
                    const scores = playerCircuitScores[p.playerId] || {};
                    const best = Object.values(scores).sort((a, b) => b.score - a.score)[0];
                    return best && best.score > 0 ? { player: p, circuitName: best.name, points: best.score } : null;
                  })
                  .filter((x): x is NonNullable<typeof x> => x !== null);

                // KPI 4: Remaining circuits with their VR/PR holders
                const playedSet = new Set(tournament.playedCircuitIds);
                const remainingCircuits = (circuits || [])
                  .filter(c => !playedSet.has(c.id))
                  .map(c => {
                    const vrHolder = c.bestLapHolderId
                      ? players.find(p => p.id === c.bestLapHolderId)?.name
                      : null;
                    const prHolder = c.bestAverageHolderId
                      ? players.find(p => p.id === c.bestAverageHolderId)?.name
                      : null;
                    return {
                      id: c.id,
                      name: c.name,
                      vrHolder,
                      prHolder,
                      bestLap: c.historicalBestLap,
                      bestAvg: c.historicalBestAverage
                    };
                  });

                // KPI 5: Fastest single lap recorded in tournament
                let fastestLap: { circuitName: string; time: number; playerName: string } | null = null;
                let bestAverageRecord: { circuitName: string; time: number; playerName: string } | null = null;
                tournamentGames.forEach((game: any) => {
                  const sbt = game.state?.sessionBestTimes || {};
                  const circuits = game.state?.settings?.circuits || [];
                  Object.entries(sbt).forEach(([cid, bests]: [string, any]) => {
                    const circuit = circuits.find((c: any) => c.id === cid);
                    if (bests?.bestLap && bests?.bestLapPlayerId) {
                      if (!fastestLap || bests.bestLap < fastestLap.time) {
                        fastestLap = {
                          circuitName: circuit?.name || cid,
                          time: bests.bestLap,
                          playerName: getPlayerName(bests.bestLapPlayerId)
                        };
                      }
                    }
                    if (bests?.bestAverage && bests?.bestAveragePlayerId) {
                      if (!bestAverageRecord || bests.bestAverage < bestAverageRecord.time) {
                        bestAverageRecord = {
                          circuitName: circuit?.name || cid,
                          time: bests.bestAverage,
                          playerName: getPlayerName(bests.bestAveragePlayerId)
                        };
                      }
                    }
                  });
                });

                // KPI 6: Closest championship (smallest gap between 1st and 2nd in a single game)
                let closestChampionship: { gap: number; winnerName: string; secondName: string } | null = null;
                tournamentGames.forEach((game: any) => {
                  const stats = game.state?.playerStats || {};
                  const sorted = Object.entries(stats)
                    .map(([pid, s]: [string, any]) => ({ pid, score: s.totalScore || 0 }))
                    .sort((a, b) => b.score - a.score);
                  if (sorted.length >= 2 && sorted[0].score > 0) {
                    const gap = sorted[0].score - sorted[1].score;
                    if (!closestChampionship || gap < closestChampionship.gap) {
                      closestChampionship = {
                        gap,
                        winnerName: getPlayerName(sorted[0].pid),
                        secondName: getPlayerName(sorted[1].pid)
                      };
                    }
                  }
                });

                return (
                  <div
                    key={tournament.id}
                    className="rounded-xl border border-zinc-800 overflow-hidden"
                    style={{ backgroundColor: '#1A1A1A' }}
                  >
                    {/* Tournament Header */}
                    <div className={`relative px-5 py-4 ${
                      tournament.status === 'ACTIVE'
                        ? 'bg-gradient-to-r from-red-900/50 via-red-800/20 to-zinc-900 border-b border-red-800/50'
                        : 'bg-gradient-to-r from-zinc-800 to-zinc-900 border-b border-zinc-700'
                    }`}>
                      {tournament.status === 'ACTIVE' && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-600" />
                      )}
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold text-white tracking-tight">{tournament.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-zinc-400 text-xs font-mono uppercase tracking-wider">
                              {tournament.playedCircuitIds.length} CIRCUITOS
                            </span>
                            {tournament.endDate && (
                              <>
                                <span className="text-zinc-600">•</span>
                                <span className="text-zinc-400 text-xs">{formatShortDateEC(tournament.endDate)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                          tournament.status === 'ACTIVE'
                            ? 'bg-red-600 text-white'
                            : 'bg-zinc-700 text-zinc-300'
                        }`}>
                          {tournament.status === 'ACTIVE' && (
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          )}
                          {tournament.status === 'ACTIVE' ? 'EN CURSO' : 'COMPLETADO'}
                        </span>
                      </div>
                    </div>

                    {/* F1 Modern Podium */}
                    <div className="px-4 pt-8 pb-4 bg-gradient-to-b from-zinc-900/30 to-transparent">
                      <div className="flex justify-center items-end gap-2 sm:gap-4 mb-2">
                        {/* 2nd Place */}
                        {topThree[1] && (
                          <div className="flex flex-col items-center flex-1 max-w-[120px]">
                            <div className="relative mb-2">
                              <UserAvatar
                                imageUrl={topThree[1].player?.imageUrl || ''}
                                name={topThree[1].player?.name || 'Jugador'}
                                className="w-16 h-16 sm:w-18 sm:h-18 ring-2 ring-zinc-400 shadow-lg"
                              />
                              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-zinc-300 rounded-full flex items-center justify-center text-black font-bold text-sm border-2 border-zinc-900">
                                2
                              </div>
                            </div>
                            <div className="text-white text-sm font-bold truncate w-full text-center">
                              {topThree[1].player?.name || 'Jugador'}
                            </div>
                            <div className="font-mono font-black text-zinc-300 text-xl mt-1 leading-none">
                              {topThree[1].totalPoints}
                            </div>
                            <div className="text-zinc-500 text-[10px] uppercase tracking-wider">PTS</div>
                            {/* Podium platform */}
                            <div className="w-full mt-2 h-12 rounded-t-md bg-gradient-to-b from-zinc-500 to-zinc-700 flex items-center justify-center shadow-inner">
                              <span className="text-zinc-900 font-black text-2xl">2</span>
                            </div>
                          </div>
                        )}

                        {/* 1st Place - Center & Larger */}
                        {topThree[0] && (
                          <div className="flex flex-col items-center flex-1 max-w-[140px]">
                            {/* Crown / Star */}
                            <div className="text-yellow-400 text-2xl mb-1 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">
                              ★
                            </div>
                            <div className="relative mb-2">
                              <UserAvatar
                                imageUrl={topThree[0].player?.imageUrl || ''}
                                name={topThree[0].player?.name || 'Jugador'}
                                className="w-20 h-20 sm:w-24 sm:h-24 ring-4 ring-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]"
                              />
                              <div className="absolute -bottom-1 -right-1 w-9 h-9 bg-yellow-400 rounded-full flex items-center justify-center text-black font-black text-base border-2 border-zinc-900 shadow-lg">
                                1
                              </div>
                            </div>
                            <div className="text-white text-base font-black truncate w-full text-center">
                              {topThree[0].player?.name || 'Jugador'}
                            </div>
                            <div className="font-mono font-black text-yellow-400 text-3xl mt-1 leading-none drop-shadow-[0_0_12px_rgba(250,204,21,0.4)]">
                              {topThree[0].totalPoints}
                            </div>
                            <div className="text-yellow-500/70 text-xs uppercase tracking-wider font-bold">PTS</div>
                            {/* Podium platform - tallest */}
                            <div className="w-full mt-2 h-16 rounded-t-md bg-gradient-to-b from-yellow-400 to-yellow-600 flex items-center justify-center shadow-inner relative overflow-hidden">
                              <span className="text-yellow-900 font-black text-3xl">1</span>
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                            </div>
                          </div>
                        )}

                        {/* 3rd Place */}
                        {topThree[2] && (
                          <div className="flex flex-col items-center flex-1 max-w-[120px]">
                            <div className="relative mb-2">
                              <UserAvatar
                                imageUrl={topThree[2].player?.imageUrl || ''}
                                name={topThree[2].player?.name || 'Jugador'}
                                className="w-16 h-16 sm:w-18 sm:h-18 ring-2 ring-orange-600 shadow-lg"
                              />
                              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-zinc-900">
                                3
                              </div>
                            </div>
                            <div className="text-white text-sm font-bold truncate w-full text-center">
                              {topThree[2].player?.name || 'Jugador'}
                            </div>
                            <div className="font-mono font-black text-orange-500 text-xl mt-1 leading-none">
                              {topThree[2].totalPoints}
                            </div>
                            <div className="text-zinc-500 text-[10px] uppercase tracking-wider">PTS</div>
                            {/* Podium platform - shortest */}
                            <div className="w-full mt-2 h-8 rounded-t-md bg-gradient-to-b from-orange-600 to-orange-800 flex items-center justify-center shadow-inner">
                              <span className="text-orange-100 font-black text-xl">3</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Tournament Highlights / Motivational stats */}
                      {leader && (
                        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-zinc-800">
                          <div className="text-center">
                            <div className="font-mono font-bold text-yellow-400 text-lg">
                              {leader.championshipsWon || 0}
                            </div>
                            <div className="text-zinc-500 text-[10px] uppercase tracking-wider">
                              Victorias 1°
                            </div>
                          </div>
                          <div className="text-center border-x border-zinc-800">
                            <div className="font-mono font-bold text-white text-lg">
                              {gapToLeader > 0 ? `+${gapToLeader}` : '—'}
                            </div>
                            <div className="text-zinc-500 text-[10px] uppercase tracking-wider">
                              Brecha al 2°
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="font-mono font-bold text-red-500 text-lg">
                              {tournament.participants.length}
                            </div>
                            <div className="text-zinc-500 text-[10px] uppercase tracking-wider">
                              Pilotos
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Full Standings Table - Always visible */}
                    <div className="border-t border-zinc-800 bg-zinc-950/40">
                      <div className="px-4 py-3 flex items-center justify-between bg-zinc-900/50">
                        <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
                          Clasificación
                        </h4>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600">
                          Todos los pilotos
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-zinc-900/30">
                              <th className="px-2 py-2 text-center text-[10px] font-mono uppercase tracking-wider text-zinc-500">POS</th>
                              <th className="px-2 py-2 text-left text-[10px] font-mono uppercase tracking-wider text-zinc-500">PILOTO</th>
                              <th className="px-2 py-2 text-center text-[10px] font-mono uppercase tracking-wider text-zinc-500">PTS</th>
                              <th className="px-2 py-2 text-center text-[10px] font-mono uppercase tracking-wider text-zinc-500">1°</th>
                              <th className="px-2 py-2 text-center text-[10px] font-mono uppercase tracking-wider text-zinc-500">2°</th>
                              <th className="px-2 py-2 text-center text-[10px] font-mono uppercase tracking-wider text-zinc-500">3°</th>
                              <th className="px-2 py-2 text-center text-[10px] font-mono uppercase tracking-wider text-zinc-500">CAR</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedParticipants.map((participant, index) => (
                              <tr
                                key={participant.id}
                                className={`border-t border-zinc-800/50 ${
                                  index === 0 ? 'bg-yellow-500/5' : ''
                                }`}
                              >
                                <td className="px-2 py-2.5 text-center">
                                  <span className={`font-mono font-bold text-sm ${
                                    index === 0 ? 'text-yellow-400' :
                                    index === 1 ? 'text-zinc-300' :
                                    index === 2 ? 'text-orange-500' : 'text-zinc-500'
                                  }`}>
                                    {index + 1}
                                  </span>
                                </td>
                                <td className="px-2 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <UserAvatar
                                      imageUrl={participant.player?.imageUrl || ''}
                                      name={participant.player?.name || 'Jugador'}
                                      className="w-7 h-7"
                                    />
                                    <span className="text-white font-semibold text-sm truncate">
                                      {participant.player?.name || 'Jugador'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-2 py-2.5 text-center">
                                  <span className={`font-mono font-bold text-base ${
                                    index === 0 ? 'text-yellow-400' : 'text-white'
                                  }`}>
                                    {participant.totalPoints}
                                  </span>
                                </td>
                                <td className="px-2 py-2.5 text-center">
                                  <span className="font-mono font-bold text-yellow-500 text-sm">
                                    {participant.championshipsWon || 0}
                                  </span>
                                </td>
                                <td className="px-2 py-2.5 text-center">
                                  <span className="font-mono text-zinc-400 text-sm">
                                    {participant.championshipsSecond || 0}
                                  </span>
                                </td>
                                <td className="px-2 py-2.5 text-center">
                                  <span className="font-mono text-orange-500 text-sm">
                                    {participant.championshipsThird || 0}
                                  </span>
                                </td>
                                <td className="px-2 py-2.5 text-center">
                                  <span className="font-mono text-zinc-500 text-sm">
                                    {participant.championshipsPlayed || 0}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* === KPI Section === */}
                    {tournamentGames.length > 0 && (
                      <div className="border-t border-zinc-800 p-4 space-y-4 bg-gradient-to-b from-zinc-950/40 to-transparent">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-mono uppercase tracking-widest text-red-500 font-bold">
                            ESTADÍSTICAS DEL TORNEO
                          </h4>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600">
                            {tournamentGames.length} campeonato{tournamentGames.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Top KPI Cards Row */}
                        <div className="grid grid-cols-2 gap-2">
                          {/* Fastest Lap of Tournament */}
                          {fastestLap && (
                            <div className="rounded-lg border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-zinc-900 p-3">
                              <div className="text-[10px] font-mono uppercase tracking-wider text-yellow-500 font-bold mb-1">
                                ⚡ VUELTA MÁS RÁPIDA
                              </div>
                              <div className="font-mono font-black text-white text-base">
                                {formatTime((fastestLap as any).time)}
                              </div>
                              <div className="text-zinc-300 text-xs font-semibold mt-0.5">
                                {(fastestLap as any).playerName}
                              </div>
                              <div className="text-zinc-500 text-[10px] mt-0.5">
                                {(fastestLap as any).circuitName}
                              </div>
                            </div>
                          )}

                          {/* Best Average of Tournament */}
                          {bestAverageRecord && (
                            <div className="rounded-lg border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-zinc-900 p-3">
                              <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold mb-1">
                                🎯 MEJOR PROMEDIO
                              </div>
                              <div className="font-mono font-black text-white text-base">
                                {formatTime((bestAverageRecord as any).time)}
                              </div>
                              <div className="text-zinc-300 text-xs font-semibold mt-0.5">
                                {(bestAverageRecord as any).playerName}
                              </div>
                              <div className="text-zinc-500 text-[10px] mt-0.5">
                                {(bestAverageRecord as any).circuitName}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* VR / PR Leaders */}
                        <div className="grid grid-cols-2 gap-2">
                          {vrLeader && vrLeader[1] > 0 && (
                            <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-3">
                              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold mb-1">
                                REY DE LA VR
                              </div>
                              <div className="text-white text-sm font-bold truncate">
                                {getPlayerName(vrLeader[0])}
                              </div>
                              <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="font-mono font-black text-yellow-400 text-2xl leading-none">
                                  {vrLeader[1]}
                                </span>
                                <span className="text-zinc-500 text-[10px] uppercase tracking-wider">
                                  vueltas rápidas
                                </span>
                              </div>
                            </div>
                          )}

                          {prLeader && prLeader[1] > 0 && (
                            <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-3">
                              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold mb-1">
                                REY DEL PR
                              </div>
                              <div className="text-white text-sm font-bold truncate">
                                {getPlayerName(prLeader[0])}
                              </div>
                              <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="font-mono font-black text-cyan-400 text-2xl leading-none">
                                  {prLeader[1]}
                                </span>
                                <span className="text-zinc-500 text-[10px] uppercase tracking-wider">
                                  mejores promedios
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Biggest Gap & Closest Championship */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {biggestGap && (
                            <div className="rounded-lg border border-red-500/30 bg-gradient-to-br from-red-500/10 to-zinc-900 p-3">
                              <div className="text-[10px] font-mono uppercase tracking-wider text-red-400 font-bold mb-1">
                                MAYOR DIFERENCIA
                              </div>
                              <div className="font-mono font-black text-red-400 text-xl leading-none">
                                +{((biggestGap as any).gap / 1000).toFixed(2)}s
                              </div>
                              <div className="text-zinc-300 text-xs mt-1">
                                <span className="text-yellow-400 font-bold">{(biggestGap as any).leaderName}</span>
                                <span className="text-zinc-600"> vs </span>
                                <span className="text-zinc-400">{(biggestGap as any).lastName}</span>
                              </div>
                              <div className="text-zinc-500 text-[10px] mt-0.5">
                                {(biggestGap as any).circuitName}
                              </div>
                            </div>
                          )}

                          {closestChampionship && (closestChampionship as any).gap >= 0 && (
                            <div className="rounded-lg border border-green-500/30 bg-gradient-to-br from-green-500/10 to-zinc-900 p-3">
                              <div className="text-[10px] font-mono uppercase tracking-wider text-green-400 font-bold mb-1">
                                CAMPEONATO MÁS REÑIDO
                              </div>
                              <div className="font-mono font-black text-green-400 text-xl leading-none">
                                {(closestChampionship as any).gap === 0 ? 'EMPATE' : `${(closestChampionship as any).gap} pts`}
                              </div>
                              <div className="text-zinc-300 text-xs mt-1">
                                <span className="text-yellow-400 font-bold">{(closestChampionship as any).winnerName}</span>
                                <span className="text-zinc-600"> sobre </span>
                                <span className="text-zinc-400">{(closestChampionship as any).secondName}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Best Circuit per Player */}
                        {bestCircuitPerPlayer.length > 0 && (
                          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                            <div className="px-3 py-2 bg-zinc-900/60 border-b border-zinc-800">
                              <h5 className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                                CIRCUITO FAVORITO POR PILOTO
                              </h5>
                            </div>
                            <div className="divide-y divide-zinc-800/50">
                              {bestCircuitPerPlayer.map((entry, idx) => (
                                <div key={entry.player.id} className="flex items-center justify-between px-3 py-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-mono font-bold text-zinc-500 text-xs w-4 flex-shrink-0">
                                      {idx + 1}
                                    </span>
                                    <UserAvatar
                                      imageUrl={entry.player.player?.imageUrl || ''}
                                      name={entry.player.player?.name || 'Jugador'}
                                      className="w-6 h-6 flex-shrink-0"
                                    />
                                    <span className="text-white font-semibold text-xs truncate">
                                      {entry.player.player?.name}
                                    </span>
                                  </div>
                                  <div className="text-right flex items-center gap-2 flex-shrink-0">
                                    <span className="text-zinc-300 text-xs">{entry.circuitName}</span>
                                    <span className="font-mono font-bold text-yellow-400 text-sm w-8 text-right">
                                      {entry.points}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Remaining Circuits */}
                        {tournament.status === 'ACTIVE' && remainingCircuits.length > 0 && (
                          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                            <div className="px-3 py-2 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between">
                              <h5 className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                                CIRCUITOS PENDIENTES
                              </h5>
                              <span className="text-[10px] font-mono text-red-400 font-bold">
                                {remainingCircuits.length}
                              </span>
                            </div>
                            <div className="divide-y divide-zinc-800/50 max-h-64 overflow-y-auto">
                              {remainingCircuits.map(circuit => (
                                <div key={circuit.id} className="px-3 py-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-white font-semibold text-xs">{circuit.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-[10px]">
                                    {circuit.vrHolder ? (
                                      <div className="flex items-center gap-1">
                                        <span className="text-yellow-500 font-bold">VR:</span>
                                        <span className="text-zinc-300">{circuit.vrHolder}</span>
                                        {circuit.bestLap && (
                                          <span className="font-mono text-zinc-500">{formatTime(circuit.bestLap)}</span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-zinc-600">VR: —</span>
                                    )}
                                    {circuit.prHolder ? (
                                      <div className="flex items-center gap-1">
                                        <span className="text-cyan-500 font-bold">PR:</span>
                                        <span className="text-zinc-300">{circuit.prHolder}</span>
                                        {circuit.bestAvg && (
                                          <span className="font-mono text-zinc-500">{formatTime(circuit.bestAvg)}</span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-zinc-600">PR: —</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* GENERAL Tab Content */}
        {activeTab === 'general' && (
          <>

        {/* Podium Cards */}
        <div className="flex justify-center items-end gap-4 mb-8">
          {/* Second Place - Left */}
          {second && (
            <div 
              className="relative rounded-lg border border-zinc-700 p-4 text-center"
              style={{ backgroundColor: '#242424', minHeight: '140px', width: '100px' }}
            >
              {/* Position Badge */}
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-zinc-400 rounded-full flex items-center justify-center z-10 border-2 border-zinc-800">
                <span className="font-mono font-bold text-sm text-black">2</span>
              </div>
              <div className="relative inline-block">
                <UserAvatar
                  imageUrl={second.player.imageUrl}
                  name={second.player.name}
                  className="w-16 h-16 mx-auto mb-2 ring-2 ring-f1-red"
                />
              </div>
              <h3 className="text-white font-semibold text-sm">{second.player.name}</h3>
            </div>
          )}

          {/* First Place - Center (Larger) */}
          {first && (
            <div 
              className="relative rounded-lg border border-zinc-600 p-6 text-center"
              style={{ backgroundColor: '#242424', minHeight: '160px', width: '120px' }}
            >
              {/* Position Badge */}
              <div className="absolute -top-3 -right-3 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center z-10 border-2 border-zinc-800 shadow-lg">
                <span className="font-mono font-bold text-base text-black">1</span>
              </div>
              <div className="relative inline-block">
                <UserAvatar
                  imageUrl={first.player.imageUrl}
                  name={first.player.name}
                  className="w-20 h-20 mx-auto mb-3 ring-2 ring-f1-red"
                />
              </div>
              <h3 className="text-white font-bold text-base">{first.player.name}</h3>
            </div>
          )}

          {/* Third Place - Right */}
          {third && (
            <div 
              className="relative rounded-lg border border-zinc-700 p-4 text-center"
              style={{ backgroundColor: '#242424', minHeight: '140px', width: '100px' }}
            >
              {/* Position Badge */}
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center z-10 border-2 border-zinc-800">
                <span className="font-mono font-bold text-sm text-white">3</span>
              </div>
              <div className="relative inline-block">
                <UserAvatar
                  imageUrl={third.player.imageUrl}
                  name={third.player.name}
                  className="w-16 h-16 mx-auto mb-2 ring-2 ring-f1-red"
                />
              </div>
              <h3 className="text-white font-semibold text-sm">{third.player.name}</h3>
            </div>
          )}
        </div>

        {/* Statistics Table */}
        <div className="rounded-lg border border-zinc-800 mb-6" style={{ backgroundColor: '#242424' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#2A2A2A' }}>
                  <th className="px-1 py-2 text-center text-xs font-mono uppercase tracking-wider text-zinc-400">POS</th>
                  <th className="px-2 py-2 text-left text-xs font-mono uppercase tracking-wider text-zinc-400">JUGADOR</th>
                  <th className="px-2 py-2 text-center text-xs font-mono uppercase tracking-wider text-zinc-400">
                    <button
                      onClick={() => setShowPtsExplanation(true)}
                      className="inline-flex items-center gap-1 hover:text-white transition-colors"
                    >
                      PTS
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-mono uppercase tracking-wider text-zinc-400">1°</th>
                  <th className="px-2 py-2 text-center text-xs font-mono uppercase tracking-wider text-zinc-400">2°</th>
                  <th className="px-2 py-2 text-center text-xs font-mono uppercase tracking-wider text-zinc-400">3°</th>
                </tr>
              </thead>
              <tbody>
                {accumulatedStats.map((stats, index) => (
                  <tr key={stats.player.id} className="border-t border-zinc-800">
                    <td className="px-1 py-3 text-center">
                      <span className={`font-mono font-bold text-sm
                        ${index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-zinc-400' :
                          index === 2 ? 'text-orange-600' :
                          'text-zinc-300'}
                      `}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <div className="text-white font-semibold text-base">
                        {stats.player.name}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="font-mono font-bold text-yellow-400 text-lg">
                        {stats.totalScore}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="font-mono font-bold text-yellow-500 text-base">
                        {stats.championships}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="font-mono font-bold text-zinc-400 text-base">
                        {stats.secondPlaces}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="font-mono font-bold text-orange-600 text-base">
                        {stats.thirdPlaces}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Record Cards - VR, PR and Circuit Domination */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Fastest Laps Card */}
          {(() => {
            const topVR = accumulatedStats
              .filter(s => s.fastestLaps > 0)
              .sort((a, b) => b.fastestLaps - a.fastestLaps)
              .slice(0, 3);

            return topVR.length > 0 ? (
              <div
                className="rounded-lg border border-zinc-800 p-4"
                style={{ backgroundColor: '#242424' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-bold text-white">VUELTAS RÁPIDAS</h3>
                </div>
                <div className="space-y-2">
                  {topVR.map((stats, index) => (
                    <button
                      key={stats.player.id}
                      onClick={() => setShowVRModal(true)}
                      className="w-full flex items-center justify-between hover:bg-zinc-800 p-2 rounded transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold text-sm
                          ${index === 0 ? 'text-yellow-500' :
                            index === 1 ? 'text-zinc-400' :
                            'text-orange-600'}
                        `}>
                          {index + 1}°
                        </span>
                        <span className="text-white font-semibold text-sm">{stats.player.name}</span>
                      </div>
                      <span className="font-mono font-bold text-yellow-400 text-lg">
                        {stats.fastestLaps}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          {/* Best Averages Card */}
          {(() => {
            const topPR = accumulatedStats
              .filter(s => s.bestAverages > 0)
              .sort((a, b) => b.bestAverages - a.bestAverages)
              .slice(0, 3);

            return topPR.length > 0 ? (
              <div className="rounded-lg border border-zinc-800 p-4" style={{ backgroundColor: '#242424' }}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-bold text-white">PROMEDIOS</h3>
                </div>
                <div className="space-y-2">
                  {topPR.map((stats, index) => (
                    <button
                      key={stats.player.id}
                      onClick={() => setShowPRModal(true)}
                      className="w-full flex items-center justify-between hover:bg-zinc-800 p-2 rounded transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold text-sm ${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-zinc-400' :
                          'text-orange-600'
                        }`}>
                          {index + 1}°
                        </span>
                        <span className="text-white font-semibold text-sm">{stats.player.name}</span>
                      </div>
                      <span className="font-mono font-bold text-yellow-400 text-lg">
                        {stats.bestAverages}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          {/* Circuit Domination Card */}
          {(() => {
            // Get top 3 players by total circuit wins
            const topCircuitPlayers = accumulatedStats
              .filter(s => Object.keys(s.circuitWins).length > 0)
              .map(stats => {
                const totalWins = Object.values(stats.circuitWins).reduce((sum, wins) => sum + wins, 0);
                // Get most won circuit - if tie, take the last one (most recent)
                const mostWonCircuit = Object.entries(stats.circuitWins)
                  .sort(([, a], [, b]) => {
                    if (b !== a) return b - a;
                    // If tie, the last one in the array is the most recent
                    return 1;
                  })[0];

                return {
                  ...stats,
                  totalWins,
                  topCircuit: mostWonCircuit ? mostWonCircuit[0] : '',
                  topCircuitWins: mostWonCircuit ? mostWonCircuit[1] : 0
                };
              })
              .sort((a, b) => b.totalWins - a.totalWins)
              .slice(0, 3);

            return topCircuitPlayers.length > 0 ? (
              <button
                onClick={() => setShowCircuitDominationModal(true)}
                className="rounded-lg border border-zinc-800 p-4 hover:border-yellow-400 transition-colors cursor-pointer text-left"
                style={{ backgroundColor: '#242424' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-2xl">🏆</div>
                  <h3 className="text-lg font-bold text-white">TOP CIRCUITOS</h3>
                </div>
                <div className="space-y-2">
                  {topCircuitPlayers.map((stats, index) => (
                    <div key={stats.player.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold text-sm ${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-zinc-400' :
                          'text-orange-600'
                        }`}>
                          {index + 1}°
                        </span>
                        <div>
                          <div className="text-white font-semibold text-sm">{stats.player.name}</div>
                          <div className="text-zinc-400 text-xs">{stats.topCircuit}</div>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-yellow-400 text-sm">
                        {stats.totalWins}
                      </span>
                    </div>
                  ))}
                </div>
              </button>
            ) : null;
          })()}
        </div>
        </>
        )}
      </div>

      {/* PTS Explanation Modal */}
      {showPtsExplanation && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-lg p-6 max-w-md w-full border border-zinc-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Cálculo de PTS</h3>
              <button
                onClick={() => setShowPtsExplanation(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-zinc-400 mb-4">
              Los puntos del Hall of Fame se otorgan según la posición final en cada campeonato:
            </p>

            <div className="bg-zinc-800 rounded-lg p-4 mb-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-zinc-300">
                  <span className="flex items-center gap-2">
                    <span className="text-yellow-500 font-bold">1°</span>
                    <span>Campeón</span>
                  </span>
                  <span className="font-mono text-yellow-400 font-bold">10 pts</span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span className="flex items-center gap-2">
                    <span className="text-zinc-400 font-bold">2°</span>
                    <span>Subcampeón</span>
                  </span>
                  <span className="font-mono text-yellow-400 font-bold">8 pts</span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span className="flex items-center gap-2">
                    <span className="text-orange-600 font-bold">3°</span>
                    <span>Tercer lugar</span>
                  </span>
                  <span className="font-mono text-yellow-400 font-bold">6 pts</span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span>4° lugar</span>
                  <span className="font-mono text-yellow-400">4 pts</span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span>5° lugar</span>
                  <span className="font-mono text-yellow-400">3 pts</span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span>6° lugar</span>
                  <span className="font-mono text-yellow-400">2 pts</span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span>7° lugar</span>
                  <span className="font-mono text-yellow-400">1 pt</span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span>8° en adelante</span>
                  <span className="font-mono text-zinc-500">0 pts</span>
                </div>
              </div>
            </div>

            <p className="text-zinc-400 text-sm mb-4">
              Los puntos se acumulan a lo largo de todos los campeonatos completados.
            </p>

            <button
              onClick={() => setShowPtsExplanation(false)}
              className="w-full mt-2 bg-zinc-700 hover:bg-zinc-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              ENTENDIDO
            </button>
          </div>
        </div>
      )}

      {/* VR Modal */}
      {showVRModal && (() => {
        const vrStats = accumulatedStats
          .filter(s => s.fastestLaps > 0)
          .sort((a, b) => b.fastestLaps - a.fastestLaps);

        return (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-lg p-6 max-w-2xl w-full border border-zinc-700 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="text-2xl">⚡</div>
                  <h3 className="text-xl font-bold text-white">Vueltas Rápidas por Circuito</h3>
                </div>
                <button
                  onClick={() => setShowVRModal(false)}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {vrStats.map((stats, index) => (
                  <div key={stats.player.id} className="bg-zinc-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          imageUrl={stats.player.imageUrl}
                          name={stats.player.name}
                          className="w-10 h-10"
                        />
                        <div>
                          <div className="text-white font-semibold">{stats.player.name}</div>
                          <div className="text-zinc-400 text-sm">{stats.fastestLaps} vueltas rápidas</div>
                        </div>
                      </div>
                      <span className={`font-mono font-bold text-xl
                        ${index === 0 ? 'text-yellow-400' : 'text-zinc-400'}
                      `}>
                        {stats.fastestLaps}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {stats.vrCircuits.map((circuit) => (
                        <span
                          key={circuit}
                          className="px-2 py-1 bg-zinc-700 rounded text-zinc-300 text-xs"
                        >
                          {circuit}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowVRModal(false)}
                className="w-full mt-4 bg-zinc-700 hover:bg-zinc-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                CERRAR
              </button>
            </div>
          </div>
        );
      })()}

      {/* PR Modal */}
      {showPRModal && (() => {
        const prStats = accumulatedStats
          .filter(s => s.bestAverages > 0)
          .sort((a, b) => b.bestAverages - a.bestAverages);

        return (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-lg p-6 max-w-2xl w-full border border-zinc-700 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="text-2xl">🎯</div>
                  <h3 className="text-xl font-bold text-white">Mejores Promedios por Circuito</h3>
                </div>
                <button
                  onClick={() => setShowPRModal(false)}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {prStats.map((stats, index) => (
                  <div key={stats.player.id} className="bg-zinc-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          imageUrl={stats.player.imageUrl}
                          name={stats.player.name}
                          className="w-10 h-10"
                        />
                        <div>
                          <div className="text-white font-semibold">{stats.player.name}</div>
                          <div className="text-zinc-400 text-sm">{stats.bestAverages} mejores promedios</div>
                        </div>
                      </div>
                      <span className={`font-mono font-bold text-xl
                        ${index === 0 ? 'text-yellow-400' : 'text-zinc-400'}
                      `}>
                        {stats.bestAverages}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {stats.prCircuits.map((circuit) => (
                        <span
                          key={circuit}
                          className="px-2 py-1 bg-zinc-700 rounded text-zinc-300 text-xs"
                        >
                          {circuit}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowPRModal(false)}
                className="w-full mt-4 bg-zinc-700 hover:bg-zinc-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                CERRAR
              </button>
            </div>
          </div>
        );
      })()}

      {/* Circuit Domination Modal */}
      {showCircuitDominationModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-lg p-6 max-w-2xl w-full border border-zinc-700 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="text-2xl">🏆</div>
                <h3 className="text-xl font-bold text-white">Top Circuitos</h3>
              </div>
              <button
                onClick={() => setShowCircuitDominationModal(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {accumulatedStats
                .filter(s => Object.keys(s.circuitWins).length > 0)
                .map((stats) => (
                  <div key={stats.player.id} className="bg-zinc-800 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <UserAvatar
                        imageUrl={stats.player.imageUrl}
                        name={stats.player.name}
                        className="w-10 h-10"
                      />
                      <div className="text-white font-semibold">{stats.player.name}</div>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(stats.circuitWins)
                        .sort(([, a], [, b]) => b - a)
                        .map(([circuit, wins]) => (
                          <div key={circuit} className="flex items-center justify-between">
                            <span className="text-zinc-300 text-sm">{circuit}</span>
                            <span className="font-mono font-bold text-yellow-400">
                              {wins} {wins === 1 ? 'victoria' : 'victorias'}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
            </div>

            <button
              onClick={() => setShowCircuitDominationModal(false)}
              className="w-full mt-4 bg-zinc-700 hover:bg-zinc-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              CERRAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default F1HallOfFame;