const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkLapTimes() {
  try {
    // Get all lap times ordered by creation date
    const lapTimes = await prisma.individualLapTime.findMany({
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log('\n=== TOTAL LAP TIMES IN DATABASE ===');
    console.log(`Total lap times: ${lapTimes.length}`);
    
    if (lapTimes.length > 0) {
      console.log(`\nFirst lap time: ${lapTimes[0].createdAt.toISOString()}`);
      console.log(`Last lap time: ${lapTimes[lapTimes.length - 1].createdAt.toISOString()}`);
    }

    // Check for lap times before September 3, 2025
    const cutoffDate = new Date('2025-09-03T00:00:00Z');
    const lapTimesBeforeCutoff = lapTimes.filter(lt => lt.createdAt < cutoffDate);
    
    console.log(`\n=== LAP TIMES BEFORE SEPTEMBER 3, 2025 ===`);
    console.log(`Count: ${lapTimesBeforeCutoff.length}`);
    
    if (lapTimesBeforeCutoff.length > 0) {
      console.log('\nDetails:');
      lapTimesBeforeCutoff.forEach(lt => {
        console.log(`- ${lt.createdAt.toISOString()} | Player: ${lt.playerId} | Circuit: ${lt.circuitId} | Time: ${lt.timeMs}ms | Game: ${lt.gameId}`);
      });
    }

    // Get all games
    const games = await prisma.game.findMany({
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`\n=== GAMES IN DATABASE ===`);
    console.log(`Total games: ${games.length}`);
    
    if (games.length > 0) {
      games.forEach(game => {
        console.log(`\nGame ID: ${game.id}`);
        console.log(`Created: ${game.createdAt.toISOString()}`);
        console.log(`Status: ${game.status}`);
        const state = game.state;
        if (state && typeof state === 'object') {
          console.log(`Current Turn: ${state.currentTurn || 'N/A'}`);
          console.log(`Current Circuit Index: ${state.currentCircuitIndex || 0}`);
          console.log(`Standings Count: ${state.standings ? Object.keys(state.standings).length : 0}`);
        }
      });
    }

    // Check turn completions
    const turnCompletions = await prisma.turnCompletion.findMany({
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`\n=== TURN COMPLETIONS ===`);
    console.log(`Total turn completions: ${turnCompletions.length}`);
    
    if (turnCompletions.length > 0) {
      console.log(`\nFirst turn: ${turnCompletions[0].createdAt.toISOString()}`);
      console.log(`Last turn: ${turnCompletions[turnCompletions.length - 1].createdAt.toISOString()}`);
    }

    // Check for recent lap times (last 10)
    const recentLapTimes = await prisma.individualLapTime.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // Get player and circuit names for recent lap times
    const playerIds = [...new Set(recentLapTimes.map(lt => lt.playerId))];
    const circuitIds = [...new Set(recentLapTimes.map(lt => lt.circuitId))];
    
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } }
    });
    const circuits = await prisma.circuit.findMany({
      where: { id: { in: circuitIds } }
    });
    
    const playerMap = Object.fromEntries(players.map(p => [p.id, p.name]));
    const circuitMap = Object.fromEntries(circuits.map(c => [c.id, c.name]));

    console.log(`\n=== MOST RECENT LAP TIMES (Last 10) ===`);
    recentLapTimes.forEach(lt => {
      console.log(`- ${lt.createdAt.toISOString()} | Player: ${playerMap[lt.playerId] || lt.playerId} | Circuit: ${circuitMap[lt.circuitId] || lt.circuitId} | Turn: ${lt.turnNumber} | Lap: ${lt.lapNumber} | Time: ${lt.timeMs}ms`);
    });

  } catch (error) {
    console.error('Error checking lap times:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLapTimes();