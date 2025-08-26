const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Helpers para formatear fechas
const formatDate = (date) => date ? date.toISOString().split('T')[0] : 'N/A';
const formatDateTime = (date) => date ? date.toISOString().replace('T', ' ').split('.')[0] : 'N/A';

async function analyzeDatabaseByDate() {
  console.log('🔍 F1 Night Database Analysis by Date\n');
  console.log(`📅 Analysis Date: ${formatDateTime(new Date())}`);
  console.log('─'.repeat(80));

  try {
    // 1. Resumen General de Tablas
    console.log('\n📊 RESUMEN GENERAL DE TABLAS');
    console.log('─'.repeat(40));
    
    const counts = {
      players: await prisma.player.count(),
      circuits: await prisma.circuit.count(),
      games: await prisma.game.count(),
      lapTimes: await prisma.individualLapTime.count(),
      turnCompletions: await prisma.turnCompletion.count(),
      tournaments: await prisma.tournament.count(),
      championships: await prisma.championship.count(),
      participants: await prisma.tournamentParticipant.count()
    };

    Object.entries(counts).forEach(([table, count]) => {
      console.log(`${table.padEnd(20)} : ${count.toLocaleString()} registros`);
    });

    // 2. Análisis de Games por Fecha
    console.log('\n\n🎮 ANÁLISIS DE GAMES POR FECHA');
    console.log('─'.repeat(40));
    
    const games = await prisma.game.findMany({
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        state: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (games.length > 0) {
      // Agrupar games por fecha de creación
      const gamesByDate = {};
      games.forEach(game => {
        const date = formatDate(game.createdAt);
        if (!gamesByDate[date]) {
          gamesByDate[date] = { active: 0, completed: 0, total: 0 };
        }
        gamesByDate[date].total++;
        if (game.status === 'ACTIVE') gamesByDate[date].active++;
        else gamesByDate[date].completed++;
      });

      console.log('\nGames por fecha de creación:');
      Object.entries(gamesByDate).forEach(([date, stats]) => {
        console.log(`${date}: ${stats.total} games (${stats.active} activos, ${stats.completed} completados)`);
      });

      // Mostrar primer y último game
      const firstGame = games[games.length - 1];
      const lastGame = games[0];
      console.log(`\n📅 Rango de fechas: ${formatDate(firstGame.createdAt)} - ${formatDate(lastGame.createdAt)}`);
      console.log(`🎮 Juegos activos actualmente: ${games.filter(g => g.status === 'ACTIVE').length}`);
    } else {
      console.log('No hay games registrados');
    }

    // 3. Análisis de Lap Times por Fecha
    console.log('\n\n⏱️  ANÁLISIS DE LAP TIMES POR FECHA');
    console.log('─'.repeat(40));

    const lapTimes = await prisma.individualLapTime.findMany({
      select: {
        gameId: true,
        createdAt: true,
        playerId: true,
        circuitId: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (lapTimes.length > 0) {
      // Agrupar lap times por fecha
      const lapTimesByDate = {};
      const uniqueGames = new Set();
      const uniquePlayers = new Set();

      lapTimes.forEach(lt => {
        const date = formatDate(lt.createdAt);
        if (!lapTimesByDate[date]) {
          lapTimesByDate[date] = 0;
        }
        lapTimesByDate[date]++;
        uniqueGames.add(lt.gameId);
        uniquePlayers.add(lt.playerId);
      });

      console.log('\nLap times por fecha:');
      Object.entries(lapTimesByDate).forEach(([date, count]) => {
        console.log(`${date}: ${count.toLocaleString()} tiempos registrados`);
      });

      const firstLap = lapTimes[lapTimes.length - 1];
      const lastLap = lapTimes[0];
      console.log(`\n📅 Rango de fechas: ${formatDate(firstLap.createdAt)} - ${formatDate(lastLap.createdAt)}`);
      console.log(`🎮 Games únicos con lap times: ${uniqueGames.size}`);
      console.log(`👥 Jugadores únicos con lap times: ${uniquePlayers.size}`);
    } else {
      console.log('No hay lap times registrados');
    }

    // 4. Análisis de Turn Completions por Fecha
    console.log('\n\n🏁 ANÁLISIS DE TURN COMPLETIONS POR FECHA');
    console.log('─'.repeat(40));

    const turnCompletions = await prisma.turnCompletion.findMany({
      select: {
        gameId: true,
        createdAt: true,
        completedAt: true,
        isCompleted: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (turnCompletions.length > 0) {
      // Agrupar turn completions por fecha
      const turnsByDate = {};
      turnCompletions.forEach(tc => {
        const date = formatDate(tc.createdAt);
        if (!turnsByDate[date]) {
          turnsByDate[date] = { total: 0, completed: 0 };
        }
        turnsByDate[date].total++;
        if (tc.isCompleted) turnsByDate[date].completed++;
      });

      console.log('\nTurn completions por fecha:');
      Object.entries(turnsByDate).forEach(([date, stats]) => {
        console.log(`${date}: ${stats.total} turnos (${stats.completed} completados)`);
      });

      const incompleteTurns = turnCompletions.filter(tc => !tc.isCompleted).length;
      console.log(`\n⚠️  Turnos incompletos: ${incompleteTurns}`);
    } else {
      console.log('No hay turn completions registrados');
    }

    // 5. Análisis de Récords en Circuitos
    console.log('\n\n🏆 ANÁLISIS DE RÉCORDS HISTÓRICOS EN CIRCUITOS');
    console.log('─'.repeat(40));

    const circuitsWithRecords = await prisma.circuit.findMany({
      where: {
        OR: [
          { historicalBestLap: { not: null } },
          { historicalBestAverage: { not: null } }
        ]
      },
      select: {
        name: true,
        historicalBestLap: true,
        historicalBestLapDate: true,
        bestLapHolderId: true,
        historicalBestAverage: true,
        historicalBestAverageDate: true,
        bestAverageHolderId: true
      }
    });

    if (circuitsWithRecords.length > 0) {
      console.log(`\n${circuitsWithRecords.length} circuitos tienen récords históricos:`);
      
      const recordDates = [];
      circuitsWithRecords.forEach(circuit => {
        console.log(`\n🏁 ${circuit.name}:`);
        if (circuit.historicalBestLap) {
          console.log(`   Mejor vuelta: ${circuit.historicalBestLap}ms (${formatDate(circuit.historicalBestLapDate)})`);
          console.log(`   Poseedor: ${circuit.bestLapHolderId || 'SIN JUGADOR'}`);
          if (circuit.historicalBestLapDate) recordDates.push(circuit.historicalBestLapDate);
        }
        if (circuit.historicalBestAverage) {
          console.log(`   Mejor promedio: ${circuit.historicalBestAverage}ms (${formatDate(circuit.historicalBestAverageDate)})`);
          console.log(`   Poseedor: ${circuit.bestAverageHolderId || 'SIN JUGADOR'}`);
          if (circuit.historicalBestAverageDate) recordDates.push(circuit.historicalBestAverageDate);
        }
      });

      // Análisis de fechas de récords
      if (recordDates.length > 0) {
        recordDates.sort((a, b) => a - b);
        console.log(`\n📅 Rango de fechas de récords: ${formatDate(recordDates[0])} - ${formatDate(recordDates[recordDates.length - 1])}`);
      }

      // Detectar récords huérfanos
      const orphanRecords = circuitsWithRecords.filter(c => 
        (c.historicalBestLap && !c.bestLapHolderId) || 
        (c.historicalBestAverage && !c.bestAverageHolderId)
      );
      if (orphanRecords.length > 0) {
        console.log(`\n⚠️  ${orphanRecords.length} circuitos tienen récords sin jugador asociado`);
      }
    } else {
      console.log('No hay récords históricos registrados');
    }

    // 6. Análisis de Torneos y Campeonatos
    console.log('\n\n🏆 ANÁLISIS DE TORNEOS Y CAMPEONATOS');
    console.log('─'.repeat(40));

    const tournaments = await prisma.tournament.findMany({
      include: {
        championships: true,
        participants: true
      },
      orderBy: { startDate: 'desc' }
    });

    if (tournaments.length > 0) {
      tournaments.forEach(tournament => {
        console.log(`\n🏆 ${tournament.name} (${tournament.status})`);
        console.log(`   Fecha inicio: ${formatDate(tournament.startDate)}`);
        console.log(`   Fecha fin: ${tournament.endDate ? formatDate(tournament.endDate) : 'En curso'}`);
        console.log(`   Campeonatos: ${tournament.championships.length}/${tournament.maxChampionships}`);
        console.log(`   Participantes: ${tournament.participants.length}`);
      });
    } else {
      console.log('No hay torneos registrados');
    }

    // 7. Análisis de Integridad de Datos
    console.log('\n\n🔍 ANÁLISIS DE INTEGRIDAD DE DATOS');
    console.log('─'.repeat(40));

    // Verificar lap times huérfanos (sin game válido)
    const gameIds = games.map(g => g.id);
    const orphanLapTimes = await prisma.individualLapTime.count({
      where: {
        gameId: {
          notIn: gameIds.length > 0 ? gameIds : ['dummy']
        }
      }
    });

    // Verificar turn completions huérfanos
    const orphanTurns = await prisma.turnCompletion.count({
      where: {
        gameId: {
          notIn: gameIds.length > 0 ? gameIds : ['dummy']
        }
      }
    });

    // Verificar jugadores referenciados
    const playerIds = await prisma.player.findMany({ select: { id: true } });
    const validPlayerIds = playerIds.map(p => p.id);

    console.log(`\n⚠️  Lap times huérfanos (sin game): ${orphanLapTimes}`);
    console.log(`⚠️  Turn completions huérfanos (sin game): ${orphanTurns}`);
    console.log(`⚠️  Récords sin jugador: ${circuitsWithRecords.filter(c => !c.bestLapHolderId || !c.bestAverageHolderId).length}`);

    // 8. Recomendaciones de Limpieza
    console.log('\n\n💡 RECOMENDACIONES DE LIMPIEZA');
    console.log('─'.repeat(40));

    const recommendations = [];

    if (games.filter(g => g.status === 'ACTIVE').length > 1) {
      recommendations.push('- Múltiples juegos activos detectados. Considerar cerrar juegos antiguos.');
    }

    if (orphanLapTimes > 0 || orphanTurns > 0) {
      recommendations.push('- Existen registros huérfanos que referencian juegos inexistentes.');
    }

    if (circuitsWithRecords.some(c => !c.bestLapHolderId || !c.bestAverageHolderId)) {
      recommendations.push('- Hay récords sin jugador asociado. Considerar limpiar estos récords.');
    }

    const oldestGameDate = games.length > 0 ? games[games.length - 1].createdAt : null;
    if (oldestGameDate && (new Date() - oldestGameDate) / (1000 * 60 * 60 * 24) > 30) {
      recommendations.push('- Hay datos de más de 30 días. Considerar archivar o eliminar juegos antiguos.');
    }

    if (recommendations.length > 0) {
      recommendations.forEach(rec => console.log(rec));
    } else {
      console.log('✅ La base de datos parece estar en buen estado.');
    }

    console.log('\n' + '─'.repeat(80));
    console.log('✅ Análisis completado');

  } catch (error) {
    console.error('\n❌ Error durante el análisis:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar análisis
analyzeDatabaseByDate()
  .catch((error) => {
    console.error('\n💥 Análisis falló:', error);
    process.exit(1);
  });