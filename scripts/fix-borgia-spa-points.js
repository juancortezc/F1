const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixBorgiaSpaPoints() {
  try {
    const game = await prisma.game.findFirst({ where: { status: 'ACTIVE' } });
    const gameState = game.state;

    console.log('\n🔧 CORRIGIENDO PUNTOS DE BORGIA EN SPA...\n');

    console.log('📊 Puntos actuales en Spa:');
    const spaResults = gameState.circuitResults[1]; // Spa is index 1
    spaResults.turns.forEach((turn, idx) => {
      console.log(`\n   Turno ${idx + 1}:`);
      turn.forEach(result => {
        const name = gameState.settings.players.find(p => p.id === result.playerId)?.name;
        console.log(`      ${name}: ${result.turnScore} pts`);
      });
    });

    // Puntos correctos según análisis:
    // T1: Berna 3, Borgia 2, BlackMamba 1
    // T2: BlackMamba 3, Borgia 2, Berna 1
    // VR: BlackMamba +2
    // Total: BlackMamba 6, Berna 4, Borgia 4

    console.log('\n🔍 Problema detectado:');
    console.log('   Borgia tiene 6 pts en Spa (debería tener 4)');
    console.log('   BlackMamba hizo la VR del circuito (107562ms)');
    console.log('   Borgia perdió los +2 pts de VR que tenía en T1\n');

    // Corregir: Borgia T1 debe tener 2 pts (no 4)
    const updatedCircuitResults = [...gameState.circuitResults];
    updatedCircuitResults[1].turns[0] = updatedCircuitResults[1].turns[0].map(result => {
      if (result.playerId === '3') { // Borgia
        return { ...result, turnScore: 2 }; // Era 4, ahora 2
      }
      return result;
    });

    // Recalcular totales del campeonato
    const newPlayerStats = {
      '1': { totalScore: 0, bestLaps: 0, bestAverages: 0 },
      '2': { totalScore: 0, bestLaps: 0, bestAverages: 0 },
      '3': { totalScore: 0, bestLaps: 0, bestAverages: 0 }
    };

    // Australia (circuito 0)
    updatedCircuitResults[0].turns.forEach(turn => {
      turn.forEach(result => {
        newPlayerStats[result.playerId].totalScore += result.turnScore;
      });
    });

    // Spa (circuito 1)
    updatedCircuitResults[1].turns.forEach(turn => {
      turn.forEach(result => {
        newPlayerStats[result.playerId].totalScore += result.turnScore;
      });
    });

    // Contar vueltas rápidas (Australia: Borgia, Spa: BlackMamba)
    newPlayerStats['3'].bestLaps = 1; // Borgia tiene VR en Australia
    newPlayerStats['1'].bestLaps = 1; // BlackMamba tiene VR en Spa

    const updatedGameState = {
      ...gameState,
      playerStats: newPlayerStats,
      circuitResults: updatedCircuitResults
    };

    await prisma.game.update({
      where: { id: game.id },
      data: { state: updatedGameState }
    });

    console.log('✅ PUNTOS CORREGIDOS:\n');
    console.log('Spa:');
    console.log('   T1: Berna 3, Borgia 2, BlackMamba 1');
    console.log('   T2: BlackMamba 3, Borgia 2, Berna 1');
    console.log('   VR: BlackMamba +2\n');

    console.log('Total Spa:');
    console.log('   BlackMamba: 6 pts');
    console.log('   Berna: 4 pts');
    console.log('   Borgia: 4 pts\n');

    console.log('Australia + Spa:');
    Object.entries(newPlayerStats)
      .sort(([, a], [, b]) => b.totalScore - a.totalScore)
      .forEach(([id, stats]) => {
        const name = gameState.settings.players.find(p => p.id === id)?.name;
        console.log(`   ${name}: ${stats.totalScore} pts (VR: ${stats.bestLaps})`);
      });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixBorgiaSpaPoints();
