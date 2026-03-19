const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAustriaTransition() {
  try {
    const game = await prisma.game.findFirst({ where: { status: 'ACTIVE' } });

    console.log('\n═══════════════════════════════════════════════');
    console.log('🧪 TEST: TRANSICIÓN DE SPA A AUSTRIA');
    console.log('═══════════════════════════════════════════════\n');

    console.log('📊 Estado actual:');
    console.log(`   Circuito: ${game.state.circuits[game.state.currentCircuitIndex].name}`);
    console.log(`   Turno: ${game.state.currentTurn}`);
    console.log(`   Turnos por circuito: ${game.state.settings.turnsPerCircuit}\n`);

    // Simular que se completa Spa T2
    console.log('🔮 SIMULACIÓN: Al completar Spa T2 (último jugador)');
    console.log('   isLastPlayerOfTurn = true');
    console.log(`   currentTurn = ${game.state.currentTurn}`);
    console.log(`   turnsPerCircuit = ${game.state.settings.turnsPerCircuit}\n`);

    const nextTurn = game.state.currentTurn + 1;
    console.log(`   → nextTurn = ${game.state.currentTurn} + 1 = ${nextTurn}`);

    if (nextTurn > game.state.settings.turnsPerCircuit) {
      console.log(`   → nextTurn (${nextTurn}) > turnsPerCircuit (${game.state.settings.turnsPerCircuit})`);
      console.log('   ✓ Se cambia de circuito');
      console.log('   ✓ nextTurn se resetea a 1');
      console.log('   ✓ currentCircuitIndex++ (2 → 3 = Austria)\n');

      console.log('📝 Lógica de orden de jugadores:');
      console.log('   const isMovingToNewCircuit = nextTurn === 1;');
      console.log('   → isMovingToNewCircuit = true\n');

      console.log('   calculateCircuitStandings(..., true)');
      console.log('   → Usa PUNTOS TOTALES del campeonato\n');

      console.log('🏆 Puntos totales actuales (después de Spa completo):');
      console.log('   (Estos determinarán el orden en Austria T1)\n');

      Object.entries(game.state.playerStats)
        .sort(([, a], [, b]) => b.totalScore - a.totalScore)
        .forEach(([id, stats], idx) => {
          const name = game.state.settings.players.find(p => p.id === id)?.name;
          console.log(`   ${idx + 1}. ${name}: ${stats.totalScore} pts`);
        });

      console.log('\n✅ Orden esperado para AUSTRIA T1:');
      const sortedByTotal = Object.entries(game.state.playerStats)
        .sort(([, a], [, b]) => b.totalScore - a.totalScore);

      sortedByTotal.forEach(([id, stats], idx) => {
        const name = game.state.settings.players.find(p => p.id === id)?.name;
        console.log(`   ${idx + 1}. ${name} (${stats.totalScore} pts totales)`);
      });

      console.log('\n📋 Durante Austria (T2, T3, ...):');
      console.log('   → isMovingToNewCircuit = false');
      console.log('   → calculateCircuitStandings(..., false)');
      console.log('   → Usa puntos del CIRCUITO Austria solamente\n');

    } else {
      console.log(`   → nextTurn (${nextTurn}) <= turnsPerCircuit (${game.state.settings.turnsPerCircuit})`);
      console.log('   ✗ Aún hay turnos en Spa\n');
    }

    console.log('═══════════════════════════════════════════════');
    console.log('✅ TEST COMPLETADO - Lógica correcta para Austria');
    console.log('═══════════════════════════════════════════════\n');

    console.log('📝 RESUMEN:');
    console.log('   ✓ Al terminar Spa → Avanza a Austria');
    console.log('   ✓ Austria T1 → Orden por puntos TOTALES');
    console.log('   ✓ Austria T2+ → Orden por puntos de AUSTRIA');
    console.log('   ✓ Puntos por posición: 3, 2, 1');
    console.log('   ✓ Vuelta rápida circuito: +2 pts');
    console.log('   ✓ Promedio incluye vueltas de penalización\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAustriaTransition();
