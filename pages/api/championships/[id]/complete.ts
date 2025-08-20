import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

interface GameState {
  playerStats: Record<string, {
    totalScore: number;
    position: number;
    [key: string]: any;
  }>;
  [key: string]: any;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Championship ID is required' });
  }

  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { gameState, finalResults } = req.body;

    // Get championship with tournament info
    const championship = await prisma.championship.findUnique({
      where: { id },
      include: {
        tournament: {
          include: {
            participants: true
          }
        }
      }
    });

    if (!championship) {
      return res.status(404).json({
        success: false,
        error: 'Championship not found'
      });
    }

    if (championship.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: 'Championship is already completed'
      });
    }

    // Extract final positions from gameState or finalResults
    const playerStats = (gameState as GameState)?.playerStats || {};
    const positions = finalResults || Object.entries(playerStats)
      .map(([playerId, stats]) => ({
        playerId,
        position: stats.position,
        totalScore: stats.totalScore
      }))
      .sort((a, b) => a.position - b.position);

    if (positions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No final results provided'
      });
    }

    // Calculate points based on tournament settings
    const tournament = championship.tournament;
    const pointsMap: Record<number, number> = {
      1: tournament.pointsForFirst,
      2: tournament.pointsForSecond,
      3: tournament.pointsForThird
    };

    // Update championship status and store final results
    const updatedChampionship = await prisma.championship.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        gameState: {
          ...(gameState || {}),
          finalResults: positions,
          completedAt: new Date()
        }
      }
    });

    // Update tournament participants' points and stats
    const updatePromises = positions.map(async (result: any) => {
      const points = pointsMap[result.position] || 0;
      
      // Find existing participant
      const participant = tournament.participants.find((p: any) => p.playerId === result.playerId);
      
      if (participant) {
        const updateData: any = {
          totalPoints: { increment: points },
          championshipsTotal: { increment: 1 }
        };

        // Update position-specific counters
        if (result.position === 1) {
          updateData.championshipsWon = { increment: 1 };
        } else if (result.position === 2) {
          updateData.championshipsSecond = { increment: 1 };
        } else if (result.position === 3) {
          updateData.championshipsThird = { increment: 1 };
        }

        return prisma.tournamentParticipant.update({
          where: {
            tournamentId_playerId: {
              tournamentId: tournament.id,
              playerId: result.playerId
            }
          },
          data: updateData
        });
      }
      
      return null;
    });

    await Promise.all(updatePromises);

    // Check if tournament should be completed
    const completedChampionshipsCount = await prisma.championship.count({
      where: {
        tournamentId: tournament.id,
        status: 'COMPLETED'
      }
    });

    let updatedTournament = tournament;
    if (completedChampionshipsCount >= tournament.maxChampionships) {
      updatedTournament = await prisma.tournament.update({
        where: { id: tournament.id },
        data: {
          status: 'COMPLETED',
          endDate: new Date()
        },
        include: {
          participants: true
        }
      });
    }

    // Get updated standings
    const updatedParticipants = await prisma.tournamentParticipant.findMany({
      where: { tournamentId: tournament.id },
      orderBy: [
        { totalPoints: 'desc' },
        { championshipsWon: 'desc' },
        { championshipsSecond: 'desc' }
      ]
    });

    return res.status(200).json({
      success: true,
      championship: updatedChampionship,
      tournament: {
        ...updatedTournament,
        isCompleted: completedChampionshipsCount >= tournament.maxChampionships
      },
      standings: updatedParticipants,
      pointsAwarded: positions.map((p: any) => ({
        playerId: p.playerId,
        position: p.position,
        points: pointsMap[p.position] || 0
      }))
    });

  } catch (error: any) {
    console.error('Complete championship API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
}