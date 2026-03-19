const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeSpa() {
  const game = await prisma.game.findFirst({ where: { status: 'ACTIVE' } });

  // Obtener todos los lap times de Spa del juego actual
  const spaLapTimes = await prisma.individualLapTime.findMany({
    where: {
      gameId: game.id,
      circuitId: 'cmd7vv6fq0002mgf28u3s10qv' // Spa ID
    },
    orderBy: { timeMs: 'asc' }
  });

  console.log('\n🏁 ANÁLISIS DETALLADO - SPA\n');
  console.log('═'.repeat(60));

  // Agrupar por turno
  const t1Laps = spaLapTimes.filter(l => l.turnNumber === 1);
  const t2Laps = spaLapTimes.filter(l => l.turnNumber === 2);

  console.log('\n📊 TURNO 1:\n');
  ['1', '2', '3'].forEach(playerId => {
    const playerLaps = t1Laps.filter(l => l.playerId === playerId);
    const playerName = playerId === '1' ? 'BlackMamba' : playerId === '2' ? 'Berna' : 'Borgia';
    const times = playerLaps.map(l => l.timeMs);
    const best = Math.min(...times);
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);

    console.log(`   ${playerName}:`);
    console.log(`      Vueltas: ${times.join(', ')}ms`);
    console.log(`      Mejor: ${best}ms | Promedio: ${avg}ms`);
  });

  console.log('\n📊 TURNO 2:\n');
  ['1', '2', '3'].forEach(playerId => {
    const playerLaps = t2Laps.filter(l => l.playerId === playerId);
    const playerName = playerId === '1' ? 'BlackMamba' : playerId === '2' ? 'Berna' : 'Borgia';
    const times = playerLaps.map(l => l.timeMs);
    const best = Math.min(...times);
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);

    console.log(`   ${playerName}:`);
    console.log(`      Vueltas: ${times.join(', ')}ms`);
    console.log(`      Mejor: ${best}ms | Promedio: ${avg}ms`);
  });

  console.log('\n🏆 VUELTA RÁPIDA DEL CIRCUITO SPA:\n');
  const allLaps = spaLapTimes.map(l => ({ player: l.playerId, time: l.timeMs }));
  const bestCircuitLap = allLaps.reduce((min, lap) => lap.time < min.time ? lap : min);
  const vrPlayer = bestCircuitLap.player === '1' ? 'BlackMamba' : bestCircuitLap.player === '2' ? 'Berna' : 'Borgia';

  console.log(`   Mejor vuelta: ${bestCircuitLap.time}ms`);
  console.log(`   Dueño de VR: ${vrPlayer}`);

  console.log('\n📝 CÁLCULO DE PUNTOS CORRECTO:\n');

  // Calcular posiciones T1 por promedio
  const t1Players = ['1', '2', '3'].map(id => {
    const laps = t1Laps.filter(l => l.playerId === id);
    const avg = laps.reduce((a, b) => a + b.timeMs, 0) / laps.length;
    return { id, avg };
  }).sort((a, b) => a.avg - b.avg);

  console.log('   TURNO 1 (por promedio):');
  t1Players.forEach((p, idx) => {
    const name = p.id === '1' ? 'BlackMamba' : p.id === '2' ? 'Berna' : 'Borgia';
    const points = idx === 0 ? 3 : idx === 1 ? 2 : 1;
    console.log(`      ${idx + 1}. ${name}: ${points} pts`);
  });

  // Calcular posiciones T2 por promedio
  const t2Players = ['1', '2', '3'].map(id => {
    const laps = t2Laps.filter(l => l.playerId === id);
    const avg = laps.reduce((a, b) => a + b.timeMs, 0) / laps.length;
    return { id, avg };
  }).sort((a, b) => a.avg - b.avg);

  console.log('\n   TURNO 2 (por promedio):');
  t2Players.forEach((p, idx) => {
    const name = p.id === '1' ? 'BlackMamba' : p.id === '2' ? 'Berna' : 'Borgia';
    const points = idx === 0 ? 3 : idx === 1 ? 2 : 1;
    console.log(`      ${idx + 1}. ${name}: ${points} pts`);
  });

  console.log('\n   VUELTA RÁPIDA CIRCUITO:');
  console.log(`      ${vrPlayer}: +2 pts`);

  console.log('\n═'.repeat(60));
  console.log('\n✅ PUNTOS TOTALES CORRECTOS DE SPA:\n');

  const finalPoints = { '1': 0, '2': 0, '3': 0 };

  // T1 points
  t1Players.forEach((p, idx) => {
    finalPoints[p.id] += idx === 0 ? 3 : idx === 1 ? 2 : 1;
  });

  // T2 points
  t2Players.forEach((p, idx) => {
    finalPoints[p.id] += idx === 0 ? 3 : idx === 1 ? 2 : 1;
  });

  // VR points
  finalPoints[bestCircuitLap.player] += 2;

  Object.entries(finalPoints)
    .sort(([,a], [,b]) => b - a)
    .forEach(([id, pts]) => {
      const name = id === '1' ? 'BlackMamba' : id === '2' ? 'Berna' : 'Borgia';
      console.log(`   ${name}: ${pts} pts`);
    });

  console.log('\n📊 PUNTOS ACTUALES EN GAME STATE:\n');
  const gameState = game.state;
  const spaResults = gameState.circuitResults[1];

  console.log('   Según circuitResults:');
  const spaPoints = { '1': 0, '2': 0, '3': 0 };
  spaResults.turns.forEach(turn => {
    turn.forEach(result => {
      spaPoints[result.playerId] += result.turnScore;
    });
  });

  Object.entries(spaPoints)
    .sort(([,a], [,b]) => b - a)
    .forEach(([id, pts]) => {
      const name = id === '1' ? 'BlackMamba' : id === '2' ? 'Berna' : 'Borgia';
      const correct = finalPoints[id];
      const diff = pts - correct;
      console.log(`   ${name}: ${pts} pts ${diff !== 0 ? `(debería ser ${correct}, diferencia: ${diff > 0 ? '+' : ''}${diff})` : '✓'}`);
    });

  await prisma.$disconnect();
}

analyzeSpa();
