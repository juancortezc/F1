import prisma from './lib/prisma.js';

async function activateFirstGame() {
  try {
    // Find the first completed game
    const firstGame = await prisma.game.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' }
    });

    if (!firstGame) {
      console.log('No games found in the database');
      return;
    }

    // Mark all games as completed first
    await prisma.game.updateMany({
      where: { status: 'ACTIVE' },
      data: { status: 'COMPLETED' }
    });

    // Activate the first game
    const updatedGame = await prisma.game.update({
      where: { id: firstGame.id },
      data: { status: 'ACTIVE' }
    });

    console.log(`✅ Game ${updatedGame.id} is now ACTIVE`);
    console.log('Game details:', {
      id: updatedGame.id,
      status: updatedGame.status,
      createdAt: updatedGame.createdAt,
      circuits: (updatedGame.state as any).settings?.circuits?.length || 0,
      players: (updatedGame.state as any).settings?.players?.length || 0
    });

  } catch (error) {
    console.error('Error activating game:', error);
  } finally {
    await prisma.$disconnect();
  }
}

activateFirstGame();