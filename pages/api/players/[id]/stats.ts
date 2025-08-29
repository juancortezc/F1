import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { withSecurity } from '../../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Player ID is required' });
  }

  try {
    // Get player
    const player = await prisma.player.findUnique({
      where: { id }
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get all game history
    const games = await prisma.game.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { updatedAt: 'desc' }
    });

    let totalGames = 0;
    let totalWins = 0; // CMP: Campeonatos ganados
    let fastestLaps = 0; // VR: Récords de vuelta rápida por circuito
    let bestAverages = 0; // PR: Récords de promedio por circuito  
    let circuitVictories = 0; // VIC: Circuitos donde quedó 1° en campeonatos
    const recentResults = [];

    // Process game history
    for (const game of games) {
      if (!game.state || typeof game.state !== 'object') continue;
      
      const gameState = game.state as any;
      const playerStats = gameState.playerStats?.[id];
      
      if (!playerStats) continue;
      
      totalGames++;
      
      // Check if player won championship
      const standings = Object.entries(gameState.playerStats || {})
        .map(([id, stats]: [string, any]) => ({
          playerId: id,
          totalScore: stats.totalScore || 0
        }))
        .sort((a, b) => b.totalScore - a.totalScore);
      
      const position = standings.findIndex(s => s.playerId === id) + 1;
      
      if (position === 1) {
        totalWins++;
      }
      
      // Calculate circuit victories (VIC): who finished 1st in each circuit overall
      if (gameState.circuitResults && Array.isArray(gameState.circuitResults)) {
        gameState.circuitResults.forEach((circuitResult: any) => {
          if (circuitResult.turns && Array.isArray(circuitResult.turns)) {
            // Calculate total points per player for this circuit
            const circuitPoints: Record<string, number> = {};
            
            circuitResult.turns.forEach((turn: any) => {
              if (Array.isArray(turn)) {
                turn.forEach((playerData: any) => {
                  if (!circuitPoints[playerData.playerId]) {
                    circuitPoints[playerData.playerId] = 0;
                  }
                  circuitPoints[playerData.playerId] += playerData.turnScore || 0;
                });
              }
            });
            
            // Find winner of this circuit (highest total points)
            const circuitWinner = Object.entries(circuitPoints)
              .reduce((winner, [playerId, points]) => 
                points > winner.points ? { playerId, points } : winner
              , { playerId: '', points: 0 });
            
            if (circuitWinner.playerId === id) {
              circuitVictories++;
            }
          }
        });
      }
      
      // Add to recent results
      if (recentResults.length < 10 && game.updatedAt) {
        recentResults.push({
          date: game.updatedAt,
          position,
          totalPlayers: standings.length
        });
      }
    }

    // Count VR and PR from historical circuit records (database records)
    const circuits = await prisma.circuit.findMany();
    
    // Reset counts to use database records instead of game processing
    fastestLaps = 0;
    bestAverages = 0;
    
    const circuitRecords = circuits.map(circuit => {
      // Count VR: fastest lap records
      if (circuit.bestLapHolderId === id) {
        fastestLaps++;
      }
      
      // Count PR: best average records
      if (circuit.bestAverageHolderId === id) {
        bestAverages++;
      }
      
      return {
        circuitName: circuit.name,
        bestLap: circuit.bestLapHolderId === id ? circuit.historicalBestLap : null,
        bestAverage: circuit.bestAverageHolderId === id ? circuit.historicalBestAverage : null
      };
    });

    return res.status(200).json({
      totalGames,
      totalWins,
      fastestLaps,
      bestAverages,
      circuitVictories,
      circuitRecords,
      recentResults
    });
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withSecurity(handler);