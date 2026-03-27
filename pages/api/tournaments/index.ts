import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('Tournament API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
}

// GET /api/tournaments - Get all tournaments
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { status } = req.query;

  const tournaments = await prisma.tournament.findMany({
    where: status ? { status: status as string } : undefined,
    include: {
      championships: {
        orderBy: { position: 'asc' }
      },
      participants: {
        include: {
          player: true // Include player data for display
        },
        orderBy: { totalPoints: 'desc' }
      },
      games: {
        select: { id: true, status: true, position: true }
      },
      _count: {
        select: {
          championships: true,
          participants: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`[Tournaments API] Returning ${tournaments.length} tournaments`);
  tournaments.forEach(t => {
    console.log(`- ${t.name}: status=${t.status}`);
  });
  
  return res.status(200).json({
    success: true,
    tournaments
  });
}

// POST /api/tournaments - Create new tournament
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const {
    name,
    description,
    pointsForFirst = 3,
    pointsForSecond = 2,
    pointsForThird = 1,
    participantIds = []
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Tournament name is required'
    });
  }

  // Check if there's already an active tournament
  const activeTournament = await prisma.tournament.findFirst({
    where: { status: 'ACTIVE' }
  });

  if (activeTournament) {
    return res.status(400).json({
      success: false,
      error: 'There is already an active tournament. Complete it before creating a new one.'
    });
  }

  // Create tournament with participants
  // NOTE: Tournament now ends when all circuits are played (tracked via playedCircuitIds)
  const tournament = await prisma.tournament.create({
    data: {
      name: name.trim(),
      description: description?.trim(),
      pointsForFirst,
      pointsForSecond,
      pointsForThird,
      playedCircuitIds: [],
      participants: {
        create: participantIds.map((playerId: string) => ({
          playerId,
          totalPoints: 0
        }))
      }
    },
    include: {
      games: true,
      participants: {
        include: {
          player: true
        }
      }
    }
  });

  return res.status(201).json({
    success: true,
    tournament
  });
}