import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

interface CompleteTurnRequest {
  gameId: string;
  playerId: string;
  circuitId: string;
  turnNumber: number;
  useBest4Of5?: boolean; // For 5-lap turns
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { gameId, playerId, circuitId, turnNumber, useBest4Of5 = false }: CompleteTurnRequest = req.body;

    // Validate required fields
    if (!gameId || !playerId || !circuitId || turnNumber === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get all lap times for this turn
    const lapTimes = await prisma.individualLapTime.findMany({
      where: {
        gameId,
        playerId,
        circuitId,
        turnNumber
      },
      orderBy: {
        lapNumber: 'asc'
      }
    });

    if (lapTimes.length === 0) {
      return res.status(400).json({ error: 'No lap times found for this turn' });
    }

    // Calculate average time
    let timesToAverage = lapTimes.map(lap => lap.timeMs);
    
    // If using best 4 of 5 and we have 5 laps, remove the slowest
    if (useBest4Of5 && timesToAverage.length === 5) {
      timesToAverage.sort((a, b) => a - b);
      timesToAverage = timesToAverage.slice(0, 4); // Keep fastest 4
    }

    const averageTimeMs = Math.round(timesToAverage.reduce((sum, time) => sum + time, 0) / timesToAverage.length);

    // For now, we'll set turnScore to 0 - this will be calculated by the main game logic
    // when the turn is officially submitted via the existing race endpoint
    const turnScore = 0;

    // Update turn completion
    const turnCompletion = await prisma.turnCompletion.upsert({
      where: {
        gameId_playerId_circuitId_turnNumber: {
          gameId,
          playerId,
          circuitId,
          turnNumber
        }
      },
      update: {
        averageTimeMs,
        turnScore,
        isCompleted: true,
        completedAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        gameId,
        playerId,
        circuitId,
        turnNumber,
        averageTimeMs,
        turnScore,
        isCompleted: true,
        completedAt: new Date()
      }
    });

    res.status(200).json({
      success: true,
      data: {
        turnCompletion: {
          id: turnCompletion.id,
          gameId: turnCompletion.gameId,
          playerId: turnCompletion.playerId,
          circuitId: turnCompletion.circuitId,
          turnNumber: turnCompletion.turnNumber,
          averageTimeMs: turnCompletion.averageTimeMs,
          turnScore: turnCompletion.turnScore,
          isCompleted: turnCompletion.isCompleted,
          completedAt: turnCompletion.completedAt
        },
        lapTimes: lapTimes.map(lap => ({
          lapNumber: lap.lapNumber,
          timeMs: lap.timeMs,
          used: useBest4Of5 && lapTimes.length === 5 ? 
            timesToAverage.includes(lap.timeMs) : true
        })),
        calculatedAverage: averageTimeMs,
        lapsUsed: timesToAverage.length,
        totalLaps: lapTimes.length
      }
    });

  } catch (error) {
    console.error('Error completing turn:', error);
    res.status(500).json({ error: 'Failed to complete turn' });
  }
}