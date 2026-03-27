import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    // Get active tournament with full details
    const activeTournament = await prisma.tournament.findFirst({
      where: { status: 'ACTIVE' },
      include: {
        games: {
          where: { gameMode: 'tournament' },
          orderBy: { position: 'asc' }
        },
        participants: {
          orderBy: { totalPoints: 'desc' },
          include: {
            player: true
          }
        },
        _count: {
          select: {
            games: true,
            participants: true
          }
        }
      }
    });

    if (!activeTournament) {
      // Return 200 with null tournament instead of 404
      // This allows the frontend to handle "no active tournament" gracefully
      return res.status(200).json({
        success: true,
        tournament: null
      });
    }

    // Get total circuits for progress calculation
    const totalCircuits = await prisma.circuit.count();
    const playedCircuitsCount = activeTournament.playedCircuitIds?.length || 0;

    // Calculate tournament progress based on circuits played
    const tournamentData = {
      ...activeTournament,
      progress: {
        circuitsPlayed: playedCircuitsCount,
        totalCircuits: totalCircuits,
        percentage: Math.round((playedCircuitsCount / totalCircuits) * 100)
      }
    };

    return res.status(200).json({
      success: true,
      tournament: tournamentData
    });

  } catch (error: any) {
    console.error('Active tournament API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
}
