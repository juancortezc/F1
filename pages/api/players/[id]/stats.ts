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
    let totalWins = 0;
    let fastestLaps = 0;
    let bestAverages = 0;
    let circuitVictories = 0;
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
      
      // Calculate circuit victories and records from circuitResults
      if (gameState.circuitResults && Array.isArray(gameState.circuitResults)) {
        gameState.circuitResults.forEach((circuitResult: any) => {
          if (circuitResult.turns && Array.isArray(circuitResult.turns)) {
            circuitResult.turns.forEach((turn: any) => {
              if (Array.isArray(turn)) {
                // Check for best average victory
                const sortedByAverage = turn
                  .filter((p: any) => p.averageTime && p.averageTime > 0)
                  .sort((a: any, b: any) => a.averageTime - b.averageTime);
                
                if (sortedByAverage.length > 0 && sortedByAverage[0].playerId === id) {
                  bestAverages++;
                  circuitVictories++;
                }
                
                // Check for best lap victory
                const sortedByLap = turn
                  .map((p: any) => ({
                    ...p,
                    bestLap: p.lapTimes ? Math.min(...p.lapTimes.filter((t: number) => t > 0)) : Infinity
                  }))
                  .filter((p: any) => p.bestLap !== Infinity)
                  .sort((a: any, b: any) => a.bestLap - b.bestLap);
                
                if (sortedByLap.length > 0 && sortedByLap[0].playerId === id) {
                  fastestLaps++;
                  circuitVictories++;
                }
              }
            });
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

    // Get circuit records
    const circuits = await prisma.circuit.findMany();
    const circuitRecords = circuits.map(circuit => ({
      circuitName: circuit.name,
      bestLap: circuit.bestLapHolderId === id ? circuit.historicalBestLap : null,
      bestAverage: circuit.bestAverageHolderId === id ? circuit.historicalBestAverage : null
    }));

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