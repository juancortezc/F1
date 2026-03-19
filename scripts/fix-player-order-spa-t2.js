const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPlayerOrderSpaT2() {
  try {
    const game = await prisma.game.findFirst({ where: { status: 'ACTIVE' } });
    const gameState = game.state;

    console.log('\n🔧 Corrigiendo orden de jugadores para Spa T2...\n');

    console.log('Orden INCORRECTO actual:', gameState.playerOrder.map(id =>
      gameState.settings.players.find(p => p.id === id)?.name
    ).join(' → '));

    // Orden correcto basado en puntos de Spa T1
    // Borgia: 4 pts, Berna: 3 pts, BlackMamba: 1 pt
    const correctOrder = ['3', '2', '1']; // Borgia, Berna, BlackMamba

    console.log('Orden CORRECTO nuevo:', correctOrder.map(id =>
      gameState.settings.players.find(p => p.id === id)?.name
    ).join(' → '));

    const updatedGameState = {
      ...gameState,
      playerOrder: correctOrder,
      currentPlayerIndex: 0 // Borgia va primero
    };

    await prisma.game.update({
      where: { id: game.id },
      data: { state: updatedGameState }
    });

    console.log('\n✅ Orden corregido');
    console.log('   Próximo jugador: Borgia\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixPlayerOrderSpaT2();
