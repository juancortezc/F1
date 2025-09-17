const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkHallOfFameData() {
  try {
    console.log('=== CHECKING HALL OF FAME DATA ===\n');
    
    // Check players first
    console.log('1. PLAYERS:');
    const players = await prisma.player.findMany();
    players.forEach(player => {
      console.log(`  ${player.name} (${player.id.slice(0, 8)}...) - Guest: ${player.isGuest || false}`);
    });
    
    // Check completed games
    console.log('\n2. COMPLETED GAMES:');
    const games = await prisma.game.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' }
    });
    
    if (games.length === 0) {
      console.log('  ❌ No completed games found');
    } else {
      games.forEach((game, i) => {
        console.log(`  Game ${i+1}: ${game.id.slice(0, 8)}... (${game.createdAt.toISOString()})`);
        
        if (game.state && typeof game.state === 'object' && game.state.playerStats) {
          console.log('    Player Stats:');
          
          // Calculate standings
          const standings = Object.entries(game.state.playerStats)
            .map(([playerId, stats]) => ({
              playerId,
              totalScore: stats.totalScore || 0
            }))
            .sort((a, b) => b.totalScore - a.totalScore);
          
          console.log('    STANDINGS (sorted by score):');
          standings.forEach(({ playerId, totalScore }, index) => {
            const player = players.find(p => p.id === playerId);
            const playerName = player ? player.name : `Unknown (${playerId.slice(0, 8)})`;
            console.log(`      ${index + 1}. ${playerName}: ${totalScore} points`);
          });
          
          console.log('    WINNER should be:', standings[0] ? 
            (players.find(p => p.id === standings[0].playerId)?.name || 'Unknown') : 'None');
        }
        console.log('');
      });
    }
    
    // Check circuit records
    console.log('3. CIRCUIT HISTORICAL RECORDS:');
    const circuits = await prisma.circuit.findMany();
    circuits.forEach(circuit => {
      const bestLapHolder = players.find(p => p.id === circuit.bestLapHolderId);
      const bestAvgHolder = players.find(p => p.id === circuit.bestAverageHolderId);
      
      console.log(`  ${circuit.name}:`);
      console.log(`    Best Lap: ${circuit.historicalBestLap}ms (${bestLapHolder?.name || 'None'})`);
      console.log(`    Best Avg: ${circuit.historicalBestAverage}ms (${bestAvgHolder?.name || 'None'})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHallOfFameData();