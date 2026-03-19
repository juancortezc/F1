const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkHOF() {
  // Obtener juegos completados de 2026
  const games = await prisma.game.findMany({
    where: {
      status: 'COMPLETED',
      createdAt: {
        gte: new Date('2026-01-01'),
        lt: new Date('2027-01-01')
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log('\n🏆 HALL OF FAME - CAMPEONATOS GANADOS 2026\n');
  console.log('═'.repeat(50));

  const championshipWins = {};

  games.forEach((game, idx) => {
    const gameState = game.state;
    const players = Object.entries(gameState.playerStats)
      .sort(([, a], [, b]) => b.totalScore - a.totalScore);

    const winnerId = players[0][0];
    const winnerName = gameState.settings.players.find(p => p.id === winnerId)?.name || winnerId;
    const winnerScore = players[0][1].totalScore;

    championshipWins[winnerName] = (championshipWins[winnerName] || 0) + 1;

    const date = new Date(game.createdAt).toLocaleDateString();
    console.log(`\nCampeonato ${idx + 1} (${date}):`);
    console.log(`  🥇 Campeón: ${winnerName} (${winnerScore} pts)`);

    players.slice(0, 3).forEach(([id, stats], pos) => {
      const name = gameState.settings.players.find(p => p.id === id)?.name || id;
      const medal = ['🥇', '🥈', '🥉'][pos] || '  ';
      console.log(`     ${medal} ${name}: ${stats.totalScore} pts`);
    });
  });

  console.log('\n' + '═'.repeat(50));
  console.log('📊 CAMPEONATOS GANADOS (2026):\n');
  Object.entries(championshipWins)
    .sort(([, a], [, b]) => b - a)
    .forEach(([name, wins]) => {
      console.log(`   ${name}: ${wins} campeonato${wins > 1 ? 's' : ''}`);
    });
  console.log('═'.repeat(50) + '\n');

  await prisma.$disconnect();
}

checkHOF();
