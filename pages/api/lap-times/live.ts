import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { gameId = 'active-game', circuitId, turnNumber } = req.query;

    // Build where clause
    const where: any = {
      gameId: gameId as string
    };

    if (circuitId) {
      where.circuitId = circuitId as string;
    }

    if (turnNumber) {
      where.turnNumber = parseInt(turnNumber as string);
    }

    // Get all individual lap times for live updates
    const liveLapTimes = await prisma.individualLapTime.findMany({
      where,
      orderBy: [
        { turnNumber: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 50 // Limit to last 50 lap times for performance
    });

    // Get turn completions for progress tracking
    const turnCompletions = await prisma.turnCompletion.findMany({
      where: {
        gameId: gameId as string,
        ...(circuitId && { circuitId: circuitId as string }),
        ...(turnNumber && { turnNumber: parseInt(turnNumber as string) })
      },
      orderBy: [
        { turnNumber: 'desc' },
        { completedAt: 'desc' }
      ]
    });

    // Format response with current turn progress
    const currentTurnProgress = new Map<string, {
      playerId: string;
      lapCount: number;
      latestLap: number | null;
      averageTime: number | null;
      isCompleted: boolean;
    }>();

    // Group by player for current turn tracking
    const currentTurnLaps = liveLapTimes.filter(lap => 
      !turnNumber || lap.turnNumber === parseInt(turnNumber as string)
    );

    currentTurnLaps.forEach(lap => {
      const key = `${lap.playerId}-${lap.turnNumber}`;
      if (!currentTurnProgress.has(key)) {
        currentTurnProgress.set(key, {
          playerId: lap.playerId,
          lapCount: 0,
          latestLap: null,
          averageTime: null,
          isCompleted: false
        });
      }
      
      const progress = currentTurnProgress.get(key)!;
      progress.lapCount++;
      progress.latestLap = lap.timeMs;
    });

    // Add completion data
    turnCompletions.forEach(completion => {
      const key = `${completion.playerId}-${completion.turnNumber}`;
      if (currentTurnProgress.has(key)) {
        const progress = currentTurnProgress.get(key)!;
        progress.averageTime = completion.averageTimeMs;
        progress.isCompleted = completion.isCompleted;
      }
    });

    // Calculate live leaderboards
    const lapLeaderboard = liveLapTimes
      .filter(lap => lap.timeMs > 0)
      .sort((a, b) => a.timeMs - b.timeMs)
      .slice(0, 10)
      .map((lap, index) => ({
        position: index + 1,
        playerId: lap.playerId,
        circuitId: lap.circuitId,
        turnNumber: lap.turnNumber,
        lapNumber: lap.lapNumber,
        timeMs: lap.timeMs,
        timestamp: lap.createdAt
      }));

    res.status(200).json({
      success: true,
      data: {
        liveLapTimes: liveLapTimes.map(lap => ({
          id: lap.id,
          playerId: lap.playerId,
          circuitId: lap.circuitId,
          turnNumber: lap.turnNumber,
          lapNumber: lap.lapNumber,
          timeMs: lap.timeMs,
          timestamp: lap.createdAt
        })),
        currentTurnProgress: Array.from(currentTurnProgress.entries()).map(([key, progress]) => ({
          key,
          ...progress
        })),
        turnCompletions: turnCompletions.map(completion => ({
          playerId: completion.playerId,
          circuitId: completion.circuitId,
          turnNumber: completion.turnNumber,
          averageTimeMs: completion.averageTimeMs,
          turnScore: completion.turnScore,
          isCompleted: completion.isCompleted,
          completedAt: completion.completedAt
        })),
        lapLeaderboard,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching live lap times:', error);
    res.status(500).json({ error: 'Failed to fetch live lap times' });
  }
}