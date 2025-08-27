import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { GameState, PlayerStats } from '../../../types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { gameId } = req.body;
    
    if (!gameId) {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    // Get the game (allow both ACTIVE and COMPLETED games for recalculation)
    const game = await prisma.game.findUnique({
      where: { id: gameId }
    });

    if (!game || !game.state) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const gameState = game.state as any as GameState;
    
    // Recalculate all scores from scratch
    const newPlayerStats: Record<string, PlayerStats> = {};
    
    // Initialize player stats
    gameState.settings.players.forEach(p => {
      newPlayerStats[p.id] = { totalScore: 0, bestLaps: 0, bestAverages: 0 };
    });

    // Helper function to get points based on rank with player count check
    const getPoints = (rank: number, totalPlayers: number): number => {
      if (rank === 0) return 3;
      if (rank === 1 && totalPlayers >= 2) return 2;
      if (rank === 2 && totalPlayers >= 3) return 1;
      return 0;
    };

    // Recalculate scores for each circuit and turn
    gameState.circuitResults.forEach((circuit, circuitIndex) => {
      circuit.turns.forEach((turn, turnIndex) => {
        if (!turn || turn.length === 0) return;
        
        const { scoringMethod, scoringMultiplier, pointsForBestLap, pointsForBestAverage, awardBestTimeFor } = gameState.settings;
        const pointsThisTurn = new Map<string, number>();
        
        // Initialize points
        turn.forEach(result => {
          pointsThisTurn.set(result.playerId, 0);
        });

        // Calculate position-based points
        if (scoringMethod === 'average' || scoringMethod === 'both') {
          const sortedByAverage = [...turn].sort((a, b) => (a.averageTime ?? Infinity) - (b.averageTime ?? Infinity));
          const totalPlayers = sortedByAverage.length;
          
          sortedByAverage.forEach((result, rank) => {
            let points = getPoints(rank, totalPlayers);
            if (scoringMethod === 'both' && scoringMultiplier?.appliesTo === 'average') {
              points *= scoringMultiplier.factor;
            }
            pointsThisTurn.set(result.playerId, (pointsThisTurn.get(result.playerId) || 0) + points);
          });
        }

        if (scoringMethod === 'lap' || scoringMethod === 'both') {
          const playerBests = turn.map(tr => ({
            playerId: tr.playerId,
            bestLap: Math.min(...tr.lapTimes.filter(t => t > 0))
          })).filter(pb => pb.bestLap !== Infinity);
          
          const sortedByLap = playerBests.sort((a, b) => a.bestLap - b.bestLap);
          const totalPlayers = sortedByLap.length;
          
          sortedByLap.forEach((lapResult, rank) => {
            let points = getPoints(rank, totalPlayers);
            if (scoringMethod === 'both' && scoringMultiplier?.appliesTo === 'lap') {
              points *= scoringMultiplier.factor;
            }
            pointsThisTurn.set(lapResult.playerId, (pointsThisTurn.get(lapResult.playerId) || 0) + points);
          });
        }

        // Update turn scores
        turn.forEach(result => {
          const baseTurnPoints = pointsThisTurn.get(result.playerId) || 0;
          result.turnScore = baseTurnPoints; // Reset to base points only
          newPlayerStats[result.playerId].totalScore += baseTurnPoints;
        });

        // Award bonus points for best lap and average
        if (awardBestTimeFor === 'turn' || awardBestTimeFor === 'both') {
          // Best lap bonus
          if (pointsForBestLap && pointsForBestLap > 0 && turn.length > 0) {
            const playerBests = turn.map(tr => ({
              playerId: tr.playerId,
              bestLap: Math.min(...tr.lapTimes.filter(t => t > 0))
            })).filter(pb => pb.bestLap !== Infinity);
            
            if (playerBests.length > 0) {
              const bestLapPlayer = playerBests.reduce((best, current) => 
                current.bestLap < best.bestLap ? current : best
              );
              
              newPlayerStats[bestLapPlayer.playerId].totalScore += pointsForBestLap;
              newPlayerStats[bestLapPlayer.playerId].bestLaps += 1;
              
              // Update turn score to include bonus
              const bestLapResult = turn.find(r => r.playerId === bestLapPlayer.playerId);
              if (bestLapResult) {
                bestLapResult.turnScore += pointsForBestLap;
              }
            }
          }

          // Best average bonus
          if (pointsForBestAverage && pointsForBestAverage > 0 && turn.length > 0) {
            const validAverages = turn.filter(tr => tr.averageTime && tr.averageTime > 0);
            if (validAverages.length > 0) {
              const bestAveragePlayer = validAverages.reduce((best, current) => 
                (current.averageTime || Infinity) < (best.averageTime || Infinity) ? current : best
              );
              
              newPlayerStats[bestAveragePlayer.playerId].totalScore += pointsForBestAverage;
              newPlayerStats[bestAveragePlayer.playerId].bestAverages += 1;
              
              // Update turn score to include bonus
              const bestAverageResult = turn.find(r => r.playerId === bestAveragePlayer.playerId);
              if (bestAverageResult) {
                bestAverageResult.turnScore += pointsForBestAverage;
              }
            }
          }
        }
      });

      // Award circuit-level bonuses if configured
      if (gameState.settings.awardBestTimeFor === 'circuit' || gameState.settings.awardBestTimeFor === 'both') {
        // Circuit best lap bonus
        if (gameState.settings.pointsForBestLap && gameState.settings.pointsForBestLap > 0) {
          let circuitBestLap = Infinity;
          let circuitBestLapPlayer = '';
          
          circuit.turns.forEach(turn => {
            turn.forEach(result => {
              const bestLapInTurn = Math.min(...result.lapTimes.filter(t => t > 0));
              if (bestLapInTurn < circuitBestLap) {
                circuitBestLap = bestLapInTurn;
                circuitBestLapPlayer = result.playerId;
              }
            });
          });
          
          if (circuitBestLapPlayer) {
            newPlayerStats[circuitBestLapPlayer].totalScore += gameState.settings.pointsForBestLap;
            newPlayerStats[circuitBestLapPlayer].bestLaps += 1;
          }
        }

        // Circuit best average bonus
        if (gameState.settings.pointsForBestAverage && gameState.settings.pointsForBestAverage > 0) {
          let circuitBestAverage = Infinity;
          let circuitBestAveragePlayer = '';
          
          circuit.turns.forEach(turn => {
            turn.forEach(result => {
              if (result.averageTime && result.averageTime > 0 && result.averageTime < circuitBestAverage) {
                circuitBestAverage = result.averageTime;
                circuitBestAveragePlayer = result.playerId;
              }
            });
          });
          
          if (circuitBestAveragePlayer) {
            newPlayerStats[circuitBestAveragePlayer].totalScore += gameState.settings.pointsForBestAverage;
            newPlayerStats[circuitBestAveragePlayer].bestAverages += 1;
          }
        }
      }
    });

    // Update the game state with corrected scores
    const updatedGameState = {
      ...gameState,
      playerStats: newPlayerStats
    };

    // Save the updated game state
    await prisma.game.update({
      where: { id: gameId },
      data: {
        state: updatedGameState as any
      }
    });

    res.status(200).json({ 
      success: true,
      message: 'Scores recalculated successfully',
      oldStats: gameState.playerStats,
      newStats: newPlayerStats
    });

  } catch (error) {
    console.error('Error recalculating scores:', error);
    res.status(500).json({ error: 'Failed to recalculate scores' });
  }
}