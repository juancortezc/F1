const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recalculateActiveGame() {
  try {
    const game = await prisma.game.findFirst({
      where: { status: 'ACTIVE' }
    });

    if (!game) {
      console.log('❌ No hay campeonato activo');
      return;
    }

    console.log(`\n🔄 Recalculando puntos del juego: ${game.id}\n`);

    const response = await fetch('http://localhost:3000/api/game/recalculate-scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ gameId: game.id })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Puntos recalculados exitosamente!\n');
      console.log('--- PUNTOS ANTERIORES ---');
      console.log(JSON.stringify(data.oldStats, null, 2));
      console.log('\n--- PUNTOS NUEVOS (CORRECTOS) ---');
      console.log(JSON.stringify(data.newStats, null, 2));
    } else {
      console.error('❌ Error:', data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

recalculateActiveGame();
