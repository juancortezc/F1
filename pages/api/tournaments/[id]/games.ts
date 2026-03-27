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
    // Get tournament with its games
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        games: {
          where: { gameMode: 'tournament' },
          orderBy: { position: 'asc' }
        },
        participants: {
          include: {
            player: true
          }
        }
      }
    });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    // Get circuits info for names
    const circuitIds = tournament.playedCircuitIds || [];
    const circuits = await prisma.circuit.findMany({
      where: { id: { in: circuitIds } },
      select: { id: true, name: true, imageUrl: true }
    });

    // Create a map for quick circuit lookup
    const circuitMap = new Map(circuits.map(c => [c.id, c]));

    // Process games to extract relevant info for championship results
    const gamesWithDetails = tournament.games.map((game: any) => {
      const state = game.state as any;
      const playerStats = state?.playerStats || {};
      const settings = state?.settings || {};
      const circuitResults = state?.circuitResults || {};

      // Get final standings from playerStats
      const standings = Object.entries(playerStats)
        .map(([playerId, stats]: [string, any]) => {
          const participant = tournament.participants.find((p: any) => p.playerId === playerId);
          return {
            playerId,
            playerName: participant?.player?.name || 'Jugador',
            playerImage: participant?.player?.imageUrl || '',
            totalScore: stats.totalScore || 0,
            position: stats.position || 0,
            bestLaps: stats.bestLaps || 0,
            bestAverages: stats.bestAverages || 0,
            firsts: stats.firsts || 0,
            seconds: stats.seconds || 0,
            thirds: stats.thirds || 0
          };
        })
        .sort((a, b) => a.position - b.position);

      // Get circuits played in this game
      const gameCircuits = (settings.circuits || []).map((circuitId: string) => {
        const circuit = circuitMap.get(circuitId);
        const circuitResult = circuitResults[circuitId];
        return {
          id: circuitId,
          name: circuit?.name || 'Circuito',
          imageUrl: circuit?.imageUrl || '',
          results: circuitResult ? Object.entries(circuitResult)
            .map(([playerId, result]: [string, any]) => {
              const participant = tournament.participants.find((p: any) => p.playerId === playerId);
              return {
                playerId,
                playerName: participant?.player?.name || 'Jugador',
                bestLap: result.bestLap,
                average: result.average,
                position: result.position,
                points: result.points || 0
              };
            })
            .sort((a, b) => (a.position || 99) - (b.position || 99))
          : []
        };
      });

      // Calculate points awarded in this game
      const pointsAwarded = standings.slice(0, 3).map(s => ({
        playerId: s.playerId,
        playerName: s.playerName,
        position: s.position,
        points: s.position === 1 ? tournament.pointsForFirst :
                s.position === 2 ? tournament.pointsForSecond :
                s.position === 3 ? tournament.pointsForThird : 0
      }));

      return {
        id: game.id,
        position: game.position,
        status: game.status,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,
        standings,
        circuits: gameCircuits,
        pointsAwarded,
        settings: {
          turnsPerCircuit: settings.turnsPerCircuit,
          lapsPerTurn: settings.lapsPerTurn,
          pointsPerPosition: settings.pointsPerPosition,
          pointsForBestLap: settings.pointsForBestLap,
          pointsForBestAverage: settings.pointsForBestAverage
        }
      };
    });

    return res.status(200).json({
      success: true,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        pointsForFirst: tournament.pointsForFirst,
        pointsForSecond: tournament.pointsForSecond,
        pointsForThird: tournament.pointsForThird
      },
      games: gamesWithDetails,
      totalGames: tournament.games.length
    });

  } catch (error: any) {
    console.error('Tournament games API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
}
