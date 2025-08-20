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
    // Validate tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        championships: {
          where: { status: 'COMPLETED' },
          orderBy: { position: 'asc' }
        },
        participants: {
          orderBy: [
            { totalPoints: 'desc' },
            { championshipsWon: 'desc' },
            { championshipsSecond: 'desc' },
            { championshipsThird: 'desc' }
          ]
        }
      }
    });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    // Get player details for participants
    const playerIds = tournament.participants.map((p: any) => p.playerId);
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } }
    });

    // Combine participant data with player info
    const standings = tournament.participants.map((participant: any, index: number) => {
      const player = players.find((p: any) => p.id === participant.playerId);
      
      return {
        position: index + 1,
        player: {
          id: player?.id,
          name: player?.name,
          imageUrl: player?.imageUrl
        },
        totalPoints: participant.totalPoints,
        championshipsWon: participant.championshipsWon,
        championshipsSecond: participant.championshipsSecond,
        championshipsThird: participant.championshipsThird,
        championshipsTotal: participant.championshipsTotal,
        // Calculate championship participation percentage
        participationRate: tournament.championships.length > 0 
          ? Math.round((participant.championshipsTotal / tournament.championships.length) * 100)
          : 0
      };
    });

    // Tournament summary stats
    const summary = {
      totalChampionships: tournament.championships.length,
      completedChampionships: tournament.championships.filter((c: any) => c.status === 'COMPLETED').length,
      totalParticipants: tournament.participants.length,
      averagePointsPerChampionship: tournament.championships.length > 0
        ? Math.round(
            tournament.participants.reduce((sum: number, p: any) => sum + p.totalPoints, 0) /
            tournament.championships.length
          ) / tournament.participants.length || 0
        : 0
    };

    return res.status(200).json({
      success: true,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        description: tournament.description,
        status: tournament.status,
        maxChampionships: tournament.maxChampionships,
        pointsForFirst: tournament.pointsForFirst,
        pointsForSecond: tournament.pointsForSecond,
        pointsForThird: tournament.pointsForThird,
        startDate: tournament.startDate,
        endDate: tournament.endDate
      },
      standings,
      summary,
      championships: tournament.championships.map((c: any) => ({
        id: c.id,
        name: c.name,
        position: c.position,
        status: c.status,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      }))
    });

  } catch (error: any) {
    console.error('Tournament standings API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
}