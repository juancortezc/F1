const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSpaT2Black() {
  try {
    const game = await prisma.game.findFirst({ where: { status: 'ACTIVE' } });
    const gameState = game.state;

    console.log('\n🔧 CORRIGIENDO T2 SPA - BLACKMAMBA...\n');

    console.log('📊 Puntos actuales T2 Spa:');
    const spaResults = gameState.circuitResults[1];
    spaResults.turns[1].forEach(result => {
      const name = gameState.settings.players.find(p => p.id === result.playerId)?.name;
      console.log(`   ${name}: ${result.turnScore} pts`);
    });

    console.log('\n🔍 Problema:');
    console.log('   BlackMamba tiene 5 pts en T2 (debería tener 3)');
    console.log('   Posiblemente tiene +2 de VR que no debe tener en T2');
    console.log('   VR se otorga al FINAL del circuito, no por turno\n');

    // Corregir T2: BlackMamba 3, Borgia 2, Berna 1
    const updatedCircuitResults = [...gameState.circuitResults];
    updatedCircuitResults[1].turns[1] = updatedCircuitResults[1].turns[1].map(result => {
      if (result.playerId === '1') { // BlackMamba
        return { ...result, turnScore: 3 }; // Era 5, ahora 3
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

    // VR del circuito completo
    // Australia: Borgia
    newPlayerStats['3'].bestLaps = 1;
    newPlayerStats['3'].totalScore += 2;

    // Spa: BlackMamba
    newPlayerStats['1'].bestLaps = 1;
    newPlayerStats['1'].totalScore += 2;

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
    console.log('Spa completo:');
    console.log('   T1: Berna 3, Borgia 2, BlackMamba 1');
    console.log('   T2: BlackMamba 3, Borgia 2, Berna 1');
    console.log('   VR Circuito: BlackMamba +2\n');

    console.log('Total Spa:');
    console.log('   BlackMamba: 6 pts (1 + 3 + 2 VR)');
    console.log('   Berna: 4 pts (3 + 1)');
    console.log('   Borgia: 4 pts (2 + 2)\n');

    console.log('CAMPEONATO (Australia + Spa):');
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

fixSpaT2Black();
