const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkT1Results() {
  try {
    // Get all lap times for Turn 1 of Barcelona
    const barcelonaCircuit = await prisma.circuit.findFirst({
      where: { name: 'Barcelona' }
    });
    
    if (!barcelonaCircuit) {
      console.log('Barcelona circuit not found');
      return;
    }

    console.log('\n=== BARCELONA CIRCUIT INFO ===');
    console.log(`Circuit ID: ${barcelonaCircuit.id}`);
    console.log(`Name: ${barcelonaCircuit.name}`);
    
    // Get active game
    const activeGame = await prisma.game.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!activeGame) {
      console.log('No active game found');
      return;
    }
    
    console.log(`\n=== ACTIVE GAME INFO ===`);
    console.log(`Game ID: ${activeGame.id}`);
    console.log(`Created: ${activeGame.createdAt.toISOString()}`);
    console.log(`Status: ${activeGame.status}`);
    
    // Get all lap times for Turn 1 Barcelona in active game
    const turn1LapTimes = await prisma.individualLapTime.findMany({
      where: {
        gameId: activeGame.id,
        circuitId: barcelonaCircuit.id,
        turnNumber: 1
      },
      orderBy: [
        { playerId: 'asc' },
        { lapNumber: 'asc' }
      ]
    });
    
    console.log(`\n=== TURN 1 LAP TIMES (Barcelona) ===`);
    console.log(`Total lap times: ${turn1LapTimes.length}`);
    
    // Group by player
    const playerData = {};
    const playerIds = [...new Set(turn1LapTimes.map(lt => lt.playerId))];
    
    // Get player names
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } }
    });
    const playerMap = Object.fromEntries(players.map(p => [p.id, p.name]));
    
    turn1LapTimes.forEach(lt => {
      if (!playerData[lt.playerId]) {
        playerData[lt.playerId] = {
          name: playerMap[lt.playerId] || lt.playerId,
          lapTimes: []
        };
      }
      playerData[lt.playerId].lapTimes.push({
        lap: lt.lapNumber,
        time: lt.timeMs
      });
    });
    
    // Calculate averages and best laps
    Object.entries(playerData).forEach(([playerId, data]) => {
      console.log(`\n${data.name}:`);
      data.lapTimes.forEach(lap => {
        console.log(`  Lap ${lap.lap}: ${lap.time}ms (${(lap.time / 1000).toFixed(3)}s)`);
      });
      
      const validTimes = data.lapTimes.filter(lt => lt.time > 0 && lt.time < 120000);
      const bestLap = validTimes.length > 0 ? Math.min(...validTimes.map(lt => lt.time)) : null;
      
      // Calculate average using best 4 of 5
      let average = null;
      if (validTimes.length >= 4) {
        const sorted = [...validTimes.map(lt => lt.time)].sort((a, b) => a - b);
        const best4 = sorted.slice(0, 4);
        average = Math.round(best4.reduce((a, b) => a + b, 0) / 4);
      } else if (validTimes.length > 0) {
        average = Math.round(validTimes.reduce((a, b) => a + b.time, 0) / validTimes.length);
      }
      
      console.log(`  Best Lap: ${bestLap ? bestLap + 'ms' : 'N/A'}`);
      console.log(`  Average (best 4/5): ${average ? average + 'ms' : 'N/A'}`);
    });
    
    // Check turn completions
    const turnCompletions = await prisma.turnCompletion.findMany({
      where: {
        gameId: activeGame.id,
        circuitId: barcelonaCircuit.id,
        turnNumber: 1
      }
    });
    
    console.log(`\n=== TURN 1 COMPLETIONS ===`);
    console.log(`Total completions: ${turnCompletions.length}`);
    
    turnCompletions.forEach(tc => {
      const playerName = playerMap[tc.playerId] || tc.playerId;
      console.log(`\n${playerName}:`);
      console.log(`  Average Time: ${tc.averageTimeMs}ms`);
      console.log(`  Turn Score: ${tc.turnScore}`);
      console.log(`  Completed: ${tc.isCompleted}`);
      console.log(`  Completed At: ${tc.completedAt ? tc.completedAt.toISOString() : 'N/A'}`);
    });
    
    // Check game state
    console.log(`\n=== GAME STATE ANALYSIS ===`);
    const gameState = activeGame.state;
    if (gameState && typeof gameState === 'object') {
      console.log(`\nPlayer Stats:`);
      Object.entries(gameState.playerStats || {}).forEach(([playerId, stats]) => {
        const playerName = playerMap[playerId] || playerId;
        console.log(`\n${playerName}:`);
        console.log(`  Total Score: ${stats.totalScore}`);
        console.log(`  Best Laps: ${stats.bestLaps}`);
        console.log(`  Best Averages: ${stats.bestAverages}`);
      });
      
      console.log(`\nCircuit Results:`);
      if (gameState.circuitResults && gameState.circuitResults.length > 0) {
        const barcelonaResult = gameState.circuitResults[0]; // First circuit is Barcelona
        console.log(`\nBarcelona Turn Results:`);
        barcelonaResult.turns.forEach((turn, turnIndex) => {
          console.log(`\n  Turn ${turnIndex + 1}:`);
          turn.forEach(player => {
            const playerName = playerMap[player.playerId] || player.playerId;
            console.log(`    ${playerName}: turnScore=${player.turnScore}, avgTime=${player.averageTime}ms`);
          });
        });
      }
    }
    
  } catch (error) {
    console.error('Error checking T1 results:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkT1Results();