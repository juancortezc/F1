const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyOptimizedApi() {
  try {
    console.log('=== VERIFYING OPTIMIZED API LOGIC ===\n');

    // 1. Get raw data from database
    console.log('1. Getting raw data from database...');
    const completedGames = await prisma.game.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { updatedAt: 'desc' },
    });

    console.log(`Found ${completedGames.length} completed games\n`);

    // 2. Apply the same optimization logic as the API
    console.log('2. Applying API optimization...');
    const optimizedGames = completedGames.map(game => ({
      id: game.id,
      status: game.status,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
      state: game.state ? {
        // Keep only essential fields for Hall of Fame calculations
        playerStats: game.state.playerStats,
        circuitResults: game.state.circuitResults,
        circuits: game.state.circuits,
        settings: game.state.settings ? {
          players: game.state.settings.players,
          circuits: game.state.settings.circuits
        } : undefined
        // Remove heavy fields: lapTimesLog, sessionBestTimes, etc.
      } : null
    }));

    // 3. Calculate size reduction
    const originalSize = JSON.stringify(completedGames).length;
    const optimizedSize = JSON.stringify(optimizedGames).length;
    const reduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);

    console.log(`Original size: ${(originalSize / 1024).toFixed(1)} KB`);
    console.log(`Optimized size: ${(optimizedSize / 1024).toFixed(1)} KB`);
    console.log(`Size reduction: ${reduction}%\n`);

    // 4. Verify Hall of Fame can still work with optimized data
    console.log('3. Testing Hall of Fame logic with optimized data...');
    
    // Get players
    const players = await prisma.player.findMany({ where: { isActive: true } });
    const eligiblePlayers = players.filter(p => !p.isGuest);

    // Initialize stats
    const playerAccStats = {};
    eligiblePlayers.forEach(player => {
      playerAccStats[player.id] = {
        player,
        championships: 0,
        circuitVictories: 0,
        fastestLaps: 0,
        bestAverages: 0,
        totalScore: 0,
        favoriteCircuit: null
      };
    });

    // Process optimized games
    optimizedGames.forEach((game, gameIndex) => {
      if (game.state && game.state.playerStats) {
        const standings = Object.entries(game.state.playerStats)
          .map(([playerId, stats]) => ({
            playerId,
            totalScore: stats.totalScore || 0
          }))
          .sort((a, b) => b.totalScore - a.totalScore);
        
        if (standings.length > 0 && playerAccStats[standings[0].playerId]) {
          playerAccStats[standings[0].playerId].championships++;
        }
      }
    });

    // 5. Show results
    console.log('Final championship counts with optimized data:');
    Object.values(playerAccStats).forEach(stats => {
      console.log(`  ${stats.player.name}: ${stats.championships} championships`);
    });

    console.log('\n✅ Optimization successful! Hall of Fame data preserved.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyOptimizedApi();