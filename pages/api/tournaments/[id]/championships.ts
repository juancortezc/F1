import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Tournament ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, id);
      case 'POST':
        return await handlePost(req, res, id);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('Tournament championships API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
}

// GET /api/tournaments/[id]/championships - Get championships for tournament
async function handleGet(req: NextApiRequest, res: NextApiResponse, tournamentId: string) {
  const championships = await prisma.championship.findMany({
    where: { tournamentId },
    orderBy: { position: 'asc' }
  });

  return res.status(200).json({
    success: true,
    championships
  });
}

// POST /api/tournaments/[id]/championships - Create new championship in tournament
async function handlePost(req: NextApiRequest, res: NextApiResponse, tournamentId: string) {
  const { name, gameState } = req.body;

  // Validate tournament exists and is active
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      championships: {
        orderBy: { position: 'desc' },
        take: 1
      }
    }
  });

  if (!tournament) {
    return res.status(404).json({
      success: false,
      error: 'Tournament not found'
    });
  }

  if (tournament.status !== 'ACTIVE') {
    return res.status(400).json({
      success: false,
      error: 'Cannot add championships to inactive tournament'
    });
  }

  // Check if tournament has completed all circuits (tournament is done)
  // NOTE: This API is DEPRECATED - use /api/game/create with tournamentId instead
  const totalCircuits = await prisma.circuit.count();
  const playedCircuitsCount = tournament.playedCircuitIds?.length || 0;

  if (playedCircuitsCount >= totalCircuits) {
    return res.status(400).json({
      success: false,
      error: 'Tournament has completed all circuits'
    });
  }

  // Check if there's an active championship
  const activeChampionship = await prisma.championship.findFirst({
    where: {
      tournamentId,
      status: 'ACTIVE'
    }
  });

  if (activeChampionship) {
    return res.status(400).json({
      success: false,
      error: 'There is already an active championship in this tournament'
    });
  }

  // Calculate position for new championship
  const nextPosition = (tournament.championships[0]?.position || 0) + 1;

  // Generate name if not provided
  const championshipName = name || `Campeonato ${nextPosition}`;

  // Create new championship
  const championship = await prisma.championship.create({
    data: {
      tournamentId,
      name: championshipName,
      gameState,
      position: nextPosition,
      status: 'ACTIVE'
    }
  });

  return res.status(201).json({
    success: true,
    championship
  });
}