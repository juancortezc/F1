const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testHallOfFameData() {
  try {
    console.log('=== TESTING HALL OF FAME DATA ===\n');

    // 1. Get players (excluding guests)
    const players = await prisma.player.findMany({
      where: { isActive: true }
    });
    const eligiblePlayers = players.filter(p => !p.isGuest);
    console.log('1. ELIGIBLE PLAYERS (non-guests):');
    eligiblePlayers.forEach(p => console.log(`  - ${p.name} (ID: ${p.id})`));

    // 2. Get completed games
    const gameHistory = await prisma.game.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { updatedAt: 'desc' }
    });
    console.log(`\n2. COMPLETED GAMES: ${gameHistory.length}`);

    // 3. Test the exact same logic as F1HallOfFame component
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

    // 4. Process completed games (exact same logic as component)
    gameHistory.forEach((game, gameIndex) => {
      if (game.state && game.state.playerStats) {
        // Find winner (player with highest total score)
        const standings = Object.entries(game.state.playerStats)
          .map(([playerId, stats]) => ({
            playerId,
            totalScore: stats.totalScore || 0
          }))
          .sort((a, b) => b.totalScore - a.totalScore);
        
        console.log(`\nGame ${gameIndex + 1} (${game.id.substring(0, 8)}...):`);
        console.log('  Standings:');
        standings.forEach((standing, idx) => {
          const player = players.find(p => p.id === standing.playerId);
          console.log(`    ${idx + 1}. ${player?.name || 'Unknown'}: ${standing.totalScore} points`);
        });

        // Add championship to winner (first in standings)
        if (standings.length > 0 && playerAccStats[standings[0].playerId]) {
          console.log(`  Winner: ${players.find(p => p.id === standings[0].playerId)?.name} (ID: ${standings[0].playerId})`);
          console.log(`  Winner in playerAccStats? ${!!playerAccStats[standings[0].playerId]}`);
          console.log(`  Winner is guest? ${players.find(p => p.id === standings[0].playerId)?.isGuest || false}`);
          playerAccStats[standings[0].playerId].championships++;
          console.log(`  ✅ Added championship to ${players.find(p => p.id === standings[0].playerId)?.name}. New total: ${playerAccStats[standings[0].playerId].championships}`);
        }
      }
    });

    // 5. Final results
    console.log('\n3. FINAL CHAMPIONSHIP COUNTS:');
    Object.values(playerAccStats).forEach(stats => {
      console.log(`  ${stats.player.name}: ${stats.championships} championships`);
    });

    // 6. Test what the component should render
    const rankedStats = Object.values(playerAccStats)
      .map(stats => ({
        ...stats,
        rankingScore: stats.championships * 10 + stats.circuitVictories * 3 + stats.fastestLaps * 2 + stats.bestAverages
      }))
      .sort((a, b) => b.rankingScore - a.rankingScore);

    console.log('\n4. COMPONENT SHOULD RENDER:');
    rankedStats.forEach((stats, index) => {
      console.log(`  ${index + 1}. ${stats.player.name} - ${stats.championships} CMP, Score: ${stats.rankingScore}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testHallOfFameData();