import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Tournament ID is required' });
  }

  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { confirmation } = req.body;

    // Require exact confirmation
    if (confirmation !== 'TERMINAR') {
      return res.status(400).json({
        success: false,
        error: 'Debes escribir exactamente "TERMINAR" para confirmar'
      });
    }

    // Get tournament with championships and participants
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
            { championshipsSecond: 'desc' }
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

    if (tournament.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden completar torneos activos'
      });
    }

    if (tournament.championships.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede completar un torneo sin campeonatos completados'
      });
    }

    // Force complete the tournament
    const completedTournament = await prisma.tournament.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endDate: new Date()
      },
      include: {
        championships: {
          where: { status: 'COMPLETED' },
          orderBy: { position: 'asc' }
        },
        participants: {
          orderBy: [
            { totalPoints: 'desc' },
            { championshipsWon: 'desc' },
            { championshipsSecond: 'desc' }
          ]
        }
      }
    });

    // Get the winner
    const winner = completedTournament.participants[0];

    return res.status(200).json({
      success: true,
      message: `Torneo completado exitosamente. ${tournament.championships.length} campeonatos disputados.`,
      tournament: completedTournament,
      winner: winner ? {
        id: winner.playerId,
        totalPoints: winner.totalPoints,
        championshipsWon: winner.championshipsWon,
        championshipsTotal: winner.championshipsTotal
      } : null,
      championshipsCompleted: tournament.championships.length,
      totalChampionships: tournament.maxChampionships
    });

  } catch (error: any) {
    console.error('Complete tournament API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
}