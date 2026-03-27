import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Tournament ID is required' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    // Get tournament with played circuits
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        playedCircuitIds: true,
      }
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Get all circuits
    const allCircuits = await prisma.circuit.findMany({
      orderBy: { name: 'asc' }
    });

    // Separate circuits into available and played
    const availableCircuits = allCircuits.filter(
      circuit => !tournament.playedCircuitIds.includes(circuit.id)
    );

    const playedCircuits = allCircuits.filter(
      circuit => tournament.playedCircuitIds.includes(circuit.id)
    );

    return res.status(200).json({
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      tournamentStatus: tournament.status,
      totalCircuits: allCircuits.length,
      availableCount: availableCircuits.length,
      playedCount: playedCircuits.length,
      availableCircuits,
      playedCircuits,
      isComplete: availableCircuits.length === 0,
    });

  } catch (error: any) {
    console.error('Available circuits API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
}
