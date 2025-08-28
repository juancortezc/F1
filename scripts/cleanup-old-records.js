/**
 * Database Cleanup Script - Delete records older than August 27, 2024
 * 
 * This script removes old test data while preserving records from August 27, 2024 onwards
 * 
 * Usage: node scripts/cleanup-old-records.js [--dry-run]
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Cutoff date - everything before this date will be deleted
const CUTOFF_DATE = new Date('2024-08-27T00:00:00.000Z');

// Command line arguments
const isDryRun = process.argv.includes('--dry-run');

async function main() {
  console.log('========================================');
  console.log('F1 Night Database Cleanup Script');
  console.log('========================================');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (data will be deleted)'}`);
  console.log(`Cutoff Date: ${CUTOFF_DATE.toISOString()}`);
  console.log(`Deleting records created before: ${CUTOFF_DATE.toLocaleDateString('es-ES')}`);
  console.log('========================================\n');

  try {
    // 1. Count records to be deleted
    console.log('📊 Analyzing records to delete...\n');

    // Individual lap times
    const lapTimesToDelete = await prisma.individualLapTime.count({
      where: {
        createdAt: {
          lt: CUTOFF_DATE
        }
      }
    });

    const totalLapTimes = await prisma.individualLapTime.count();
    const lapTimesToKeep = totalLapTimes - lapTimesToDelete;

    console.log(`Individual Lap Times:`);
    console.log(`  - Total: ${totalLapTimes}`);
    console.log(`  - To Delete (< ${CUTOFF_DATE.toLocaleDateString()}): ${lapTimesToDelete}`);
    console.log(`  - To Keep (≥ ${CUTOFF_DATE.toLocaleDateString()}): ${lapTimesToKeep}\n`);

    // Turn completions
    const turnCompletionsToDelete = await prisma.turnCompletion.count({
      where: {
        createdAt: {
          lt: CUTOFF_DATE
        }
      }
    });

    const totalTurnCompletions = await prisma.turnCompletion.count();
    const turnCompletionsToKeep = totalTurnCompletions - turnCompletionsToDelete;

    console.log(`Turn Completions:`);
    console.log(`  - Total: ${totalTurnCompletions}`);
    console.log(`  - To Delete (< ${CUTOFF_DATE.toLocaleDateString()}): ${turnCompletionsToDelete}`);
    console.log(`  - To Keep (≥ ${CUTOFF_DATE.toLocaleDateString()}): ${turnCompletionsToKeep}\n`);

    // Games
    const gamesToDelete = await prisma.game.count({
      where: {
        createdAt: {
          lt: CUTOFF_DATE
        }
      }
    });

    const totalGames = await prisma.game.count();
    const gamesToKeep = totalGames - gamesToDelete;

    console.log(`Games:`);
    console.log(`  - Total: ${totalGames}`);
    console.log(`  - To Delete (< ${CUTOFF_DATE.toLocaleDateString()}): ${gamesToDelete}`);
    console.log(`  - To Keep (≥ ${CUTOFF_DATE.toLocaleDateString()}): ${gamesToKeep}\n`);

    // Circuit historical records (these don't have dates, so we'll reset all if not dry run)
    const circuitsWithRecords = await prisma.circuit.count({
      where: {
        OR: [
          { historicalBestLap: { not: null } },
          { historicalBestAverage: { not: null } }
        ]
      }
    });

    console.log(`Circuits with Historical Records: ${circuitsWithRecords}`);
    console.log(`  - Note: Circuit records don't have dates, so ALL will be reset\n`);

    // Summary
    console.log('========================================');
    console.log('📋 SUMMARY:');
    console.log(`  - Lap Times to delete: ${lapTimesToDelete}`);
    console.log(`  - Turn Completions to delete: ${turnCompletionsToDelete}`);
    console.log(`  - Games to delete: ${gamesToDelete}`);
    console.log(`  - Circuit records to reset: ${circuitsWithRecords}`);
    console.log('========================================\n');

    // Safety check - confirm if not dry run
    if (!isDryRun && (lapTimesToDelete > 0 || turnCompletionsToDelete > 0 || gamesToDelete > 0 || circuitsWithRecords > 0)) {
      console.log('⚠️  WARNING: This action cannot be undone!');
      console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
      
      // Wait 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));

      console.log('🗑️  Starting deletion process...\n');

      // 2. Delete records
      
      // Delete individual lap times
      if (lapTimesToDelete > 0) {
        console.log(`Deleting ${lapTimesToDelete} lap times...`);
        const deletedLapTimes = await prisma.individualLapTime.deleteMany({
          where: {
            createdAt: {
              lt: CUTOFF_DATE
            }
          }
        });
        console.log(`✅ Deleted ${deletedLapTimes.count} lap times\n`);
      }

      // Delete turn completions
      if (turnCompletionsToDelete > 0) {
        console.log(`Deleting ${turnCompletionsToDelete} turn completions...`);
        const deletedTurnCompletions = await prisma.turnCompletion.deleteMany({
          where: {
            createdAt: {
              lt: CUTOFF_DATE
            }
          }
        });
        console.log(`✅ Deleted ${deletedTurnCompletions.count} turn completions\n`);
      }

      // Delete games
      if (gamesToDelete > 0) {
        console.log(`Deleting ${gamesToDelete} games...`);
        const deletedGames = await prisma.game.deleteMany({
          where: {
            createdAt: {
              lt: CUTOFF_DATE
            }
          }
        });
        console.log(`✅ Deleted ${deletedGames.count} games\n`);
      }

      // Reset circuit historical records
      if (circuitsWithRecords > 0) {
        console.log(`Resetting historical records for ${circuitsWithRecords} circuits...`);
        const resetCircuits = await prisma.circuit.updateMany({
          where: {
            OR: [
              { historicalBestLap: { not: null } },
              { historicalBestAverage: { not: null } }
            ]
          },
          data: {
            historicalBestLap: null,
            historicalBestAverage: null,
            bestLapHolderId: null,
            bestAverageHolderId: null
          }
        });
        console.log(`✅ Reset historical records for ${resetCircuits.count} circuits\n`);
      }

      console.log('========================================');
      console.log('✅ CLEANUP COMPLETED SUCCESSFULLY!');
      console.log('========================================\n');

      // 3. Show final state
      console.log('📊 Final database state:');
      
      const finalLapTimes = await prisma.individualLapTime.count();
      const finalTurnCompletions = await prisma.turnCompletion.count();
      const finalGames = await prisma.game.count();
      const finalCircuitsWithRecords = await prisma.circuit.count({
        where: {
          OR: [
            { historicalBestLap: { not: null } },
            { historicalBestAverage: { not: null } }
          ]
        }
      });

      console.log(`  - Individual Lap Times: ${finalLapTimes}`);
      console.log(`  - Turn Completions: ${finalTurnCompletions}`);
      console.log(`  - Games: ${finalGames}`);
      console.log(`  - Circuits with records: ${finalCircuitsWithRecords}`);
      console.log('\n✅ All records from August 27, 2024 have been preserved!');

    } else if (isDryRun) {
      console.log('🔍 DRY RUN COMPLETED - No changes were made to the database.');
      console.log('Run without --dry-run flag to execute the cleanup.');
    } else {
      console.log('✅ No records to delete - database is already clean!');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to show records that will be kept (for verification)
async function showPreservedRecords() {
  console.log('\n📋 Sample of records that will be PRESERVED:');
  
  // Show a few lap times from today (no relations in schema)
  const recentLapTimes = await prisma.individualLapTime.findMany({
    where: {
      createdAt: {
        gte: CUTOFF_DATE
      }
    },
    take: 5,
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (recentLapTimes.length > 0) {
    console.log('\nRecent Lap Times (will be kept):');
    recentLapTimes.forEach(lap => {
      console.log(`  - Player ID: ${lap.playerId}, Circuit ID: ${lap.circuitId}, Time: ${lap.timeMs}ms (${lap.createdAt.toLocaleString()})`);
    });
  }

  // Show recent games
  const recentGames = await prisma.game.findMany({
    where: {
      createdAt: {
        gte: CUTOFF_DATE
      }
    },
    take: 3,
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (recentGames.length > 0) {
    console.log('\nRecent Games (will be kept):');
    recentGames.forEach(game => {
      console.log(`  - Game ${game.id.slice(0, 8)}: ${game.status} (${game.createdAt.toLocaleString()})`);
    });
  }
}

// Run the script
main()
  .then(async () => {
    if (isDryRun) {
      await showPreservedRecords();
    }
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });