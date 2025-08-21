import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { gameId } = req.query;
    
    // Build where clause
    const where: any = {
      timeMs: {
        gt: 0 // Only valid times
      }
    };
    
    // Filter by gameId if provided
    if (gameId) {
      where.gameId = gameId as string;
    }
    
    // Get lap times (filtered by game if specified)
    const lapTimes = await prisma.individualLapTime.findMany({
      where,
      orderBy: [
        { createdAt: 'desc' }
      ],
      take: 1000 // Limit to last 1000 lap times for performance
    });

    // Get all circuits for name lookup
    const circuits = await prisma.circuit.findMany({
      select: {
        id: true,
        name: true
      }
    });

    // Create circuit lookup map
    const circuitMap = circuits.reduce((map, circuit) => {
      map[circuit.id] = circuit.name;
      return map;
    }, {} as Record<string, string>);

    // Combine data
    const enrichedLapTimes = lapTimes.map(lap => ({
      ...lap,
      circuit: {
        name: circuitMap[lap.circuitId] || 'Unknown Circuit'
      }
    }));

    res.status(200).json({
      success: true,
      data: enrichedLapTimes
    });

  } catch (error) {
    console.error('Error fetching all lap times:', error);
    res.status(500).json({ error: 'Failed to fetch lap times' });
  }
}