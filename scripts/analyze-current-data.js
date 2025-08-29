const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeData() {
  console.log('🔍 Análisis Detallado de Datos - F1 Night\n');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // 1. Análisis de fechas y timezone
    console.log('📅 ANÁLISIS DE FECHAS Y HORAS\n');
    
    const earliestLapTime = await prisma.individualLapTime.findFirst({
      orderBy: { createdAt: 'asc' }
    });
    
    const latestLapTime = await prisma.individualLapTime.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (earliestLapTime) {
      console.log(`Primer lap time registrado:`);
      console.log(`  - Fecha UTC: ${earliestLapTime.createdAt}`);
      console.log(`  - Fecha Ecuador (UTC-5): ${toEcuadorTime(earliestLapTime.createdAt)}`);
    }
    
    if (latestLapTime) {
      console.log(`\nÚltimo lap time registrado:`);
      console.log(`  - Fecha UTC: ${latestLapTime.createdAt}`);
      console.log(`  - Fecha Ecuador (UTC-5): ${toEcuadorTime(latestLapTime.createdAt)}`);
    }

    // 2. Distribución de datos por fecha
    console.log('\n\n📊 DISTRIBUCIÓN DE DATOS POR FECHA\n');
    
    const lapTimesByDate = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Guayaquil') as date_ec,
        COUNT(*) as count
      FROM individual_lap_times
      GROUP BY date_ec
      ORDER BY date_ec
    `;
    
    console.log('Lap times por fecha (hora Ecuador):');
    lapTimesByDate.forEach(row => {
      console.log(`  ${row.date_ec}: ${row.count} registros`);
    });

    // 3. Análisis del 27 de agosto
    console.log('\n\n🎯 ANÁLISIS DEL 27 DE AGOSTO (HORA ECUADOR)\n');
    
    const startDate = new Date('2025-08-27T00:00:00-05:00'); // Ecuador time
    const endDate = new Date('2025-08-28T00:00:00-05:00'); // Ecuador time
    
    // Convertir a UTC para la consulta
    const startUTC = new Date(startDate.getTime() + 5 * 60 * 60 * 1000);
    const endUTC = new Date(endDate.getTime() + 5 * 60 * 60 * 1000);
    
    const lapTimes27Aug = await prisma.individualLapTime.findMany({
      where: {
        createdAt: {
          gte: startUTC,
          lt: endUTC
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`Total de lap times del 27/08: ${lapTimes27Aug.length}`);
    
    if (lapTimes27Aug.length > 0) {
      console.log('\nDistribución por hora:');
      const byHour = {};
      lapTimes27Aug.forEach(lap => {
        const hour = toEcuadorTime(lap.createdAt).split(' ')[1].split(':')[0];
        byHour[hour] = (byHour[hour] || 0) + 1;
      });
      
      Object.keys(byHour).sort().forEach(hour => {
        console.log(`  ${hour}:00 - ${hour}:59 : ${byHour[hour]} registros`);
      });
    }

    // 4. Campeonatos y ganadores
    console.log('\n\n🏆 CAMPEONATOS Y GANADORES\n');
    
    const championships = await prisma.championship.findMany({
      include: {
        tournament: true
      }
    });
    
    console.log(`Total de campeonatos: ${championships.length}`);
    
    for (const championship of championships) {
      console.log(`\n${championship.name}:`);
      console.log(`  - Torneo: ${championship.tournament.name}`);
      console.log(`  - Estado: ${championship.status}`);
      console.log(`  - Creado: ${toEcuadorTime(championship.createdAt)}`);
      
      if (championship.gameState && championship.gameState.playerStats) {
        const stats = championship.gameState.playerStats;
        const players = await prisma.player.findMany();
        
        const playerScores = [];
        for (const player of players) {
          if (stats[player.id]) {
            playerScores.push({
              name: player.name,
              score: stats[player.id].totalScore || 0
            });
          }
        }
        
        playerScores.sort((a, b) => b.score - a.score);
        console.log('  - Resultados:');
        playerScores.forEach((p, idx) => {
          console.log(`    ${idx + 1}. ${p.name}: ${p.score} puntos`);
        });
      }
    }

    // 5. Récords por circuito
    console.log('\n\n🏁 RÉCORDS POR CIRCUITO\n');
    
    const circuits = await prisma.circuit.findMany({
      orderBy: { name: 'asc' }
    });
    
    const players = await prisma.player.findMany();
    const playerMap = {};
    players.forEach(p => playerMap[p.id] = p.name);
    
    console.log('┌─────────────────────┬───────────────────────┬───────────────────────┐');
    console.log('│ Circuito            │ VR (Vuelta Rápida)    │ PR (Promedio)         │');
    console.log('├─────────────────────┼───────────────────────┼───────────────────────┤');
    
    for (const circuit of circuits) {
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

    // 6. Estadísticas por jugador
    console.log('\n\n👥 ESTADÍSTICAS POR JUGADOR\n');
    
    for (const player of players) {
      console.log(`\n${player.name}:`);
      
      // Lap times
      const playerLapTimes = await prisma.individualLapTime.count({
        where: { playerId: player.id }
      });
      console.log(`  - Total lap times: ${playerLapTimes}`);
      
      // Récords de vuelta
      const vrCount = await prisma.circuit.count({
        where: { bestLapHolderId: player.id }
      });
      console.log(`  - Récords VR: ${vrCount}`);
      
      // Récords de promedio
      const prCount = await prisma.circuit.count({
        where: { bestAverageHolderId: player.id }
      });
      console.log(`  - Récords PR: ${prCount}`);
      
      // Campeonatos ganados (verificar en gameState)
      let championshipsWon = 0;
      for (const championship of championships) {
        if (championship.gameState && championship.gameState.playerStats) {
          const stats = championship.gameState.playerStats;
          const scores = Object.entries(stats)
            .map(([id, data]) => ({ id, score: data.totalScore || 0 }))
            .sort((a, b) => b.score - a.score);
          
          if (scores.length > 0 && scores[0].id === player.id) {
            championshipsWon++;
          }
        }
      }
      console.log(`  - Campeonatos ganados: ${championshipsWon}`);
    }

    // 7. Datos para limpieza del 27 antes de las 19:00
    console.log('\n\n🗑️ DATOS A LIMPIAR (27/08 antes de 19:00 Ecuador)\n');
    
    const cutoffEcuador = new Date('2025-08-27T19:00:00-05:00');
    const cutoffUTC = new Date(cutoffEcuador.getTime() + 5 * 60 * 60 * 1000);
    
    const toDelete = await prisma.individualLapTime.count({
      where: { createdAt: { lt: cutoffUTC } }
    });
    
    const toKeep = await prisma.individualLapTime.count({
      where: { createdAt: { gte: cutoffUTC } }
    });
    
    console.log(`Lap times a eliminar (antes de 19:00): ${toDelete}`);
    console.log(`Lap times a mantener (19:00 en adelante): ${toKeep}`);

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function toEcuadorTime(date) {
  // Convert UTC to Ecuador time (UTC-5)
  const ecuadorTime = new Date(date.getTime() - 5 * 60 * 60 * 1000);
  return ecuadorTime.toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

function formatTime(ms) {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

// Execute analysis
analyzeData();