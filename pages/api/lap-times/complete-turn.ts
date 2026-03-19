import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

interface CompleteTurnRequest {
  gameId: string;
  playerId: string;
  circuitId: string;
  turnNumber: number;
  useBest4Of5?: boolean; // For 5-lap turns
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { gameId, playerId, circuitId, turnNumber, useBest4Of5 = false }: CompleteTurnRequest = req.body;

    // Validate required fields
    if (!gameId || !playerId || !circuitId || turnNumber === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get all lap times for this turn
    const lapTimes = await prisma.individualLapTime.findMany({
      where: {
        gameId,
        playerId,
        circuitId,
        turnNumber
      },
      orderBy: {
        lapNumber: 'asc'
      }
    });

    if (lapTimes.length === 0) {
      return res.status(400).json({ error: 'No lap times found for this turn' });
    }

    // Calculate average time
    let timesToAverage = lapTimes.map(lap => lap.timeMs);
    
    // If using best 4 of 5 and we have 5 laps, remove the slowest
    if (useBest4Of5 && timesToAverage.length === 5) {
      timesToAverage.sort((a, b) => a - b);
      timesToAverage = timesToAverage.slice(0, 4); // Keep fastest 4
    }

    const averageTimeMs = Math.round(timesToAverage.reduce((sum, time) => sum + time, 0) / timesToAverage.length);

    // Get active game to calculate proper turn score
    const activeGame = await prisma.game.findFirst({
      where: { id: gameId, status: 'ACTIVE' },
      select: { state: true }
    });

    let turnScore = 0;
    
    if (activeGame && activeGame.state) {
      const gameState = activeGame.state as any;
      const { scoringMethod = 'average' } = gameState.settings;
      
      // Get all completed players for this turn to calculate rankings
      const allTurnCompletions = await prisma.turnCompletion.findMany({
        where: {
          gameId,
          circuitId,
          turnNumber,
          isCompleted: true
        }
      });

      // Calculate points based on scoring method and game settings
      const getPoints = (rank: number, totalPlayers: number): number => {
        const pointsForFirst = gameState.settings.pointsForFirst || 3;
        const pointsForSecond = gameState.settings.pointsForSecond || 2;
        const pointsForThird = gameState.settings.pointsForThird || 1;

        // Only award positions that exist (can't have 3rd place with only 2 players)
        if (rank === 0) return pointsForFirst;
        if (rank === 1 && totalPlayers >= 2) return pointsForSecond;
        if (rank === 2 && totalPlayers >= 3) return pointsForThird;
        return 0;
      };

      if (scoringMethod === 'average' || scoringMethod === 'both') {
        // Sort by average time (this player's average vs others)
        const playerAverages = allTurnCompletions
          .map(tc => ({
            playerId: tc.playerId,
            averageTime: tc.averageTimeMs || Infinity
          }))
          .concat([{ playerId, averageTime: averageTimeMs }]) // Add current player
          .sort((a, b) => a.averageTime - b.averageTime);

        const rank = playerAverages.findIndex(p => p.playerId === playerId);
        if (rank !== -1) {
          const totalPlayers = playerAverages.length;
          const avgPoints = getPoints(rank, totalPlayers);
          turnScore += avgPoints;
          console.log(`[SCORING DEBUG] Average - Player: ${playerId}, Rank: ${rank + 1}/${totalPlayers}, Points: ${avgPoints}, Average: ${averageTimeMs}ms`);
        }
      }

      if (scoringMethod === 'lap' || scoringMethod === 'both') {
        // Get all individual lap times for this turn
        const allLapTimes = await prisma.individualLapTime.findMany({
          where: {
            gameId,
            circuitId,
            turnNumber
          },
          select: {
            playerId: true,
            timeMs: true
          }
        });

        // Find best lap time for each player
        const playerBestLaps = new Map<string, number>();
        allLapTimes.forEach(lap => {
          if (!playerBestLaps.has(lap.playerId) || lap.timeMs < playerBestLaps.get(lap.playerId)!) {
            playerBestLaps.set(lap.playerId, lap.timeMs);
          }
        });

        // Sort players by best lap time
        const sortedByBestLap = Array.from(playerBestLaps.entries())
          .sort((a, b) => a[1] - b[1]);

        // Find current player's rank
        const lapRank = sortedByBestLap.findIndex(([pid]) => pid === playerId);
        if (lapRank !== -1) {
          const totalPlayers = sortedByBestLap.length;
          const lapPoints = getPoints(lapRank, totalPlayers);
          const playerBestTime = sortedByBestLap[lapRank][1];
          turnScore += lapPoints;
          console.log(`[SCORING DEBUG] Best Lap - Player: ${playerId}, Rank: ${lapRank + 1}/${totalPlayers}, Points: ${lapPoints}, Best Lap: ${playerBestTime}ms`);
        }
      }
    }

    console.log(`[SCORING DEBUG] FINAL - Player: ${playerId}, Turn: ${turnNumber}, Circuit: ${circuitId}, Total Score: ${turnScore}, Scoring Method: ${activeGame?.state ? (activeGame.state as any).settings?.scoringMethod || 'unknown' : 'unknown'}`);

    // Check if we need to update bestLaps/bestAverages counters
    let needsGameStateUpdate = false;
    let updatedPlayerStats: any = null;
    
    if (activeGame && activeGame.state) {
      const gameState = activeGame.state as any;
      const { awardBestTimeFor, pointsForBestLap, pointsForBestAverage } = gameState.settings;
      
      // Initialize updatedPlayerStats and add base turn score to totalScore
      updatedPlayerStats = { ...gameState.playerStats };
      if (!updatedPlayerStats[playerId]) {
        updatedPlayerStats[playerId] = { totalScore: 0, bestLaps: 0, bestAverages: 0 };
      }
      updatedPlayerStats[playerId].totalScore += turnScore;
      needsGameStateUpdate = true;
      
      // Only update if awarding circuit-level or turn-level bonuses
      if ((awardBestTimeFor === 'circuit' || awardBestTimeFor === 'both' || awardBestTimeFor === 'turn') && 
          (pointsForBestLap > 0 || pointsForBestAverage > 0)) {
        
        console.log(`[BESTLAPS DEBUG] Checking for best time bonuses - awardFor: ${awardBestTimeFor}, bestLapPts: ${pointsForBestLap}, bestAvgPts: ${pointsForBestAverage}`);
        
        // Get all completed turn completions for this turn to determine if this player had best times
        const allTurnCompletions = await prisma.turnCompletion.findMany({
          where: {
            gameId,
            circuitId,
            turnNumber,
            isCompleted: true
          }
        });
        
        // Include the current player's completion in the comparison
        const allCompletionsWithCurrent = [
          ...allTurnCompletions.filter(tc => tc.playerId !== playerId),
          {
            playerId,
            averageTimeMs,
            // We'll get the best lap from the current lap times
            bestLapTime: Math.min(...lapTimes.map(lap => lap.timeMs))
          }
        ];
        
        // Get all individual lap times for this turn to find overall best lap
        const allTurnLapTimes = await prisma.individualLapTime.findMany({
          where: {
            gameId,
            circuitId,
            turnNumber
          }
        });
        
        // Add current player's lap times
        const allLapTimesWithCurrent = [
          ...allTurnLapTimes,
          ...lapTimes.map(lap => ({ playerId, timeMs: lap.timeMs }))
        ];
        
        // Check for best lap bonus
        if (pointsForBestLap > 0) {
          const bestOverallLapTime = Math.min(...allLapTimesWithCurrent.map(lap => lap.timeMs));
          const playerBestLap = Math.min(...lapTimes.map(lap => lap.timeMs));
          
          if (playerBestLap === bestOverallLapTime) {
            console.log(`[BESTLAPS DEBUG] Player ${playerId} has BEST LAP (${playerBestLap}ms) - awarding bonus and incrementing counter`);
            updatedPlayerStats[playerId].bestLaps += 1;
            updatedPlayerStats[playerId].totalScore += pointsForBestLap;
          }
        }
        
        // Check for best average bonus  
        if (pointsForBestAverage > 0) {
          const bestOverallAverage = Math.min(...allCompletionsWithCurrent.map(tc => tc.averageTimeMs || Infinity));
          
          if (averageTimeMs === bestOverallAverage) {
            console.log(`[BESTLAPS DEBUG] Player ${playerId} has BEST AVERAGE (${averageTimeMs}ms) - awarding bonus and incrementing counter`);
            updatedPlayerStats[playerId].bestAverages += 1;
            updatedPlayerStats[playerId].totalScore += pointsForBestAverage;
          }
        }
      }
    }

    // Update turn completion
    const turnCompletion = await prisma.turnCompletion.upsert({
      where: {
        gameId_playerId_circuitId_turnNumber: {
          gameId,
          playerId,
          circuitId,
          turnNumber
        }
      },
      update: {
        averageTimeMs,
        turnScore,
        isCompleted: true,
        completedAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        gameId,
        playerId,
        circuitId,
        turnNumber,
        averageTimeMs,
        turnScore,
        isCompleted: true,
        completedAt: new Date()
      }
    });

    // Update game state if we awarded best time bonuses
    if (needsGameStateUpdate && updatedPlayerStats && activeGame) {
      console.log(`[BESTLAPS DEBUG] Updating game state with new playerStats`);
      const gameState = activeGame.state as any;
      const updatedGameState = {
        ...gameState,
        playerStats: updatedPlayerStats
      };
      
      await prisma.game.update({
        where: { id: gameId },
        data: {
          state: updatedGameState
        }
      });
      
      console.log(`[BESTLAPS DEBUG] Game state updated successfully`);
    }

    res.status(200).json({
      success: true,
      data: {
        turnCompletion: {
          id: turnCompletion.id,
          gameId: turnCompletion.gameId,
          playerId: turnCompletion.playerId,
          circuitId: turnCompletion.circuitId,
          turnNumber: turnCompletion.turnNumber,
          averageTimeMs: turnCompletion.averageTimeMs,
          turnScore: turnCompletion.turnScore,
          isCompleted: turnCompletion.isCompleted,
          completedAt: turnCompletion.completedAt
        },
        lapTimes: lapTimes.map(lap => ({
          lapNumber: lap.lapNumber,
          timeMs: lap.timeMs,
          used: useBest4Of5 && lapTimes.length === 5 ? 
            timesToAverage.includes(lap.timeMs) : true
        })),
        calculatedAverage: averageTimeMs,
        lapsUsed: timesToAverage.length,
        totalLaps: lapTimes.length
      }
    });

  } catch (error) {
    console.error('Error completing turn:', error);
    res.status(500).json({ error: 'Failed to complete turn' });
  }
}