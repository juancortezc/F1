const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPlayerOrder() {
  try {
    const game = await prisma.game.findFirst({
      where: { status: 'ACTIVE' }
    });

    if (!game) {
      console.log('❌ No hay campeonato activo');
      return;
    }

    const gameState = game.state;

    console.log('\n🔧 Corrigiendo orden de jugadores...\n');
    console.log('Orden INCORRECTO actual:', gameState.playerOrder.map(id =>
      gameState.settings.players.find(p => p.id === id)?.name
    ).join(' → '));

    // Ordenar por puntos (mayor a menor)
    const sortedPlayers = Object.entries(gameState.playerStats)
      .sort(([, a], [, b]) => b.totalScore - a.totalScore)
      .map(([id]) => id);

    console.log('\nOrden CORRECTO (por puntos):', sortedPlayers.map(id =>
      gameState.settings.players.find(p => p.id === id)?.name
    ).join(' → '));

    // Actualizar el estado del juego
    const updatedGameState = {
      ...gameState,
      playerOrder: sortedPlayers,
      currentPlayerIndex: 0 // Resetear al primer jugador (el mejor clasificado)
    };

    await prisma.game.update({
      where: { id: game.id },
      data: { state: updatedGameState }
    });

    console.log('\n✅ Orden de jugadores corregido');
    console.log('   El próximo en jugar será:', gameState.settings.players.find(p => p.id === sortedPlayers[0])?.name);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixPlayerOrder();
