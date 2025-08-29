const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Game ID del campeonato válido del 27/08/2025
const VALID_GAME_ID = 'cmeuobvxx0000h6cel8ei0qau';

// Jugadores y circuitos del campeonato válido
const VALID_PLAYERS = ['Berna', 'Borgia', 'Juan'];
const VALID_CIRCUITS = ['Miami', 'COTA', 'Suzuka'];

async function cleanupToChampionshipOnly() {
  console.log('🏆 F1 Night - Limpieza al Campeonato del 27 Agosto\n');
  console.log('═══════════════════════════════════════════════════\n');
  console.log(`🎯 Game ID válido: ${VALID_GAME_ID}`);
  console.log(`👥 Jugadores: ${VALID_PLAYERS.join(', ')}`);
  console.log(`🏁 Circuitos: ${VALID_CIRCUITS.join(', ')}\n`);
  
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('🔍 MODO DRY-RUN: Solo se mostrarán los cambios\n');
  }

  try {
    // 1. Obtener información de jugadores y circuitos
    const players = await prisma.player.findMany({
      where: { name: { in: VALID_PLAYERS } }
    });
    const playerIds = players.map(p => p.id);
    const playerMap = {};
    players.forEach(p => playerMap[p.id] = p.name);

    const circuits = await prisma.circuit.findMany({
      where: { name: { in: VALID_CIRCUITS } }
    });
    const validCircuitIds = circuits.map(c => c.id);
    const circuitMap = {};
    circuits.forEach(c => circuitMap[c.id] = c.name);

    console.log('👥 JUGADORES IDENTIFICADOS:');
    players.forEach(p => console.log(`   - ${p.name} (ID: ${p.id})`));
    
    console.log('\n🏁 CIRCUITOS IDENTIFICADOS:');
    circuits.forEach(c => console.log(`   - ${c.name} (ID: ${c.id})`));

    // 2. Analizar estado actual
    console.log('\n\n📊 ESTADO ACTUAL:\n');
    
    const totalLapTimes = await prisma.individualLapTime.count();
    const totalTurnCompletions = await prisma.turnCompletion.count();
    const totalGames = await prisma.game.count();
    
    console.log(`⏱️  Total Lap Times: ${totalLapTimes}`);
    console.log(`🏆 Total Turn Completions: ${totalTurnCompletions}`);
    console.log(`🎮 Total Games: ${totalGames}`);

    // 3. Identificar datos válidos (del game específico)
    console.log('\n\n✅ IDENTIFICANDO DATOS VÁLIDOS:\n');
    
    const validLapTimes = await prisma.individualLapTime.findMany({
      where: { 
        gameId: VALID_GAME_ID,
        playerId: { in: playerIds },
        circuitId: { in: validCircuitIds }
      }
    });
    
    const validTurnCompletions = await prisma.turnCompletion.findMany({
      where: {
        gameId: VALID_GAME_ID,
        playerId: { in: playerIds },
        circuitId: { in: validCircuitIds }
      }
    });
    
    console.log(`✅ Lap times válidos (Game ${VALID_GAME_ID}): ${validLapTimes.length}`);
    console.log(`✅ Turn completions válidos: ${validTurnCompletions.length}`);
    
    // Validar estructura esperada: 3 jugadores × 3 circuitos × 6 laps = 54 lap times
    if (validLapTimes.length !== 54) {
      console.log(`⚠️  ADVERTENCIA: Se esperaban 54 lap times, encontrados ${validLapTimes.length}`);
    }
    
    if (validTurnCompletions.length !== 18) {
      console.log(`⚠️  ADVERTENCIA: Se esperaban 18 turn completions, encontrados ${validTurnCompletions.length}`);
    }

    // 4. Identificar datos a eliminar
    console.log('\n\n🗑️  IDENTIFICANDO DATOS A ELIMINAR:\n');
    
    const invalidLapTimes = await prisma.individualLapTime.count({
      where: { 
        gameId: { not: VALID_GAME_ID }
      }
    });
    
    const invalidTurnCompletions = await prisma.turnCompletion.count({
      where: {
        gameId: { not: VALID_GAME_ID }
      }
    });
    
    const invalidGames = await prisma.game.count({
      where: {
        id: { not: VALID_GAME_ID }
      }
    });
    
    console.log(`🗑️  Lap times a eliminar: ${invalidLapTimes}`);
    console.log(`🗑️  Turn completions a eliminar: ${invalidTurnCompletions}`);
    console.log(`🗑️  Games a eliminar: ${invalidGames}`);

    // 5. Mostrar games que se eliminarán
    const gamesToDelete = await prisma.game.findMany({
      where: {
        id: { not: VALID_GAME_ID }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (gamesToDelete.length > 0) {
      console.log('\n🎮 GAMES A ELIMINAR:');
      gamesToDelete.forEach(game => {
        const ecuadorDate = toEcuadorTime(game.createdAt);
        console.log(`   - ${game.id} (${ecuadorDate}) - ${game.status}`);
      });
    }

    if (!dryRun) {
      console.log('\n\n🚀 EJECUTANDO LIMPIEZA...\n');

      // 6. Eliminar lap times inválidos
      console.log('🗑️  Step 1: Eliminando lap times inválidos...');
      const deletedLapTimes = await prisma.individualLapTime.deleteMany({
        where: { gameId: { not: VALID_GAME_ID } }
      });
      console.log(`   ✅ Eliminados ${deletedLapTimes.count} lap times`);

      // 7. Eliminar turn completions inválidos
      console.log('\n🗑️  Step 2: Eliminando turn completions inválidos...');
      const deletedTurnCompletions = await prisma.turnCompletion.deleteMany({
        where: { gameId: { not: VALID_GAME_ID } }
      });
      console.log(`   ✅ Eliminados ${deletedTurnCompletions.count} turn completions`);

      // 8. Eliminar games inválidos
      console.log('\n🗑️  Step 3: Eliminando games inválidos...');
      const deletedGames = await prisma.game.deleteMany({
        where: { id: { not: VALID_GAME_ID } }
      });
      console.log(`   ✅ Eliminados ${deletedGames.count} games`);

      // 9. Reset récords de circuitos no válidos
      console.log('\n🔄 Step 4: Reseteando récords de circuitos no jugados...');
      const allCircuits = await prisma.circuit.findMany();
      let circuitsReset = 0;
      
      for (const circuit of allCircuits) {
        // Si el circuito NO está en la lista válida, reset completo
        if (!validCircuitIds.includes(circuit.id)) {
          await prisma.circuit.update({
            where: { id: circuit.id },
            data: {
              historicalBestLap: null,
              historicalBestLapDate: null,
              bestLapHolderId: null,
              historicalBestAverage: null,
              historicalBestAverageDate: null,
              bestAverageHolderId: null
            }
          });
          circuitsReset++;
        }
      }
      console.log(`   ✅ Reset récords de ${circuitsReset} circuitos no jugados`);

      // 10. Recalcular récords de circuitos válidos
      console.log('\n📈 Step 5: Recalculando récords de circuitos del campeonato...');
      
      for (const circuit of circuits) {
        // Mejor vuelta del circuito
        const bestLapRecord = await prisma.individualLapTime.findFirst({
          where: {
            circuitId: circuit.id,
            gameId: VALID_GAME_ID
          },
          orderBy: { timeMs: 'asc' }
        });
        
        // Mejor promedio del circuito
        const bestAverageRecord = await prisma.turnCompletion.findFirst({
          where: {
            circuitId: circuit.id,
            gameId: VALID_GAME_ID,
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
          
          const vrInfo = updates.historicalBestLap 
            ? `VR: ${formatTime(updates.historicalBestLap)} (${playerMap[updates.bestLapHolderId]})` 
            : 'VR: -';
          const prInfo = updates.historicalBestAverage 
            ? `PR: ${formatTime(updates.historicalBestAverage)} (${playerMap[updates.bestAverageHolderId]})` 
            : 'PR: -';
          
          console.log(`   ✅ ${circuit.name}: ${vrInfo}, ${prInfo}`);
        }
      }
    }

    // 11. Verificación final
    console.log('\n\n📊 ESTADO FINAL:\n');
    
    const finalLapTimes = await prisma.individualLapTime.count();
    const finalTurnCompletions = await prisma.turnCompletion.count();
    const finalGames = await prisma.game.count();
    
    console.log(`⏱️  Lap Times finales: ${finalLapTimes} (eliminados: ${totalLapTimes - finalLapTimes})`);
    console.log(`🏆 Turn Completions finales: ${finalTurnCompletions} (eliminados: ${totalTurnCompletions - finalTurnCompletions})`);
    console.log(`🎮 Games finales: ${finalGames} (eliminados: ${totalGames - finalGames})`);

    // 12. Mostrar récords finales
    console.log('\n\n🏆 RÉCORDS FINALES POR CIRCUITO:\n');
    const finalCircuits = await prisma.circuit.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log('┌─────────────────────┬───────────────────────┬───────────────────────┐');
    console.log('│ Circuito            │ VR (Vuelta Rápida)    │ PR (Promedio)         │');
    console.log('├─────────────────────┼───────────────────────┼───────────────────────┤');
    
    for (const circuit of finalCircuits) {
      let vrInfo = '-';
      let prInfo = '-';
      
      if (circuit.historicalBestLap) {
        const vrTime = formatTime(circuit.historicalBestLap);
        const vrHolder = playerMap[circuit.bestLapHolderId] || 'Unknown';
        vrInfo = `${vrTime} (${vrHolder})`;
      }
      
      if (circuit.historicalBestAverage) {
        const prTime = formatTime(circuit.historicalBestAverage);
        const prHolder = playerMap[circuit.bestAverageHolderId] || 'Unknown';
        prInfo = `${prTime} (${prHolder})`;
      }
      
      console.log(`│ ${circuit.name.padEnd(19)} │ ${vrInfo.padEnd(21)} │ ${prInfo.padEnd(21)} │`);
    }
    console.log('└─────────────────────┴───────────────────────┴───────────────────────┘');

    // 13. Resumen por jugador
    console.log('\n\n👥 ESTADÍSTICAS FINALES POR JUGADOR:\n');
    
    for (const player of players) {
      const playerLapCount = await prisma.individualLapTime.count({
        where: { playerId: player.id }
      });
      
      const playerVRCount = await prisma.circuit.count({
        where: { bestLapHolderId: player.id }
      });
      
      const playerPRCount = await prisma.circuit.count({
        where: { bestAverageHolderId: player.id }
      });
      
      console.log(`${player.name}:`);
      console.log(`   - Lap times: ${playerLapCount}`);
      console.log(`   - Récords VR: ${playerVRCount}`);
      console.log(`   - Récords PR: ${playerPRCount}`);
    }

    console.log('\n🎉 Limpieza completada exitosamente!');
    console.log('\n📋 RESUMEN:');
    console.log('   ✅ Solo datos del campeonato del 27/08/2025 conservados');
    console.log('   ✅ 3 jugadores: Berna, Borgia, Juan');
    console.log('   ✅ 3 circuitos: Miami, COTA, Suzuka');
    console.log('   ✅ Récords históricos recalculados correctamente');
    console.log('   ✅ Base de datos limpia y consistente');

  } catch (error) {
    console.error('\n❌ Error durante la limpieza:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function toEcuadorTime(date) {
  return new Intl.DateTimeFormat('es-EC', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date(date));
}

function formatTime(ms) {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

// Ejecutar limpieza
console.log('╔═══════════════════════════════════════════════╗');
console.log('║    F1 Night - Limpieza al Campeonato Real     ║');
console.log('╚═══════════════════════════════════════════════╝\n');

if (process.argv.includes('--help')) {
  console.log('Uso: node cleanup-championship-2025.js [--dry-run]');
  console.log('\nEste script mantiene SOLO los datos del campeonato del 27/08/2025:');
  console.log('- Game ID: cmeuobvxx0000h6cel8ei0qau');
  console.log('- Jugadores: Berna, Borgia, Juan');
  console.log('- Circuitos: Miami, COTA, Suzuka');
  console.log('\nOpciones:');
  console.log('  --dry-run  Muestra qué se eliminaría sin hacer cambios');
  console.log('  --help     Muestra esta ayuda\n');
  process.exit(0);
}

cleanupToChampionshipOnly()
  .catch((error) => {
    console.error('\n💥 Limpieza falló:', error);
    process.exit(1);
  });