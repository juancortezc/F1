const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyChampionshipResults() {
  console.log('🏁 F1 Night - Verificación de Resultados del Campeonato\n');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // 1. Get circuit records
    console.log('🏁 RÉCORDS POR CIRCUITO (Base de Datos):\n');
    
    const circuits = await prisma.circuit.findMany({
      where: { name: { in: ['Miami', 'COTA', 'Suzuka'] } },
      orderBy: { name: 'asc' }
    });

    const players = await prisma.player.findMany({
      where: { name: { in: ['Juan', 'Berna', 'Borgia'] } }
    });

    const playerMap = {};
    players.forEach(p => playerMap[p.id] = p.name);

    // Circuit Records Table
    console.log('┌─────────────────────┬───────────────────────┬───────────────────────┐');
    console.log('│ CIRCUITO            │ VR (Vuelta Rápida)    │ PR (Promedio)         │');
    console.log('├─────────────────────┼───────────────────────┼───────────────────────┤');
    
    const circuitData = {};
    for (const circuit of circuits) {
      let vrInfo = '-';
      let prInfo = '-';
      
      if (circuit.historicalBestLap) {
        const vrTime = formatTime(circuit.historicalBestLap);
        const vrHolder = playerMap[circuit.bestLapHolderId] || 'Unknown';
        vrInfo = `${vrTime} (${vrHolder})`;
      }
      
      if (circuit.historicalBestAverage) {
        const prTime = formatTime(circuit.historicalBestAverage);
        const prHolder = playerMap[circuit.bestAverageHolderId] || 'Unknown';
        prInfo = `${prTime} (${prHolder})`;
      }
      
      circuitData[circuit.name] = {
        vrHolder: playerMap[circuit.bestLapHolderId] || null,
        vrTime: circuit.historicalBestLap,
        prHolder: playerMap[circuit.bestAverageHolderId] || null,
        prTime: circuit.historicalBestAverage
      };
      
      console.log(`│ ${circuit.name.padEnd(19)} │ ${vrInfo.padEnd(21)} │ ${prInfo.padEnd(21)} │`);
    }
    console.log('└─────────────────────┴───────────────────────┴───────────────────────┘');

    // 2. Analyze championship game
    console.log('\n\n🏆 ANÁLISIS DEL CAMPEONATO:\n');
    
    const game = await prisma.game.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { updatedAt: 'desc' }
    });

    if (!game || !game.state) {
      console.log('❌ No se encontró campeonato completado');
      return;
    }

    const gameState = game.state;
    console.log(`📅 Fecha: ${game.updatedAt?.toLocaleDateString('es-ES')}`);
    console.log(`🎮 Game ID: ${game.id}`);

    // Championship standings
    console.log('\n📊 CLASIFICACIÓN GENERAL DEL CAMPEONATO:\n');
    if (gameState.playerStats) {
      const standings = Object.entries(gameState.playerStats)
        .map(([playerId, stats]) => ({
          playerId,
          playerName: playerMap[playerId] || 'Unknown',
          totalScore: stats.totalScore || 0
        }))
        .sort((a, b) => b.totalScore - a.totalScore);
      
      standings.forEach((standing, index) => {
        const position = index + 1;
        const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '  ';
        console.log(`${medal} ${position}. ${standing.playerName}: ${standing.totalScore} puntos`);
      });
    }

    // 3. Circuit winners analysis
    console.log('\n\n🏁 GANADORES POR CIRCUITO:\n');
    
    const circuitWinners = {};
    
    if (gameState.circuitResults && Array.isArray(gameState.circuitResults)) {
      gameState.circuitResults.forEach((circuitResult, circuitIndex) => {
        const circuitName = gameState.circuits[circuitIndex]?.name || `Circuito ${circuitIndex + 1}`;
        
        if (circuitResult.turns && Array.isArray(circuitResult.turns)) {
          // Calculate total points per player for this circuit
          const circuitPoints = {};
          
          circuitResult.turns.forEach((turn, turnIndex) => {
            if (Array.isArray(turn)) {
              turn.forEach((playerData) => {
                if (!circuitPoints[playerData.playerId]) {
                  circuitPoints[playerData.playerId] = {
                    totalPoints: 0,
                    turns: []
                  };
                }
                circuitPoints[playerData.playerId].totalPoints += playerData.turnScore || 0;
                circuitPoints[playerData.playerId].turns.push({
                  turn: turnIndex + 1,
                  score: playerData.turnScore || 0,
                  averageTime: playerData.averageTime
                });
              });
            }
          });
          
          // Find winner of this circuit
          const circuitStandings = Object.entries(circuitPoints)
            .map(([playerId, data]) => ({
              playerId,
              playerName: playerMap[playerId] || 'Unknown',
              totalPoints: data.totalPoints,
              turns: data.turns
            }))
            .sort((a, b) => b.totalPoints - a.totalPoints);
          
          if (circuitStandings.length > 0) {
            circuitWinners[circuitName] = circuitStandings[0].playerName;
            
            console.log(`🏁 ${circuitName}:`);
            console.log(`   🥇 Ganador: ${circuitStandings[0].playerName} (${circuitStandings[0].totalPoints} pts)`);
            
            // Show all positions
            circuitStandings.forEach((standing, index) => {
              if (index > 0) {
                const pos = index + 1;
                const medal = pos === 2 ? '🥈' : pos === 3 ? '🥉' : `${pos}.`;
                console.log(`   ${medal} ${standing.playerName}: ${standing.totalPoints} pts`);
              }
            });
            
            // Show turn breakdown for winner
            console.log(`   Turnos: ${circuitStandings[0].turns.map(t => `T${t.turn}: ${t.score}pts`).join(', ')}`);
            console.log('');
          }
        }
      });
    }

    // 4. Verification summary
    console.log('\n\n✅ VERIFICACIÓN DE RESULTADOS:\n');
    
    const expectedWinners = {
      'COTA': 'Juan',
      'Suzuka': 'Berna', 
      'Miami': 'Borgia'
    };
    
    let allCorrect = true;
    Object.entries(expectedWinners).forEach(([circuit, expectedWinner]) => {
      const actualWinner = circuitWinners[circuit];
      const isCorrect = actualWinner === expectedWinner;
      const icon = isCorrect ? '✅' : '❌';
      
      console.log(`${icon} ${circuit}: Esperado ${expectedWinner}, Real ${actualWinner || 'N/A'}`);
      
      if (!isCorrect) {
        allCorrect = false;
      }
    });

    // 5. STATS calculation verification
    console.log('\n\n📊 VERIFICACIÓN STATS (VIC/VR/PR):\n');
    
    const statsCalculation = {
      Juan: { VIC: 0, VR: 0, PR: 0 },
      Berna: { VIC: 0, VR: 0, PR: 0 },
      Borgia: { VIC: 0, VR: 0, PR: 0 }
    };
    
    // Count VIC (circuit victories)
    Object.entries(circuitWinners).forEach(([circuit, winner]) => {
      if (statsCalculation[winner]) {
        statsCalculation[winner].VIC++;
      }
    });
    
    // Count VR and PR from circuit records
    Object.entries(circuitData).forEach(([circuit, data]) => {
      if (data.vrHolder && statsCalculation[data.vrHolder]) {
        statsCalculation[data.vrHolder].VR++;
      }
      if (data.prHolder && statsCalculation[data.prHolder]) {
        statsCalculation[data.prHolder].PR++;
      }
    });
    
    console.log('┌─────────┬─────┬─────┬─────┐');
    console.log('│ JUGADOR │ VIC │ VR  │ PR  │');
    console.log('├─────────┼─────┼─────┼─────┤');
    
    Object.entries(statsCalculation).forEach(([player, stats]) => {
      console.log(`│ ${player.padEnd(7)} │  ${stats.VIC}  │  ${stats.VR}  │  ${stats.PR}  │`);
    });
    console.log('└─────────┴─────┴─────┴─────┘');
    
    // Totals verification
    const totalVIC = Object.values(statsCalculation).reduce((sum, stats) => sum + stats.VIC, 0);
    const totalVR = Object.values(statsCalculation).reduce((sum, stats) => sum + stats.VR, 0);
    const totalPR = Object.values(statsCalculation).reduce((sum, stats) => sum + stats.PR, 0);
    
    console.log(`\n📈 TOTALES: VIC=${totalVIC}, VR=${totalVR}, PR=${totalPR}`);
    console.log(`📊 MÁXIMOS: VIC=3, VR=3, PR=3`);
    
    const totalsCorrect = totalVIC <= 3 && totalVR <= 3 && totalPR <= 3;
    console.log(`${totalsCorrect ? '✅' : '❌'} Totales dentro de límites matemáticos`);

    console.log('\n\n🎯 RESUMEN FINAL:\n');
    console.log(`✅ Ganadores por circuito: ${allCorrect ? 'CORRECTOS' : 'INCORRECTOS'}`);
    console.log(`✅ Límites matemáticos: ${totalsCorrect ? 'CORRECTOS' : 'INCORRECTOS'}`);
    console.log(`✅ Algoritmo STATS: ${allCorrect && totalsCorrect ? 'FUNCIONANDO' : 'NECESITA CORRECCIÓN'}`);

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function formatTime(ms) {
  if (!ms) return '-:--.---';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

// Execute verification
verifyChampionshipResults();