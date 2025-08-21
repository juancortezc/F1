import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkGames() {
  try {
    console.log('Connecting to database...\n');

    // Get all games from the database
    const games = await prisma.game.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Total games in database: ${games.length}\n`);

    if (games.length === 0) {
      console.log('No games found in the database.');
      return;
    }

    // Check for active games
    const activeGames = games.filter(game => game.status === 'ACTIVE');
    console.log(`Active games: ${activeGames.length}`);
    console.log(`Completed games: ${games.filter(game => game.status === 'COMPLETED').length}\n`);

    // Display each game
    console.log('Game Details:');
    console.log('='.repeat(80));
    
    games.forEach((game, index) => {
      console.log(`\nGame ${index + 1}:`);
      console.log(`  ID: ${game.id}`);
      console.log(`  Status: ${game.status}`);
      console.log(`  Created: ${game.createdAt.toLocaleString()}`);
      console.log(`  Updated: ${game.updatedAt.toLocaleString()}`);
      
      // Parse game state to show some basic info
      try {
        const state = game.state as any;
        if (state.name) {
          console.log(`  Name: ${state.name}`);
        }
        if (state.players && Array.isArray(state.players)) {
          console.log(`  Players: ${state.players.length}`);
        }
        if (state.circuits && Array.isArray(state.circuits)) {
          console.log(`  Circuits: ${state.circuits.length}`);
        }
        if (state.isForTournament !== undefined) {
          console.log(`  Tournament Game: ${state.isForTournament ? 'Yes' : 'No'}`);
        }
      } catch (e) {
        console.log('  (Unable to parse game state)');
      }
    });

    console.log('\n' + '='.repeat(80));

    // Special highlighting for active games
    if (activeGames.length > 0) {
      console.log('\n⚠️  ACTIVE GAMES DETECTED:');
      activeGames.forEach(game => {
        console.log(`   - Game ID: ${game.id} (Created: ${game.createdAt.toLocaleString()})`);
      });
    } else {
      console.log('\n✓ No active games currently in the database.');
    }

  } catch (error) {
    console.error('Error checking games:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkGames();