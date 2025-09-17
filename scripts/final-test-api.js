const fetch = require('node-fetch');

async function testOptimizedApi() {
  try {
    console.log('=== TESTING OPTIMIZED /api/game/history ===\n');

    const startTime = Date.now();
    const response = await fetch('http://localhost:3000/api/game/history');
    const endTime = Date.now();
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      return;
    }

    const gameHistory = await response.json();
    const responseTime = endTime - startTime;
    
    console.log(`✅ API Response received in ${responseTime}ms`);
    console.log(`Games count: ${gameHistory.length}\n`);
    
    // Test Hall of Fame calculation
    const playerStats = {};
    gameHistory.forEach((game, index) => {
      console.log(`Game ${index + 1}:`);
      console.log(`  ID: ${game.id.substring(0, 8)}...`);
      console.log(`  Has state: ${!!game.state}`);
      console.log(`  Has playerStats: ${!!(game.state && game.state.playerStats)}`);
      
      if (game.state && game.state.playerStats) {
        const standings = Object.entries(game.state.playerStats)
          .map(([playerId, stats]) => ({
            playerId,
            totalScore: stats.totalScore || 0
          }))
          .sort((a, b) => b.totalScore - a.totalScore);
        
        console.log(`  Winner: Player ${standings[0].playerId} with ${standings[0].totalScore} points`);
        
        // Count championships
        if (!playerStats[standings[0].playerId]) {
          playerStats[standings[0].playerId] = 0;
        }
        playerStats[standings[0].playerId]++;
      }
      console.log('');
    });

    console.log('Championship counts calculated from API:');
    Object.entries(playerStats).forEach(([playerId, count]) => {
      console.log(`  Player ${playerId}: ${count} championships`);
    });

    console.log('\n✅ Hall of Fame should now show correct data!');

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

// Only run if there's a server running
console.log('Starting test in 2 seconds...');
setTimeout(testOptimizedApi, 2000);