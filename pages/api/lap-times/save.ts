import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

interface SaveLapTimeRequest {
  gameId: string;
  playerId: string;
  circuitId: string;
  turnNumber: number;
  lapNumber: number; // 1-5
  timeMs: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { gameId, playerId, circuitId, turnNumber, lapNumber, timeMs }: SaveLapTimeRequest = req.body;

    // Validate required fields
    if (!gameId || !playerId || !circuitId || turnNumber === undefined || lapNumber === undefined || timeMs === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate lap number (1-5)
    if (lapNumber < 1 || lapNumber > 5) {
      return res.status(400).json({ error: 'Lap number must be between 1 and 5' });
    }

    // Validate time (must be positive)
    if (timeMs <= 0) {
      return res.status(400).json({ error: 'Time must be a positive number' });
    }

    // Save or update the lap time
    const lapTime = await prisma.individualLapTime.upsert({
      where: {
        gameId_playerId_circuitId_turnNumber_lapNumber: {
          gameId,
          playerId,
          circuitId,
          turnNumber,
          lapNumber
        }
      },
      update: {
        timeMs,
        updatedAt: new Date()
      },
      create: {
        gameId,
        playerId,
        circuitId,
        turnNumber,
        lapNumber,
        timeMs,
        isSaved: true
      }
    });

    // Also update or create turn completion tracking
    await prisma.turnCompletion.upsert({
      where: {
        gameId_playerId_circuitId_turnNumber: {
          gameId,
          playerId,
          circuitId,
          turnNumber
        }
      },
      update: {
        updatedAt: new Date()
      },
      create: {
        gameId,
        playerId,
        circuitId,
        turnNumber,
        isCompleted: false
      }
    });

    res.status(200).json({ 
      success: true, 
      lapTime: {
        id: lapTime.id,
        gameId: lapTime.gameId,
        playerId: lapTime.playerId,
        circuitId: lapTime.circuitId,
        turnNumber: lapTime.turnNumber,
        lapNumber: lapTime.lapNumber,
        timeMs: lapTime.timeMs,
        isSaved: lapTime.isSaved,
        createdAt: lapTime.createdAt,
        updatedAt: lapTime.updatedAt
      }
    });

  } catch (error) {
    console.error('Error saving lap time:', error);
    res.status(500).json({ error: 'Failed to save lap time' });
  }
}