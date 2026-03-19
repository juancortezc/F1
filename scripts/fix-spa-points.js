const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSpaPoints() {
  try {
    const game = await prisma.game.findFirst({ where: { status: 'ACTIVE' } });
    const gameState = game.state;

    console.log('\n🔧 Corrigiendo puntos de Spa...\n');

    // Puntos correctos para T1 Spa (circuito index 1)
    const spaIndex = 1;
    const updatedCircuitResults = [...gameState.circuitResults];

    // Turno 1: Berna 3pts, Borgia 4pts (2+2 VR), BlackMamba 1pt
    updatedCircuitResults[spaIndex].turns[0] = updatedCircuitResults[spaIndex].turns[0].map(turn => {
      if (turn.playerId === '2') return { ...turn, turnScore: 3 };  // Berna
      if (turn.playerId === '3') return { ...turn, turnScore: 4 };  // Borgia (2 + 2 VR)
      if (turn.playerId === '1') return { ...turn, turnScore: 1 };  // BlackMamba
      return turn;
    });

    // Recalcular totales
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

    // Contar vueltas rápidas
    newPlayerStats['3'].bestLaps = 2; // Borgia tiene VR en Australia y Spa

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
    console.log('Australia + Spa T1:');
    Object.entries(newPlayerStats)
      .sort(([, a], [, b]) => b.totalScore - a.totalScore)
      .forEach(([id, stats]) => {
        const name = gameState.settings.players.find(p => p.id === id)?.name;
        console.log(`  ${name}: ${stats.totalScore} pts (VR: ${stats.bestLaps})`);
      });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixSpaPoints();
