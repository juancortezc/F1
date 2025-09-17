const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugHallOfFame() {
  try {
    console.log('=== DEBUGGING HALL OF FAME LOGIC ===\n');
    
    // Get players and filter out guests
    const allPlayers = await prisma.player.findMany();
    const eligiblePlayers = allPlayers.filter(p => !p.isGuest);
    
    console.log('ELIGIBLE PLAYERS (non-guests):');
    eligiblePlayers.forEach(p => console.log(`  - ${p.name} (ID: ${p.id})`));
    
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
    
    console.log('\nINITIALIZED PLAYER STATS:');
    Object.entries(playerAccStats).forEach(([playerId, stats]) => {
      console.log(`  ${stats.player.name}: championships=${stats.championships}`);
    });
    
    // Get completed games
    const gameHistory = await prisma.game.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\nPROCESSING ${gameHistory.length} COMPLETED GAMES:`);
    
    gameHistory.forEach((game, gameIndex) => {
      console.log(`\nGame ${gameIndex + 1} (${game.id.slice(0, 8)}...):`);
      
      if (game.state && game.state.playerStats) {
        // Find winner (player with highest total score)
        const standings = Object.entries(game.state.playerStats)
          .map(([playerId, stats]) => ({
            playerId,
            totalScore: stats.totalScore || 0
          }))
          .sort((a, b) => b.totalScore - a.totalScore);
        
        console.log('  Standings:');
        standings.forEach(({ playerId, totalScore }, index) => {
          const player = allPlayers.find(p => p.id === playerId);
          console.log(`    ${index + 1}. ${player?.name || 'Unknown'}: ${totalScore} points`);
        });
        
        // Add championship to winner (first in standings)
        if (standings.length > 0) {
          const winnerId = standings[0].playerId;
          const winner = allPlayers.find(p => p.id === winnerId);
          
          console.log(`  Winner: ${winner?.name || 'Unknown'} (ID: ${winnerId})`);
          console.log(`  Winner in playerAccStats? ${!!playerAccStats[winnerId]}`);
          console.log(`  Winner is guest? ${winner?.isGuest || false}`);
          
          if (playerAccStats[winnerId]) {
            playerAccStats[winnerId].championships++;
            console.log(`  ✅ Added championship to ${winner?.name}. New total: ${playerAccStats[winnerId].championships}`);
          } else {
            console.log(`  ❌ Winner ${winner?.name} not found in playerAccStats!`);
          }
        }
      }
    });
    
    console.log('\nFINAL CHAMPIONSHIP COUNTS:');
    Object.entries(playerAccStats).forEach(([playerId, stats]) => {
      console.log(`  ${stats.player.name}: ${stats.championships} championships`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugHallOfFame();