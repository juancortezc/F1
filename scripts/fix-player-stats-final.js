const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPlayerStatsFinal() {
  try {
    const game = await prisma.game.findFirst({ where: { status: 'ACTIVE' } });
    const gameState = game.state;

    console.log('\n🔧 RECALCULANDO playerStats DESDE circuitResults...\n');

    // Recalcular desde cero basándose en circuitResults
    const newPlayerStats = {
      '1': { totalScore: 0, bestLaps: 0, bestAverages: 0 },
      '2': { totalScore: 0, bestLaps: 0, bestAverages: 0 },
      '3': { totalScore: 0, bestLaps: 0, bestAverages: 0 }
    };

    // Sumar todos los puntos de circuitResults
    gameState.circuitResults.forEach((circuitResult, circuitIdx) => {
      console.log(`Circuito ${circuitIdx}: ${gameState.circuits[circuitIdx]?.name || 'Unknown'}`);

      circuitResult.turns.forEach((turn, turnIdx) => {
        turn.forEach(result => {
          newPlayerStats[result.playerId].totalScore += result.turnScore;
          const name = gameState.settings.players.find(p => p.id === result.playerId)?.name;
          console.log(`   T${turnIdx + 1} ${name}: +${result.turnScore} pts`);
        });
      });
    });

    console.log('\n📊 Total de circuitResults (sin VR de circuito):\n');
    Object.entries(newPlayerStats).forEach(([id, stats]) => {
      const name = id === '1' ? 'BlackMamba' : id === '2' ? 'Berna' : 'Borgia';
      console.log(`   ${name}: ${stats.totalScore} pts`);
    });

    console.log('\n🏆 Añadiendo VR de circuitos completos:\n');

    // VR de Australia: Borgia (ya incluido en los 5 pts de T2)
    console.log('   Australia VR: Ya incluido en turnScore de Borgia T2 (5 pts = 3 + 2 VR)');

    // VR de Spa: BlackMamba (no incluido aún)
    console.log('   Spa VR: BlackMamba +2 pts\n');
    newPlayerStats['1'].totalScore += 2;
    newPlayerStats['1'].bestLaps = 1;

    // Borgia VR count
    newPlayerStats['3'].bestLaps = 1;

    const updatedGameState = {
      ...gameState,
      playerStats: newPlayerStats
    };

    await prisma.game.update({
      where: { id: game.id },
      data: { state: updatedGameState }
    });

    console.log('✅ PUNTOS FINALES CORRECTOS:\n');
    Object.entries(newPlayerStats)
      .sort(([, a], [, b]) => b.totalScore - a.totalScore)
      .forEach(([id, stats]) => {
        const name = id === '1' ? 'BlackMamba' : id === '2' ? 'Berna' : 'Borgia';
        console.log(`   ${name}: ${stats.totalScore} pts (VR: ${stats.bestLaps})`);
      });

    console.log('\n📝 Desglose:');
    console.log('   Borgia: 8 (Australia) + 4 (Spa) = 12 pts');
    console.log('   BlackMamba: 2 (Australia) + 4 (Spa) + 2 (VR Spa) = 8 pts');
    console.log('   Berna: 4 (Australia) + 4 (Spa) = 8 pts\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixPlayerStatsFinal();
