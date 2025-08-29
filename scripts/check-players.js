const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPlayers() {
  try {
    const players = await prisma.player.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log('📋 All Players in Database:\n');
    players.forEach(player => {
      console.log(`ID: ${player.id}, Name: ${player.name}, isGuest: ${player.isGuest}, isActive: ${player.isActive}`);
    });
    
    console.log(`\nTotal players: ${players.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPlayers();