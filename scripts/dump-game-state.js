const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function dumpGameState() {
  try {
    const game = await prisma.game.findFirst({
      where: { status: 'ACTIVE' }
    });

    if (!game) {
      console.log('❌ No hay campeonato activo');
      return;
    }

    console.log('\n=== ESTADO COMPLETO DEL JUEGO ===\n');
    console.log(JSON.stringify(game.state, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

dumpGameState();
