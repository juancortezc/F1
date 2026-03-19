import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { GameState, Player, Circuit, GameHistoryEntry, PlayerStats } from '../types';
import UserAvatar from './UserAvatar';
import { fetcher } from '../lib/fetcher';
import { formatShortDateEC } from '../utils/dateUtils';

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

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#1A1A1A' }}>
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        {/* Hall of Fame Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">HALL OF FAME</h1>
          {cutoffDate && (
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