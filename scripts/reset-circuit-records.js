const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetCircuitRecords() {
  console.log('========================================');
  console.log('F1 Night - Reset Circuit Historical Records');
  console.log('========================================');
  
  // Check if this is a dry run
  const isDryRun = process.argv.includes('--dry-run');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE: No changes will be made');
  } else {
    console.log('⚠️  LIVE MODE: Will reset circuit records');
  }
  console.log('========================================');

  try {
    // Get all circuits with their historical records
    const circuits = await prisma.circuit.findMany({
      select: {
        id: true,
        name: true,
        historicalBestLap: true,
        historicalBestLapDate: true,
        historicalBestAverage: true,
        historicalBestAverageDate: true,
        bestLapHolderId: true,
        bestAverageHolderId: true
      }
    });

    console.log(`\n📊 Found ${circuits.length} circuits`);
    
    // Show circuits with records
    const circuitsWithRecords = circuits.filter(c => 
      c.historicalBestLap || c.historicalBestAverage || c.bestLapHolderId || c.bestAverageHolderId
    );
    
    console.log(`\n🏁 Circuits with historical records: ${circuitsWithRecords.length}`);
    
    if (circuitsWithRecords.length > 0) {
      console.log('\nCircuits that will be reset:');
      circuitsWithRecords.forEach(circuit => {
        console.log(`  📍 ${circuit.name}:`);
        if (circuit.historicalBestLap) {
          console.log(`    - Best Lap: ${circuit.historicalBestLap}ms (${circuit.historicalBestLapDate?.toLocaleString() || 'no date'})`);
        }
        if (circuit.historicalBestAverage) {
          console.log(`    - Best Average: ${circuit.historicalBestAverage}ms (${circuit.historicalBestAverageDate?.toLocaleString() || 'no date'})`);
        }
        if (circuit.bestLapHolderId) {
          console.log(`    - Best Lap Holder: ${circuit.bestLapHolderId}`);
        }
        if (circuit.bestAverageHolderId) {
          console.log(`    - Best Average Holder: ${circuit.bestAverageHolderId}`);
        }
      });
    }

    const circuitsWithoutRecords = circuits.filter(c => 
      !c.historicalBestLap && !c.historicalBestAverage && !c.bestLapHolderId && !c.bestAverageHolderId
    );
    
    if (circuitsWithoutRecords.length > 0) {
      console.log(`\n✅ Circuits already clean: ${circuitsWithoutRecords.length}`);
      circuitsWithoutRecords.forEach(circuit => {
        console.log(`  📍 ${circuit.name} - No records to reset`);
      });
    }

    if (isDryRun) {
      console.log('\n========================================');
      console.log('🔍 DRY RUN COMPLETED');
      console.log(`📊 ${circuitsWithRecords.length} circuits would be reset`);
      console.log(`✅ ${circuitsWithoutRecords.length} circuits already clean`);
      console.log('Run without --dry-run to actually reset the records');
      console.log('========================================');
      return;
    }

    // Actual execution - only if not dry run
    if (circuitsWithRecords.length === 0) {
      console.log('\n✅ No circuits have historical records to reset');
      console.log('========================================');
      return;
    }

    // Show warning for 5 seconds
    console.log('\n⚠️  STARTING RESET IN 5 SECONDS...');
    console.log('Press Ctrl+C to cancel');
    
    for (let i = 5; i > 0; i--) {
      process.stdout.write(`\r⏰ ${i}... `);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('\n');

    // Reset all circuit historical records
    console.log('🧹 Resetting circuit historical records...');
    
    const resetResult = await prisma.circuit.updateMany({
      data: {
        historicalBestLap: null,
        historicalBestLapDate: null,
        historicalBestAverage: null,
        historicalBestAverageDate: null,
        bestLapHolderId: null,
        bestAverageHolderId: null
      }
    });

    console.log(`✅ Reset completed: ${resetResult.count} circuits updated`);
    
    // Verify the reset
    const circuitsAfter = await prisma.circuit.findMany({
      select: {
        id: true,
        name: true,
        historicalBestLap: true,
        historicalBestAverage: true,
        bestLapHolderId: true,
        bestAverageHolderId: true
      }
    });

    const stillHaveRecords = circuitsAfter.filter(c => 
      c.historicalBestLap || c.historicalBestAverage || c.bestLapHolderId || c.bestAverageHolderId
    );

    if (stillHaveRecords.length === 0) {
      console.log('✅ Verification successful: All circuit records have been reset');
    } else {
      console.log(`⚠️  Warning: ${stillHaveRecords.length} circuits still have records`);
    }

    console.log('\n========================================');
    console.log('🏁 CIRCUIT RECORDS RESET COMPLETED');
    console.log(`📊 ${circuits.length} total circuits`);
    console.log(`🧹 ${resetResult.count} circuits reset`);
    console.log('========================================');

  } catch (error) {
    console.error('❌ Error resetting circuit records:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Check command line arguments
if (process.argv.length < 2) {
  console.log('Usage:');
  console.log('  node scripts/reset-circuit-records.js --dry-run  # Preview changes');
  console.log('  node scripts/reset-circuit-records.js            # Execute reset');
  process.exit(1);
}

// Run the script
resetCircuitRecords().catch(console.error);