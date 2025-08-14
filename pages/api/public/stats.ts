import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

interface PlayerStats {
  id: string;
  name: string;
  imageUrl: string;
  totalWins: number;
  fastestLaps: number;
  bestAverages: number;
  totalGames: number;
}

interface CircuitRecord {
  circuitId: string;
  circuitName: string;
  circuitImage: string;
  bestLap: number | null;
  bestLapHolder: string | null;
  bestAverage: number | null;
  bestAverageHolder: string | null;
  bestLapDate: Date | null;
  bestAverageDate: Date | null;
}

interface PublicStats {
  totalPlayers: number;
  totalGames: number;
  totalRaces: number;
  leaderboard: PlayerStats[];
  circuitRecords: CircuitRecord[];
  recentChampions: Array<{
    gameId: string;
    winner: string;
    winnerImage: string;
    completedAt: Date;
    circuitsCount: number;
  }>;
}

const formatTime = (ms: number | null): string => {
  if (ms === null || ms === undefined || ms === Infinity || !isFinite(ms)) return '-:--.---';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<PublicStats | { error: string }>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // Get total counts
    const [totalPlayers, totalGames] = await Promise.all([
      prisma.player.count({ where: { isActive: true } }),
      prisma.game.count({ where: { status: 'COMPLETED' } })
    ]);

    // Get player statistics from completed games
    const players = await prisma.player.findMany({
      where: { isActive: true },
      select: { id: true, name: true, imageUrl: true }
    });

    // Get circuit records with player names
    const circuits = await prisma.circuit.findMany({
      select: {
        id: true,
        name: true,
        imageUrl: true,
        historicalBestLap: true,
        historicalBestAverage: true,
        bestLapHolderId: true,
        bestAverageHolderId: true,
        historicalBestLapDate: true,
        historicalBestAverageDate: true
      },
      orderBy: { name: 'asc' }
    });

    // Build circuit records with player names
    const circuitRecords: CircuitRecord[] = await Promise.all(
      circuits.map(async (circuit) => {
        let bestLapHolder = null;
        let bestAverageHolder = null;

        if (circuit.bestLapHolderId) {
          const holder = await prisma.player.findUnique({
            where: { id: circuit.bestLapHolderId },
            select: { name: true }
          });
          bestLapHolder = holder?.name || null;
        }

        if (circuit.bestAverageHolderId) {
          const holder = await prisma.player.findUnique({
            where: { id: circuit.bestAverageHolderId },
            select: { name: true }
          });
          bestAverageHolder = holder?.name || null;
        }

        return {
          circuitId: circuit.id,
          circuitName: circuit.name,
          circuitImage: circuit.imageUrl,
          bestLap: circuit.historicalBestLap,
          bestLapHolder,
          bestAverage: circuit.historicalBestAverage,
          bestAverageHolder,
          bestLapDate: circuit.historicalBestLapDate,
          bestAverageDate: circuit.historicalBestAverageDate
        };
      })
    );

    // Calculate player statistics from game data
    const games = await prisma.game.findMany({
      where: { status: 'COMPLETED' },
      select: { state: true, updatedAt: true }
    });

    // Initialize player stats
    const playerStatsMap = new Map<string, PlayerStats>();
    players.forEach(player => {
      playerStatsMap.set(player.id, {
        id: player.id,
        name: player.name,
        imageUrl: player.imageUrl,
        totalWins: 0,
        fastestLaps: 0,
        bestAverages: 0,
        totalGames: 0
      });
    });

    const recentChampions: Array<{
      gameId: string;
      winner: string;
      winnerImage: string;
      completedAt: Date;
      circuitsCount: number;
    }> = [];

    // Analyze completed games for statistics
    games.forEach(game => {
      try {
        const gameState = game.state as any;
        if (!gameState?.playerStats || !gameState?.settings?.players) return;

        const gamePlayers = gameState.settings.players;
        const playerStats = gameState.playerStats;
        
        // Count total games for each player
        gamePlayers.forEach((player: any) => {
          const stats = playerStatsMap.get(player.id);
          if (stats) {
            stats.totalGames++;
          }
        });

        // Find overall winner (highest total score)
        let overallWinner = null;
        let highestScore = -1;
        
        for (const playerId in playerStats) {
          const score = playerStats[playerId]?.totalScore || 0;
          if (score > highestScore) {
            highestScore = score;
            overallWinner = playerId;
          }
        }

        if (overallWinner) {
          const stats = playerStatsMap.get(overallWinner);
          if (stats) {
            stats.totalWins++;
          }

          // Add to recent champions
          const winnerPlayer = gamePlayers.find((p: any) => p.id === overallWinner);
          if (winnerPlayer) {
            recentChampions.push({
              gameId: `game-${game.updatedAt.getTime()}`,
              winner: winnerPlayer.name,
              winnerImage: winnerPlayer.imageUrl,
              completedAt: game.updatedAt,
              circuitsCount: gameState.settings?.circuits?.length || 0
            });
          }
        }

        // Count fastest laps and best averages
        for (const playerId in playerStats) {
          const stats = playerStatsMap.get(playerId);
          if (stats && playerStats[playerId]) {
            stats.fastestLaps += playerStats[playerId].bestLaps || 0;
            stats.bestAverages += playerStats[playerId].bestAverages || 0;
          }
        }
      } catch (error) {
        console.error('Error processing game stats:', error);
      }
    });

    // Sort leaderboard by total wins, then by fastest laps
    const leaderboard = Array.from(playerStatsMap.values())
      .sort((a, b) => {
        if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
        if (b.fastestLaps !== a.fastestLaps) return b.fastestLaps - a.fastestLaps;
        return b.bestAverages - a.bestAverages;
      })
      .slice(0, 10); // Top 10

    // Sort recent champions by completion date (most recent first)
    recentChampions.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    const topRecentChampions = recentChampions.slice(0, 5);

    const publicStats: PublicStats = {
      totalPlayers,
      totalGames,
      totalRaces: totalGames, // For now, assuming 1 race per game
      leaderboard,
      circuitRecords,
      recentChampions: topRecentChampions
    };

    // Cache headers for better performance
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    
    res.status(200).json(publicStats);
  } catch (error) {
    console.error('Error fetching public stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
}