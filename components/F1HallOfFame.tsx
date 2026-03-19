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
  fastestLaps: number;      // VR: Récords de vuelta rápida por circuito
  bestAverages: number;     // PR: Récords de promedio por circuito
  totalScore: number;       // Puntos acumulados por posiciones en campeonatos
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

  // State for showing PTS explanation modal
  const [showPtsExplanation, setShowPtsExplanation] = useState(false);

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
        fastestLaps: 0,
        bestAverages: 0,
        totalScore: 0
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

            // Still count championships won for display
            if (index === 0) {
              playerAccStats[standing.playerId].championships++;
            }
          }
        });

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

        Object.values(sessionBestTimes).forEach((circuitBest) => {
          // VR: Count fastest lap records from this game's session
          if (circuitBest.bestLapPlayerId && playerAccStats[circuitBest.bestLapPlayerId]) {
            playerAccStats[circuitBest.bestLapPlayerId].fastestLaps++;
          }

          // PR: Count best average records from this game's session
          if (circuitBest.bestAveragePlayerId && playerAccStats[circuitBest.bestAveragePlayerId]) {
            playerAccStats[circuitBest.bestAveragePlayerId].bestAverages++;
          }
        });
      }
    });

    // NEW SYSTEM: Rank by totalScore (championship position points only)
    const rankedStats = Object.values(playerAccStats)
      // Filter: only show players who participated in championships
      .filter(stats => stats.totalScore > 0)
      .sort((a, b) => b.totalScore - a.totalScore);

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
                  <th className="px-2 py-2 text-center text-xs font-mono uppercase tracking-wider text-zinc-400">CMP</th>
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
                      <span className="font-mono font-bold text-white text-base">
                        {stats.championships}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Record Cards - VR and PR */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Fastest Laps Card */}
          {(() => {
            const topVR = accumulatedStats
              .filter(s => s.fastestLaps > 0)
              .sort((a, b) => b.fastestLaps - a.fastestLaps)
              .slice(0, 1)[0];

            return topVR ? (
              <div className="rounded-lg border border-zinc-800 p-4" style={{ backgroundColor: '#242424' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-2xl">⚡</div>
                  <h3 className="text-lg font-bold text-white">MÁS VUELTAS RÁPIDAS</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      imageUrl={topVR.player.imageUrl}
                      name={topVR.player.name}
                      className="w-12 h-12"
                    />
                    <span className="text-white font-semibold text-base">{topVR.player.name}</span>
                  </div>
                  <span className="font-mono font-bold text-yellow-400 text-2xl">
                    {topVR.fastestLaps}
                  </span>
                </div>
              </div>
            ) : null;
          })()}

          {/* Best Averages Card */}
          {(() => {
            const topPR = accumulatedStats
              .filter(s => s.bestAverages > 0)
              .sort((a, b) => b.bestAverages - a.bestAverages)
              .slice(0, 1)[0];

            return topPR ? (
              <div className="rounded-lg border border-zinc-800 p-4" style={{ backgroundColor: '#242424' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-2xl">🎯</div>
                  <h3 className="text-lg font-bold text-white">MÁS MEJORES PROMEDIOS</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      imageUrl={topPR.player.imageUrl}
                      name={topPR.player.name}
                      className="w-12 h-12"
                    />
                    <span className="text-white font-semibold text-base">{topPR.player.name}</span>
                  </div>
                  <span className="font-mono font-bold text-yellow-400 text-2xl">
                    {topPR.bestAverages}
                  </span>
                </div>
              </div>
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
    </div>
  );
};

export default F1HallOfFame;