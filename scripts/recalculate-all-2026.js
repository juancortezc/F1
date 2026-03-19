const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recalculateAll2026() {
  try {
    // Obtener todos los juegos de 2026
    const games = await prisma.game.findMany({
      where: {
        createdAt: {
          gte: new Date('2026-01-01'),
          lt: new Date('2027-01-01')
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`\n🔄 Recalculando ${games.length} campeonatos del 2026...\n`);

    for (const game of games) {
      console.log(`\n${'═'.repeat(50)}`);
      console.log(`📊 Procesando: ${game.id}`);
      console.log(`   Status: ${game.status}`);
      console.log(`   Creado: ${new Date(game.createdAt).toLocaleDateString()}`);
      console.log('═'.repeat(50));

      const gameState = game.state;

      // Obtener todos los lap times de este juego
      const lapTimes = await prisma.individualLapTime.findMany({
        where: { gameId: game.id },
        orderBy: [
          { circuitId: 'asc' },
          { turnNumber: 'asc' },
          { playerId: 'asc' },
          { lapNumber: 'asc' }
        ]
      });

      console.log(`   Lap times encontrados: ${lapTimes.length}`);

      // Recalcular desde cero
      const newPlayerStats = {};
      gameState.settings.players.forEach(p => {
        newPlayerStats[p.id] = { totalScore: 0, bestLaps: 0, bestAverages: 0 };
      });

      const updatedCircuitResults = [];

      // Procesar cada circuito
      gameState.circuits.forEach((circuit, circuitIndex) => {
        const circuitLapTimes = lapTimes.filter(lt => lt.circuitId === circuit.id);

        if (circuitLapTimes.length === 0) {
          updatedCircuitResults.push({ circuitId: circuit.id, turns: [] });
          return;
        }

        // Agrupar por turno
        const turnNumbers = [...new Set(circuitLapTimes.map(lt => lt.turnNumber))].sort();
        const turns = [];

        turnNumbers.forEach(turnNum => {
          const turnLaps = circuitLapTimes.filter(lt => lt.turnNumber === turnNum);

          // Agrupar por jugador
          const playerIds = [...new Set(turnLaps.map(lt => lt.playerId))];
          const turnResults = [];

          playerIds.forEach(playerId => {
            const playerLaps = turnLaps.filter(lt => lt.playerId === playerId).map(lt => lt.timeMs);

            if (playerLaps.length > 0) {
              // Calcular promedio con TODAS las vueltas
              const averageTime = Math.round(playerLaps.reduce((a, b) => a + b, 0) / playerLaps.length);

              turnResults.push({
                playerId,
                averageTime,
                lapTimes: playerLaps,
                turnScore: 0 // Se calculará después
              });
            }
          });

          // Ordenar por promedio (menor = mejor) y asignar puntos
          turnResults.sort((a, b) => a.averageTime - b.averageTime);
          const pointsArray = [3, 2, 1];

          turnResults.forEach((result, idx) => {
            const points = pointsArray[idx] || 0;
            result.turnScore = points;
            newPlayerStats[result.playerId].totalScore += points;
          });

          turns.push(turnResults);
        });

        // Encontrar mejor vuelta del circuito
        const allCircuitLaps = circuitLapTimes.map(lt => ({ playerId: lt.playerId, time: lt.timeMs }));
        if (allCircuitLaps.length > 0) {
          const fastestLap = allCircuitLaps.reduce((min, lap) => lap.time < min.time ? lap : min);

          // Otorgar 2 puntos bonus
          newPlayerStats[fastestLap.playerId].totalScore += 2;
          newPlayerStats[fastestLap.playerId].bestLaps += 1;

          // Actualizar turnScore del jugador que hizo la vuelta rápida
          // (sumar 2 al último turno donde participó)
          for (let i = turns.length - 1; i >= 0; i--) {
            const playerTurn = turns[i].find(t => t.playerId === fastestLap.playerId);
            if (playerTurn) {
              playerTurn.turnScore += 2;
              break;
            }
          }
        }

        updatedCircuitResults.push({
          circuitId: circuit.id,
          turns
        });
      });

      // Actualizar el juego
      const updatedGameState = {
        ...gameState,
        playerStats: newPlayerStats,
        circuitResults: updatedCircuitResults
      };

      await prisma.game.update({
        where: { id: game.id },
        data: { state: updatedGameState }
      });

      console.log('\n   ✅ Puntos actualizados:');
      Object.entries(newPlayerStats)
        .sort(([, a], [, b]) => b.totalScore - a.totalScore)
        .forEach(([playerId, stats]) => {
          const playerName = gameState.settings.players.find(p => p.id === playerId)?.name || playerId;
          console.log(`      ${playerName}: ${stats.totalScore} pts (VR: ${stats.bestLaps})`);
        });
    }

    console.log('\n\n' + '═'.repeat(50));
    console.log('✅ RECALCULACIÓN COMPLETADA');
    console.log('═'.repeat(50));
    console.log(`\n${games.length} campeonatos actualizados con la lógica correcta:\n`);
    console.log('  • Puntos por posición: 3, 2, 1');
    console.log('  • Promedio con TODAS las vueltas (incluye 2:00.000)');
    console.log('  • Vuelta rápida: +2 pts por circuito\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

recalculateAll2026();
