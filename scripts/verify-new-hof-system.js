const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyNewHOFSystem() {
  try {
    console.log('\n═══════════════════════════════════════════════');
    console.log('🏆 NUEVO SISTEMA HALL OF FAME');
    console.log('═══════════════════════════════════════════════\n');

    // Obtener campeonatos completados
    const settings = await prisma.settings.findUnique({
      where: { id: 'singleton' }
    });

    const cutoffDate = settings?.historicalCutoffDate;
    const whereClause = { status: 'COMPLETED' };
    if (cutoffDate) {
      whereClause.updatedAt = { gte: cutoffDate };
    }

    const completedGames = await prisma.game.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'asc' }
    });

    console.log(`📊 Campeonatos completados: ${completedGames.length}`);
    if (cutoffDate) {
      console.log(`   Filtro desde: ${new Date(cutoffDate).toLocaleDateString()}\n`);
    } else {
      console.log('   Sin filtro de fecha\n');
    }

    // Inicializar estadísticas
    const playerStats = {};
    const playerNames = {};
    const vrCount = {};
    const prCount = {};

    // Procesar cada campeonato
    completedGames.forEach((game, idx) => {
      const gameState = game.state;
      const date = new Date(game.updatedAt).toLocaleDateString();

      console.log(`\n🏁 Campeonato ${idx + 1} (${date}):`);

      // Obtener clasificación final
      const standings = Object.entries(gameState.playerStats)
        .map(([playerId, stats]) => ({
          playerId,
          name: gameState.settings.players.find(p => p.id === playerId)?.name,
          totalScore: stats.totalScore || 0
        }))
        .sort((a, b) => b.totalScore - a.totalScore)
        .filter(s => s.totalScore > 0);

      // Mostrar clasificación y puntos otorgados
      const positionPoints = [10, 8, 6, 4, 3, 2, 1];
      standings.forEach((standing, position) => {
        const points = positionPoints[position] || 0;
        const medal = ['🥇', '🥈', '🥉'][position] || '  ';

        console.log(`   ${medal} ${position + 1}. ${standing.name}: ${standing.totalScore} pts campeonato → +${points} pts HOF`);

        // Inicializar si no existe
        if (!playerStats[standing.playerId]) {
          playerStats[standing.playerId] = 0;
          playerNames[standing.playerId] = standing.name;
          vrCount[standing.playerId] = 0;
          prCount[standing.playerId] = 0;
        }

        // Sumar puntos
        playerStats[standing.playerId] += points;

        // Contar campeonatos ganados
        if (position === 0) {
          console.log(`      → ¡Campeón del campeonato!`);
        }
      });

      // Contar VR y PR de este campeonato
      if (gameState.sessionBestTimes) {
        Object.values(gameState.sessionBestTimes).forEach(circuitBest => {
          if (circuitBest.bestLapPlayerId) {
            vrCount[circuitBest.bestLapPlayerId] = (vrCount[circuitBest.bestLapPlayerId] || 0) + 1;
          }
          if (circuitBest.bestAveragePlayerId) {
            prCount[circuitBest.bestAveragePlayerId] = (prCount[circuitBest.bestAveragePlayerId] || 0) + 1;
          }
        });
      }
    });

    console.log('\n\n═══════════════════════════════════════════════');
    console.log('📊 RANKING HALL OF FAME');
    console.log('═══════════════════════════════════════════════\n');

    // Ordenar por puntos totales
    const ranking = Object.entries(playerStats)
      .map(([playerId, points]) => ({
        playerId,
        name: playerNames[playerId],
        points,
        vr: vrCount[playerId] || 0,
        pr: prCount[playerId] || 0
      }))
      .sort((a, b) => b.points - a.points);

    ranking.forEach((player, idx) => {
      const medal = ['🥇', '🥈', '🥉'][idx] || '  ';
      const position = idx + 1;
      console.log(`${medal} ${position}. ${player.name}: ${player.points} pts`);
    });

    console.log('\n═══════════════════════════════════════════════');
    console.log('⚡ RÉCORDS HISTÓRICOS');
    console.log('═══════════════════════════════════════════════\n');

    // Jugador con más VR
    const topVR = ranking
      .filter(p => p.vr > 0)
      .sort((a, b) => b.vr - a.vr)[0];

    if (topVR) {
      console.log(`⚡ MÁS VUELTAS RÁPIDAS:`);
      console.log(`   ${topVR.name}: ${topVR.vr} vueltas rápidas\n`);
    }

    // Jugador con más PR
    const topPR = ranking
      .filter(p => p.pr > 0)
      .sort((a, b) => b.pr - a.pr)[0];

    if (topPR) {
      console.log(`🎯 MÁS MEJORES PROMEDIOS:`);
      console.log(`   ${topPR.name}: ${topPR.pr} mejores promedios\n`);
    }

    console.log('═══════════════════════════════════════════════');
    console.log('✅ NUEVO SISTEMA VERIFICADO');
    console.log('═══════════════════════════════════════════════\n');

    console.log('📝 CARACTERÍSTICAS DEL NUEVO SISTEMA:\n');
    console.log('✓ Ranking por puntos de posición en campeonatos');
    console.log('✓ Escala: 1°=10pts, 2°=8pts, 3°=6pts, 4°=4pts, 5°=3pts, 6°=2pts, 7°=1pt');
    console.log('✓ Cards separados para VR y PR (no afectan ranking)');
    console.log('✓ Tabla simplificada: POS, JUGADOR, PTS, CMP');
    console.log('✓ Respeta filtro de cutoff date\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyNewHOFSystem();
