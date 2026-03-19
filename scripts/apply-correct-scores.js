const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyCorrectScores() {
  try {
    const game = await prisma.game.findFirst({
      where: { status: 'ACTIVE' }
    });

    if (!game) {
      console.log('❌ No hay campeonato activo');
      return;
    }

    const gameState = game.state;

    console.log('\n📊 PUNTOS ACTUALES (INCORRECTOS):');
    console.log(JSON.stringify(gameState.playerStats, null, 2));

    // Puntos correctos según tu especificación
    const correctScores = {
      '1': { totalScore: 2, bestLaps: 0, bestAverages: 0 },  // BlackMamba
      '2': { totalScore: 4, bestLaps: 0, bestAverages: 0 },  // Berna
      '3': { totalScore: 8, bestLaps: 1, bestAverages: 0 }   // Borgia (tiene 1 bestLap por vuelta rápida)
    };

    // Actualizar turnScores en circuitResults
    const updatedCircuitResults = [...gameState.circuitResults];

    // Australia (circuito 0)
    if (updatedCircuitResults[0]) {
      // Turno 1: Borgia 3pts, Berna 2pts, BlackMamba 1pt
      updatedCircuitResults[0].turns[0] = updatedCircuitResults[0].turns[0].map(turn => {
        if (turn.playerId === '3') return { ...turn, turnScore: 3 };  // Borgia
        if (turn.playerId === '2') return { ...turn, turnScore: 2 };  // Berna
        if (turn.playerId === '1') return { ...turn, turnScore: 1 };  // BlackMamba
        return turn;
      });

      // Turno 2: Borgia 3+2=5pts, Berna 2pts, BlackMamba 1pt
      updatedCircuitResults[0].turns[1] = updatedCircuitResults[0].turns[1].map(turn => {
        if (turn.playerId === '3') return { ...turn, turnScore: 5 };  // Borgia (3 + 2 vuelta rápida)
        if (turn.playerId === '2') return { ...turn, turnScore: 2 };  // Berna
        if (turn.playerId === '1') return { ...turn, turnScore: 1 };  // BlackMamba
        return turn;
      });
    }

    const updatedGameState = {
      ...gameState,
      playerStats: correctScores,
      circuitResults: updatedCircuitResults
    };

    await prisma.game.update({
      where: { id: game.id },
      data: {
        state: updatedGameState
      }
    });

    console.log('\n✅ PUNTOS CORREGIDOS:');
    console.log(JSON.stringify(correctScores, null, 2));

    console.log('\n🏆 CLASIFICACIÓN CORRECTA:');
    console.log('1. Borgia: 8 pts');
    console.log('2. Berna: 4 pts');
    console.log('3. BlackMamba: 2 pts');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

applyCorrectScores();
