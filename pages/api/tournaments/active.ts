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
        championships: {
          orderBy: { position: 'asc' }
        },
        participants: {
          orderBy: { totalPoints: 'desc' }
        },
        _count: {
          select: {
            championships: true,
            participants: true
          }
        }
      }
    });

    if (!activeTournament) {
      return res.status(404).json({
        success: false,
        error: 'No active tournament found'
      });
    }

    // Calculate tournament progress
    const completedChampionships = activeTournament.championships.filter(
      (c: any) => c.status === 'COMPLETED'
    ).length;

    const tournamentData = {
      ...activeTournament,
      progress: {
        completed: completedChampionships,
        total: activeTournament.maxChampionships,
        percentage: Math.round((completedChampionships / activeTournament.maxChampionships) * 100)
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