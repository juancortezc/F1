import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Tournament ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, id);
      case 'PUT':
        return await handlePut(req, res, id);
      case 'DELETE':
        return await handleDelete(req, res, id);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
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

// GET /api/tournaments/[id] - Get specific tournament
async function handleGet(req: NextApiRequest, res: NextApiResponse, id: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      championships: {
        orderBy: { position: 'asc' }
      },
      participants: {
        orderBy: { totalPoints: 'desc' }
      }
    }
  });

  if (!tournament) {
    return res.status(404).json({
      success: false,
      error: 'Tournament not found'
    });
  }

  return res.status(200).json({
    success: true,
    tournament
  });
}

// PUT /api/tournaments/[id] - Update tournament
async function handlePut(req: NextApiRequest, res: NextApiResponse, id: string) {
  const {
    name,
    description,
    status,
    maxChampionships,
    pointsForFirst,
    pointsForSecond,
    pointsForThird,
    endDate
  } = req.body;

  // Validate tournament exists
  const existingTournament = await prisma.tournament.findUnique({
    where: { id },
    include: { championships: true }
  });

  if (!existingTournament) {
    return res.status(404).json({
      success: false,
      error: 'Tournament not found'
    });
  }

  // If completing tournament, validate all championships are complete
  if (status === 'COMPLETED') {
    const incompleteChampionships = existingTournament.championships.filter(
      (c: any) => c.status !== 'COMPLETED'
    );

    if (incompleteChampionships.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot complete tournament with incomplete championships'
      });
    }
  }

  const tournament = await prisma.tournament.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() }),
      ...(status && { status }),
      ...(maxChampionships && { maxChampionships }),
      ...(pointsForFirst !== undefined && { pointsForFirst }),
      ...(pointsForSecond !== undefined && { pointsForSecond }),
      ...(pointsForThird !== undefined && { pointsForThird }),
      ...(status === 'COMPLETED' && { endDate: endDate || new Date() })
    },
    include: {
      championships: true,
      participants: {
        orderBy: { totalPoints: 'desc' }
      }
    }
  });

  return res.status(200).json({
    success: true,
    tournament
  });
}

// DELETE /api/tournaments/[id] - Delete tournament
async function handleDelete(req: NextApiRequest, res: NextApiResponse, id: string) {
  // Check if tournament exists and has championships
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      championships: true,
      _count: { select: { championships: true } }
    }
  });

  if (!tournament) {
    return res.status(404).json({
      success: false,
      error: 'Tournament not found'
    });
  }

  // Prevent deletion if tournament has completed championships
  const completedChampionships = tournament.championships.filter((c: any) => c.status === 'COMPLETED');
  if (completedChampionships.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete tournament with completed championships'
    });
  }

  // Delete tournament (cascade will handle participants and championships)
  await prisma.tournament.delete({
    where: { id }
  });

  return res.status(200).json({
    success: true,
    message: 'Tournament deleted successfully'
  });
}