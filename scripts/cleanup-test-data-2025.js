const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Fecha de corte - mantener solo datos desde esta fecha en adelante
const CUTOFF_DATE = new Date('2025-08-27T00:00:00.000Z');

async function cleanupTestData() {
  console.log('🚀 F1 Night - Limpieza de Datos de Prueba\n');
  console.log(`📅 Fecha de corte: ${CUTOFF_DATE.toLocaleDateString('es-ES')}`);
  console.log('   Se eliminarán todos los datos anteriores a esta fecha\n');
  
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('🔍 MODO DRY-RUN: Solo se mostrarán los cambios, no se ejecutarán\n');
  }

  try {
    // 1. Contar datos actuales
    console.log('📊 Estado actual de la base de datos:');
    const currentLapTimes = await prisma.individualLapTime.count();
    const currentTurns = await prisma.turnCompletion.count();
    const currentGames = await prisma.game.count();
    const currentTournaments = await prisma.tournament.count();
    const currentChampionships = await prisma.championship.count();
    
    console.log(`   ⏱️  Lap Times totales: ${currentLapTimes}`);
    console.log(`   🏆 Turn Completions totales: ${currentTurns}`);
    console.log(`   🎮 Games totales: ${currentGames}`);
    console.log(`   🏅 Tournaments totales: ${currentTournaments}`);
    console.log(`   🥇 Championships totales: ${currentChampionships}\n`);

    // 2. Identificar datos a eliminar
    console.log('🔍 Identificando datos a eliminar...\n');
    
    const lapTimesToDelete = await prisma.individualLapTime.count({
      where: { createdAt: { lt: CUTOFF_DATE } }
    });
    const turnsToDelete = await prisma.turnCompletion.count({
      where: { createdAt: { lt: CUTOFF_DATE } }
    });
    const gamesToDelete = await prisma.game.count({
      where: { createdAt: { lt: CUTOFF_DATE } }
    });
    const tournamentsToDelete = await prisma.tournament.count({
      where: { createdAt: { lt: CUTOFF_DATE } }
    });
    const championshipsToDelete = await prisma.championship.count({
      where: { createdAt: { lt: CUTOFF_DATE } }
    });
    
    console.log(`   ⏱️  Lap Times a eliminar: ${lapTimesToDelete}`);
    console.log(`   🏆 Turn Completions a eliminar: ${turnsToDelete}`);
    console.log(`   🎮 Games a eliminar: ${gamesToDelete}`);
    console.log(`   🏅 Tournaments a eliminar: ${tournamentsToDelete}`);
    console.log(`   🥇 Championships a eliminar: ${championshipsToDelete}\n`);

    if (dryRun) {
      console.log('✋ Modo dry-run activo - no se realizarán cambios\n');
    } else {
      // 3. Eliminar lap times antiguos
      console.log('🗑️  Step 1: Eliminando lap times anteriores a ' + CUTOFF_DATE.toLocaleDateString('es-ES') + '...');
      const deletedLapTimes = await prisma.individualLapTime.deleteMany({
        where: { createdAt: { lt: CUTOFF_DATE } }
      });
      console.log(`   ✅ Eliminados ${deletedLapTimes.count} lap times`);

      // 4. Eliminar turn completions antiguos
      console.log('\n🗑️  Step 2: Eliminando turn completions anteriores a ' + CUTOFF_DATE.toLocaleDateString('es-ES') + '...');
      const deletedTurns = await prisma.turnCompletion.deleteMany({
        where: { createdAt: { lt: CUTOFF_DATE } }
      });
      console.log(`   ✅ Eliminados ${deletedTurns.count} turn completions`);

      // 5. Eliminar championships antiguos (antes de tournaments por foreign key)
      console.log('\n🗑️  Step 3: Eliminando championships anteriores a ' + CUTOFF_DATE.toLocaleDateString('es-ES') + '...');
      const deletedChampionships = await prisma.championship.deleteMany({
        where: { createdAt: { lt: CUTOFF_DATE } }
      });
      console.log(`   ✅ Eliminados ${deletedChampionships.count} championships`);

      // 6. Eliminar tournaments antiguos
      console.log('\n🗑️  Step 4: Eliminando tournaments anteriores a ' + CUTOFF_DATE.toLocaleDateString('es-ES') + '...');
      const deletedTournaments = await prisma.tournament.deleteMany({
        where: { createdAt: { lt: CUTOFF_DATE } }
      });
      console.log(`   ✅ Eliminados ${deletedTournaments.count} tournaments`);

      // 7. Eliminar games antiguos
      console.log('\n🗑️  Step 5: Eliminando games anteriores a ' + CUTOFF_DATE.toLocaleDateString('es-ES') + '...');
      const deletedGames = await prisma.game.deleteMany({
        where: { createdAt: { lt: CUTOFF_DATE } }
      });
      console.log(`   ✅ Eliminados ${deletedGames.count} games`);

      // 8. Actualizar récords de circuitos
      console.log('\n🔄 Step 6: Actualizando récords de circuitos...');
      const circuits = await prisma.circuit.findMany();
      let circuitsUpdated = 0;
      
      for (const circuit of circuits) {
        let needsUpdate = false;
        const updates = {};
        
        // Verificar si los récords son anteriores a la fecha de corte
        if (circuit.historicalBestLapDate && circuit.historicalBestLapDate < CUTOFF_DATE) {
          updates.historicalBestLap = null;
          updates.historicalBestLapDate = null;
          updates.bestLapHolderId = null;
          needsUpdate = true;
        }
        
        if (circuit.historicalBestAverageDate && circuit.historicalBestAverageDate < CUTOFF_DATE) {
          updates.historicalBestAverage = null;
          updates.historicalBestAverageDate = null;
          updates.bestAverageHolderId = null;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await prisma.circuit.update({
            where: { id: circuit.id },
            data: updates
          });
          circuitsUpdated++;
        }
      }
      console.log(`   ✅ Actualizados récords de ${circuitsUpdated} circuitos`);

      // 9. Recalcular récords basándose en datos restantes
      console.log('\n📈 Step 7: Recalculando récords desde datos válidos...');
      
      for (const circuit of circuits) {
        // Buscar mejor vuelta
        const bestLapRecord = await prisma.individualLapTime.findFirst({
          where: {
            circuitId: circuit.id,
            createdAt: { gte: CUTOFF_DATE }
          },
          orderBy: { timeMs: 'asc' }
        });
        
        // Buscar mejor promedio
        const bestAverageRecord = await prisma.turnCompletion.findFirst({
          where: {
            circuitId: circuit.id,
            createdAt: { gte: CUTOFF_DATE },
            averageTimeMs: { not: null }
          },
          orderBy: { averageTimeMs: 'asc' }
        });
        
        const updates = {};
        
        if (bestLapRecord) {
          updates.historicalBestLap = bestLapRecord.timeMs;
          updates.historicalBestLapDate = bestLapRecord.createdAt;
          updates.bestLapHolderId = bestLapRecord.playerId;
        }
        
        if (bestAverageRecord && bestAverageRecord.averageTimeMs) {
          updates.historicalBestAverage = bestAverageRecord.averageTimeMs;
          updates.historicalBestAverageDate = bestAverageRecord.createdAt;
          updates.bestAverageHolderId = bestAverageRecord.playerId;
        }
        
        if (Object.keys(updates).length > 0) {
          await prisma.circuit.update({
            where: { id: circuit.id },
            data: updates
          });
          console.log(`   ✅ ${circuit.name}: Récords actualizados`);
        }
      }
    }

    // 10. Verificación final
    console.log('\n📊 Estado final de la base de datos:');
    const finalLapTimes = await prisma.individualLapTime.count();
    const finalTurns = await prisma.turnCompletion.count();
    const finalGames = await prisma.game.count();
    const finalTournaments = await prisma.tournament.count();
    const finalChampionships = await prisma.championship.count();
    
    console.log(`   ⏱️  Lap Times: ${finalLapTimes} (eliminados: ${currentLapTimes - finalLapTimes})`);
    console.log(`   🏆 Turn Completions: ${finalTurns} (eliminados: ${currentTurns - finalTurns})`);
    console.log(`   🎮 Games: ${finalGames} (eliminados: ${currentGames - finalGames})`);
    console.log(`   🏅 Tournaments: ${finalTournaments} (eliminados: ${currentTournaments - finalTournaments})`);
    console.log(`   🥇 Championships: ${finalChampionships} (eliminados: ${currentChampionships - finalChampionships})`);

    // 11. Mostrar jugadores y circuitos preservados
    console.log('\n👥 Jugadores preservados:');
    const players = await prisma.player.findMany({
      select: { name: true }
    });
    players.forEach(p => console.log(`   - ${p.name}`));
    
    const circuitCount = await prisma.circuit.count();
    console.log(`\n🏁 Circuitos preservados: ${circuitCount}`);
    
    // 12. Verificar datos más antiguos restantes
    const oldestLapTime = await prisma.individualLapTime.findFirst({
      orderBy: { createdAt: 'asc' }
    });
    const oldestGame = await prisma.game.findFirst({
      orderBy: { createdAt: 'asc' }
    });
    
    console.log('\n📅 Datos más antiguos restantes:');
    if (oldestLapTime) {
      console.log(`   - Lap time más antiguo: ${oldestLapTime.createdAt.toLocaleDateString('es-ES')}`);
    } else {
      console.log(`   - No hay lap times`);
    }
    if (oldestGame) {
      console.log(`   - Game más antiguo: ${oldestGame.createdAt.toLocaleDateString('es-ES')}`);
    } else {
      console.log(`   - No hay games`);
    }
    
    console.log('\n🎉 Limpieza completada exitosamente!');
    
  } catch (error) {
    console.error('\n❌ Error durante la limpieza:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar limpieza
console.log('╔═══════════════════════════════════════════════╗');
console.log('║       F1 Night - Limpieza de Datos de Prueba  ║');
console.log('╚═══════════════════════════════════════════════╝\n');

if (process.argv.includes('--help')) {
  console.log('Uso: node cleanup-test-data-2025.js [--dry-run]');
  console.log('\nOpciones:');
  console.log('  --dry-run  Muestra qué se eliminaría sin hacer cambios');
  console.log('  --help     Muestra esta ayuda\n');
  process.exit(0);
}

cleanupTestData()
  .catch((error) => {
    console.error('\n💥 Limpieza falló:', error);
    process.exit(1);
  });