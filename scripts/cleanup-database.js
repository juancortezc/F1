const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupDatabase() {
  console.log('🚀 Starting F1 Night Database Cleanup...\n');

  try {
    // 1. Delete all individual lap times
    console.log('🗑️  Step 1: Deleting all individual lap times...');
    const deletedLapTimes = await prisma.individualLapTime.deleteMany({});
    console.log(`   ✅ Deleted ${deletedLapTimes.count} lap time records`);

    // 2. Delete all turn completions
    console.log('\n🗑️  Step 2: Deleting all turn completions...');
    const deletedTurns = await prisma.turnCompletion.deleteMany({});
    console.log(`   ✅ Deleted ${deletedTurns.count} turn completion records`);

    // 3. Delete all games
    console.log('\n🗑️  Step 3: Deleting all games...');
    const deletedGames = await prisma.game.deleteMany({});
    console.log(`   ✅ Deleted ${deletedGames.count} game records`);

    // 4. Reset all circuit records
    console.log('\n🔄 Step 4: Resetting all circuit records...');
    const resetCircuits = await prisma.circuit.updateMany({
      data: {
        historicalBestLap: null,
        bestLapHolderId: null,
        historicalBestAverage: null,
        bestAverageHolderId: null,
        historicalBestLapDate: null,
        historicalBestAverageDate: null
      }
    });
    console.log(`   ✅ Reset records for ${resetCircuits.count} circuits`);

    // 5. Clean up any tournament-related data if exists
    console.log('\n🗑️  Step 5: Cleaning tournament data...');
    try {
      const deletedParticipants = await prisma.tournamentParticipant.deleteMany({});
      const deletedChampionships = await prisma.championship.deleteMany({});
      const deletedTournaments = await prisma.tournament.deleteMany({});
      console.log(`   ✅ Deleted ${deletedParticipants.count} participants, ${deletedChampionships.count} championships, ${deletedTournaments.count} tournaments`);
    } catch (error) {
      console.log('   ⚠️  No tournament data to clean');
    }

    // 6. Verification - Count remaining records
    console.log('\n📊 Verification - Current database state:');
    
    const playerCount = await prisma.player.count();
    const circuitCount = await prisma.circuit.count();
    const gameCount = await prisma.game.count();
    const lapTimeCount = await prisma.individualLapTime.count();
    const turnCount = await prisma.turnCompletion.count();
    
    console.log(`   👥 Players: ${playerCount} (preserved)`);
    console.log(`   🏁 Circuits: ${circuitCount} (preserved, records reset)`);
    console.log(`   🎮 Games: ${gameCount} (should be 0)`);
    console.log(`   ⏱️  Lap Times: ${lapTimeCount} (should be 0)`);
    console.log(`   🏆 Turn Completions: ${turnCount} (should be 0)`);

    // 7. Show preserved players
    console.log('\n👥 Preserved players:');
    const players = await prisma.player.findMany({
      select: { id: true, name: true }
    });
    players.forEach(p => console.log(`   - ${p.name} (ID: ${p.id})`));

    // 8. Show circuit names (should all have no records)
    console.log('\n🏁 Circuit status (all records reset):');
    const circuits = await prisma.circuit.findMany({
      select: { name: true, historicalBestLap: true, bestLapHolderId: true }
    });
    const circuitsWithRecords = circuits.filter(c => c.historicalBestLap !== null);
    
    if (circuitsWithRecords.length === 0) {
      console.log(`   ✅ All ${circuits.length} circuits have clean records`);
    } else {
      console.log(`   ⚠️  Warning: ${circuitsWithRecords.length} circuits still have records`);
    }

    console.log('\n🎉 Database cleanup completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ All transactional data removed');
    console.log('   ✅ All historical records reset');
    console.log('   ✅ Players and circuits structure preserved');
    console.log('   ✅ Ready for fresh start');

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute cleanup
cleanupDatabase()
  .catch((error) => {
    console.error('\n💥 Cleanup failed:', error);
    process.exit(1);
  });