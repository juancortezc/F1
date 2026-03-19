const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAndRecalculate() {
  try {
    const game = await prisma.game.findFirst({
      where: { status: 'ACTIVE' }
    });

    if (!game) {
      console.log('❌ No hay campeonato activo');
      return;
    }

    console.log('\n🔄 Recalculando puntos de Australia desde lap times...\n');

    const gameState = game.state;
    const australiaId = 'cmd7vv65x0000mgf2vphb96zq';

    // Obtener todos los lap times de Australia
    const lapTimes = await prisma.individualLapTime.findMany({
      where: {
        gameId: game.id,
        circuitId: australiaId
      },
      orderBy: [
        { playerId: 'asc' },
        { turnNumber: 'asc' },
        { lapNumber: 'asc' }
      ]
    });

    console.log(`📊 Tiempos encontrados: ${lapTimes.length} vueltas\n`);

    // Agrupar por jugador y turno
    const playerTurns = {};

    lapTimes.forEach(lap => {
      const key = `${lap.playerId}_T${lap.turnNumber}`;
      if (!playerTurns[key]) {
        playerTurns[key] = {
          playerId: lap.playerId,
          turnNumber: lap.turnNumber,
          laps: []
        };
      }
      playerTurns[key].laps.push(lap.timeMs);
    });

    // Calcular promedios por turno
    const turnsData = { 1: [], 2: [] };

    Object.values(playerTurns).forEach(pt => {
      const avg = Math.round(pt.laps.reduce((a, b) => a + b, 0) / pt.laps.length);
      turnsData[pt.turnNumber].push({
        playerId: pt.playerId,
        averageTime: avg,
        laps: pt.laps
      });
    });

    // Ordenar por promedio (menor = mejor)
    turnsData[1].sort((a, b) => a.averageTime - b.averageTime);
    turnsData[2].sort((a, b) => a.averageTime - b.averageTime);

    const playerNames = {
      '1': 'BlackMamba',
      '2': 'Berna',
      '3': 'Borgia'
    };

    console.log('═══════════════════════════════════════');
    console.log('TURNO 1');
    console.log('═══════════════════════════════════════');
    turnsData[1].forEach((p, idx) => {
      const pts = [3, 2, 1][idx];
      const formatTime = (ms) => {
        const min = Math.floor(ms / 60000);
        const sec = Math.floor((ms % 60000) / 1000);
        const millis = ms % 1000;
        return `${min}:${sec.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
      };
      console.log(`${idx + 1}° ${playerNames[p.playerId]}: ${formatTime(p.averageTime)} promedio → ${pts} pts`);
    });

    console.log('\n═══════════════════════════════════════');
    console.log('TURNO 2');
    console.log('═══════════════════════════════════════');
    turnsData[2].forEach((p, idx) => {
      const pts = [3, 2, 1][idx];
      const formatTime = (ms) => {
        const min = Math.floor(ms / 60000);
        const sec = Math.floor((ms % 60000) / 1000);
        const millis = ms % 1000;
        return `${min}:${sec.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
      };
      console.log(`${idx + 1}° ${playerNames[p.playerId]}: ${formatTime(p.averageTime)} promedio → ${pts} pts`);
    });

    // Encontrar vuelta rápida del circuito
    const allLapsFlat = lapTimes.map(l => ({ playerId: l.playerId, time: l.timeMs }));
    const fastest = allLapsFlat.reduce((min, lap) => lap.time < min.time ? lap : min);

    console.log('\n🔥 VUELTA RÁPIDA DEL CIRCUITO:');
    console.log(`   ${playerNames[fastest.playerId]}: ${fastest.time}ms → +2 pts`);

    // Calcular puntos totales
    const playerPoints = { '1': 0, '2': 0, '3': 0 };
    const pointsArray = [3, 2, 1];

    // T1
    turnsData[1].forEach((p, idx) => {
      playerPoints[p.playerId] += pointsArray[idx];
    });

    // T2
    turnsData[2].forEach((p, idx) => {
      playerPoints[p.playerId] += pointsArray[idx];
    });

    // Vuelta rápida
    playerPoints[fastest.playerId] += 2;

    console.log('\n═══════════════════════════════════════');
    console.log('🏆 TOTALES AUSTRALIA');
    console.log('═══════════════════════════════════════');
    Object.entries(playerPoints)
      .sort(([, a], [, b]) => b - a)
      .forEach(([playerId, pts]) => {
        console.log(`${playerNames[playerId]}: ${pts} pts`);
      });

    console.log('\n✅ Recalculación completada');
    console.log('⚠️  Para aplicar estos cambios, ejecuta el script de recálculo completo');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAndRecalculate();
