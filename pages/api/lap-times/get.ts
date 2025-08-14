import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { gameId, playerId, circuitId, turnNumber } = req.query;

    // Validate required query parameters
    if (!gameId || !playerId || !circuitId || !turnNumber) {
      return res.status(400).json({ error: 'Missing required query parameters: gameId, playerId, circuitId, turnNumber' });
    }

    // Get all lap times for this specific turn
    const lapTimes = await prisma.individualLapTime.findMany({
      where: {
        gameId: gameId as string,
        playerId: playerId as string,
        circuitId: circuitId as string,
        turnNumber: parseInt(turnNumber as string)
      },
      orderBy: {
        lapNumber: 'asc'
      }
    });

    // Get turn completion status
    const turnCompletion = await prisma.turnCompletion.findUnique({
      where: {
        gameId_playerId_circuitId_turnNumber: {
          gameId: gameId as string,
          playerId: playerId as string,
          circuitId: circuitId as string,
          turnNumber: parseInt(turnNumber as string)
        }
      }
    });

    // Format response with lap times organized by lap number
    const formattedLapTimes: Record<number, { timeMs: number; isSaved: boolean }> = {};
    
    lapTimes.forEach(lapTime => {
      formattedLapTimes[lapTime.lapNumber] = {
        timeMs: lapTime.timeMs,
        isSaved: lapTime.isSaved
      };
    });

    res.status(200).json({
      success: true,
      data: {
        gameId: gameId as string,
        playerId: playerId as string,
        circuitId: circuitId as string,
        turnNumber: parseInt(turnNumber as string),
        lapTimes: formattedLapTimes,
        turnCompletion: turnCompletion ? {
          averageTimeMs: turnCompletion.averageTimeMs,
          turnScore: turnCompletion.turnScore,
          isCompleted: turnCompletion.isCompleted,
          completedAt: turnCompletion.completedAt
        } : null
      }
    });

  } catch (error) {
    console.error('Error retrieving lap times:', error);
    res.status(500).json({ error: 'Failed to retrieve lap times' });
  }
}