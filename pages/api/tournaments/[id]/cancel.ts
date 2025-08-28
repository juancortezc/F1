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
    if (confirmation !== 'CANCELAR') {
      return res.status(400).json({
        success: false,
        error: 'Debes escribir exactamente "CANCELAR" para confirmar'
      });
    }

    // Get tournament with championships
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        championships: true,
        participants: true
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
        error: 'Solo se pueden cancelar torneos activos'
      });
    }

    console.log(`[Cancel API] Cancelling tournament ${id} - current status: ${tournament.status}`);
    
    // Cancel the tournament - set to CANCELLED status
    const cancelledTournament = await prisma.tournament.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        endDate: new Date()
      },
      include: {
        championships: true,
        participants: true
      }
    });
    
    console.log(`[Cancel API] Tournament ${id} cancelled - new status: ${cancelledTournament.status}`);

    return res.status(200).json({
      success: true,
      message: 'Torneo cancelado exitosamente',
      tournament: cancelledTournament
    });

  } catch (error: any) {
    console.error('Cancel tournament API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
}