// Test the /api/game/history endpoint directly
const fetch = require('node-fetch');

async function testApiHistory() {
  try {
    console.log('=== TESTING /api/game/history API ===\n');

    const response = await fetch('http://localhost:3000/api/game/history');
    
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      return;
    }

    const gameHistory = await response.json();
    
    console.log(`✅ API Response received. Games count: ${gameHistory.length}\n`);
    
    gameHistory.forEach((game, index) => {
      console.log(`Game ${index + 1}:`);
      console.log(`  ID: ${game.id}`);
      console.log(`  Status: ${game.status}`);
      console.log(`  Created: ${game.createdAt}`);
      console.log(`  Has state: ${!!game.state}`);
      console.log(`  Has playerStats: ${!!(game.state && game.state.playerStats)}`);
      
      if (game.state && game.state.playerStats) {
        console.log(`  Player stats:`);
        Object.entries(game.state.playerStats).forEach(([playerId, stats]) => {
          console.log(`    Player ${playerId}: ${stats.totalScore} points`);
        });
      }
      console.log('');
    });

  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

testApiHistory();