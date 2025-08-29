const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeChampionshipData() {
  console.log('🏁 Análisis Detallado del Campeonato del 27 Agosto\n');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // 1. Obtener jugadores y circuitos específicos
    const players = await prisma.player.findMany({
      where: {
        name: { in: ['Berna', 'Borgia', 'Juan'] }
      },
      orderBy: { name: 'asc' }
    });

    const circuits = await prisma.circuit.findMany({
      where: {
        name: { in: ['Miami', 'COTA', 'Suzuka'] }
      },
      orderBy: { name: 'asc' }
    });

    console.log('👥 JUGADORES DEL CAMPEONATO:');
    players.forEach(p => console.log(`   - ${p.name} (ID: ${p.id})`));

    console.log('\n🏁 CIRCUITOS DEL CAMPEONATO:');
    circuits.forEach(c => console.log(`   - ${c.name} (ID: ${c.id})`));

    // 2. Buscar todos los lap times de estos jugadores en estos circuitos
    console.log('\n\n📊 ANÁLISIS TEMPORAL DE LAP TIMES\n');
    
    const allLapTimes = await prisma.individualLapTime.findMany({
      where: {
        playerId: { in: players.map(p => p.id) },
        circuitId: { in: circuits.map(c => c.id) }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    // Create maps for lookup
    const circuitMap = {};
    circuits.forEach(c => circuitMap[c.id] = c.name);
    
    const playerMap = {};
    players.forEach(p => playerMap[p.id] = p.name);

    console.log(`Total lap times encontrados: ${allLapTimes.length}\n`);

    // Agrupar por fecha (hora Ecuador)
    const lapTimesByDate = {};
    allLapTimes.forEach(lap => {
      const ecuadorDate = toEcuadorTime(lap.createdAt).split(',')[0]; // Solo la fecha
      if (!lapTimesByDate[ecuadorDate]) {
        lapTimesByDate[ecuadorDate] = [];
      }
      lapTimesByDate[ecuadorDate].push(lap);
    });

    Object.keys(lapTimesByDate).sort().forEach(date => {
      console.log(`📅 ${date}:`);
      const lapsThisDate = lapTimesByDate[date];
      console.log(`   Total: ${lapsThisDate.length} lap times`);
      
      // Por circuito
      const byCircuit = {};
      lapsThisDate.forEach(lap => {
        const circuitName = circuitMap[lap.circuitId];
        if (!byCircuit[circuitName]) byCircuit[circuitName] = [];
        byCircuit[circuitName].push(lap);
      });
      
      Object.keys(byCircuit).forEach(circuitName => {
        console.log(`   ${circuitName}: ${byCircuit[circuitName].length} laps`);
      });

      // Rango de horas
      if (lapsThisDate.length > 0) {
        const firstTime = toEcuadorTime(lapsThisDate[0].createdAt);
        const lastTime = toEcuadorTime(lapsThisDate[lapsThisDate.length - 1].createdAt);
        console.log(`   Horario: ${firstTime.split(', ')[1]} - ${lastTime.split(', ')[1]}`);
      }
      console.log('');
    });

    // 3. Análisis específico del 27 de agosto
    console.log('\n🎯 ANÁLISIS DETALLADO DEL 27 DE AGOSTO\n');

    const aug27LapTimes = allLapTimes.filter(lap => {
      const ecuadorDate = toEcuadorTime(lap.createdAt);
      return ecuadorDate.startsWith('27/08/2025');
    });

    console.log(`Lap times del 27/08: ${aug27LapTimes.length}`);

    if (aug27LapTimes.length > 0) {
      // Por jugador y circuito
      console.log('\n📈 DISTRIBUCIÓN POR JUGADOR Y CIRCUITO:\n');
      
      for (const player of players) {
        console.log(`${player.name}:`);
        for (const circuit of circuits) {
          const playerCircuitLaps = aug27LapTimes.filter(lap => 
            lap.playerId === player.id && lap.circuitId === circuit.id
          );
          
          if (playerCircuitLaps.length > 0) {
            console.log(`   ${circuit.name}: ${playerCircuitLaps.length} laps`);
            
            // Agrupar por turno
            const byTurn = {};
            playerCircuitLaps.forEach(lap => {
              if (!byTurn[lap.turnNumber]) byTurn[lap.turnNumber] = [];
              byTurn[lap.turnNumber].push(lap);
            });
            
            Object.keys(byTurn).sort().forEach(turn => {
              const turnLaps = byTurn[turn];
              const times = turnLaps.map(lap => formatTime(lap.timeMs)).join(', ');
              console.log(`     Turno ${turn}: ${turnLaps.length} vueltas (${times})`);
            });
          } else {
            console.log(`   ${circuit.name}: 0 laps`);
          }
        }
        console.log('');
      }

      // Mejores tiempos por circuito
      console.log('🏆 MEJORES TIEMPOS POR CIRCUITO (27/08):\n');
      
      for (const circuit of circuits) {
        console.log(`${circuit.name}:`);
        const circuitLaps = aug27LapTimes.filter(lap => lap.circuitId === circuit.id);
        
        if (circuitLaps.length > 0) {
          // Mejor vuelta
          const fastestLap = circuitLaps.reduce((best, lap) => 
            lap.timeMs < best.timeMs ? lap : best
          );
          const fastestPlayerName = playerMap[fastestLap.playerId];
          console.log(`   VR: ${formatTime(fastestLap.timeMs)} (${fastestPlayerName})`);
          
          // Mejores promedios por jugador
          const playerAverages = {};
          for (const player of players) {
            const playerLaps = circuitLaps.filter(lap => lap.playerId === player.id);
            if (playerLaps.length >= 3) {
              const avgTime = playerLaps.reduce((sum, lap) => sum + lap.timeMs, 0) / playerLaps.length;
              playerAverages[player.name] = avgTime;
            }
          }
          
          if (Object.keys(playerAverages).length > 0) {
            const bestAvg = Object.entries(playerAverages).reduce((best, [name, time]) => 
              time < best.time ? { name, time } : best
            );
            console.log(`   PR: ${formatTime(Math.round(bestAvg.time))} (${bestAvg.name})`);
          }
        } else {
          console.log('   No hay datos');
        }
        console.log('');
      }
    }

    // 4. Verificar datos de otros días que deberían eliminarse
    console.log('\n🗑️ DATOS A ELIMINAR (anteriores al 27/08 o de prueba):\n');

    const testDataLapTimes = allLapTimes.filter(lap => {
      const ecuadorDate = toEcuadorTime(lap.createdAt);
      return !ecuadorDate.startsWith('27/08/2025');
    });

    console.log(`Lap times de prueba a eliminar: ${testDataLapTimes.length}`);
    
    if (testDataLapTimes.length > 0) {
      const testByDate = {};
      testDataLapTimes.forEach(lap => {
        const date = toEcuadorTime(lap.createdAt).split(',')[0];
        testByDate[date] = (testByDate[date] || 0) + 1;
      });
      
      Object.keys(testByDate).sort().forEach(date => {
        console.log(`   ${date}: ${testByDate[date]} registros`);
      });
    }

    // 5. Análisis de turn completions
    console.log('\n\n🏁 ANÁLISIS DE TURN COMPLETIONS:\n');

    const turnCompletions = await prisma.turnCompletion.findMany({
      where: {
        playerId: { in: players.map(p => p.id) },
        circuitId: { in: circuits.map(c => c.id) }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Total turn completions: ${turnCompletions.length}`);

    const aug27Turns = turnCompletions.filter(turn => {
      const ecuadorDate = toEcuadorTime(turn.createdAt);
      return ecuadorDate.startsWith('27/08/2025');
    });

    console.log(`Turn completions del 27/08: ${aug27Turns.length}`);

    if (aug27Turns.length > 0) {
      console.log('\nPor jugador y circuito:');
      for (const player of players) {
        console.log(`${player.name}:`);
        for (const circuit of circuits) {
          const playerTurns = aug27Turns.filter(turn => 
            turn.playerId === player.id && turn.circuitId === circuit.id
          );
          console.log(`   ${circuit.name}: ${playerTurns.length} turnos completados`);
        }
      }
    }

    // 6. Análisis de games
    console.log('\n\n🎮 ANÁLISIS DE GAMES:\n');

    const games = await prisma.game.findMany({
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Total games: ${games.length}`);

    games.forEach((game, index) => {
      const ecuadorDate = toEcuadorTime(game.createdAt);
      console.log(`Game ${index + 1}:`);
      console.log(`   Fecha: ${ecuadorDate}`);
      console.log(`   Estado: ${game.status}`);
      console.log(`   ID: ${game.id}`);
      
      if (game.state && game.state.settings) {
        const gameState = game.state;
        console.log(`   Jugadores: ${gameState.settings.players ? gameState.settings.players.length : 'N/A'}`);
        console.log(`   Circuitos: ${gameState.settings.circuits ? gameState.settings.circuits.length : 'N/A'}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function toEcuadorTime(date) {
  // Convert to Ecuador time (UTC-5)
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

// Execute analysis
analyzeChampionshipData();