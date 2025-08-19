import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Get all lap times saved
    const lapTimes = await prisma.individualLapTime.findMany({
      orderBy: [
        { circuitId: 'asc' },
        { playerId: 'asc' },
        { turnNumber: 'asc' },
        { lapNumber: 'asc' }
      ]
    });

    // Get all players and circuits for lookup
    const players = await prisma.player.findMany();
    const circuits = await prisma.circuit.findMany();

    const playersMap = new Map(players.map(p => [p.id, p]));
    const circuitsMap = new Map(circuits.map(c => [c.id, c]));

    // Get active game state
    const activeGame = await prisma.game.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate session bests from game state
    let sessionBests = null;
    if (activeGame && activeGame.state) {
      sessionBests = (activeGame.state as any).sessionBestTimes;
    }

    res.status(200).json({
      message: 'Database verification complete',
      data: {
        totalLapTimesSaved: lapTimes.length,
        lapTimes: lapTimes.map(lt => ({
          id: lt.id,
          playerName: playersMap.get(lt.playerId)?.name || 'Unknown',
          circuitName: circuitsMap.get(lt.circuitId)?.name || 'Unknown',
          turnNumber: lt.turnNumber,
          lapNumber: lt.lapNumber,
          timeMs: lt.timeMs,
          formattedTime: formatTime(lt.timeMs),
          isSaved: lt.isSaved,
          createdAt: lt.createdAt,
          updatedAt: lt.updatedAt
        })),
        circuits: circuits.map(c => ({
          id: c.id,
          name: c.name,
          historicalBestLap: c.historicalBestLap ? {
            time: c.historicalBestLap,
            formatted: formatTime(c.historicalBestLap),
            holder: playersMap.get(c.bestLapHolderId || '')?.name || 'Unknown',
            date: c.historicalBestLapDate
          } : null,
          historicalBestAverage: c.historicalBestAverage ? {
            time: c.historicalBestAverage,
            formatted: formatTime(c.historicalBestAverage),
            holder: playersMap.get(c.bestAverageHolderId || '')?.name || 'Unknown',
            date: c.historicalBestAverageDate
          } : null
        })),
        sessionBests,
        activeGameId: activeGame?.id || null
      }
    });

  } catch (error) {
    console.error('Error verifying database:', error);
    res.status(500).json({ error: 'Failed to verify database records' });
  }
}

function formatTime(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || ms === 0) return '-:--.---';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}