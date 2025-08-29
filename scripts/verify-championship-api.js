// Championship Results Verification using API endpoints
// This script uses the existing API endpoints to analyze championship data

async function fetchAPI(endpoint) {
  const baseUrl = 'http://localhost:3002';
  try {
    const response = await fetch(`${baseUrl}${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch ${endpoint}:`, error.message);
    return null;
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

async function verifyChampionshipResults() {
  console.log('🏁 F1 Night - Verificación de Resultados del Campeonato\n');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // 1. Get circuit records
    console.log('🏁 RÉCORDS POR CIRCUITO (Base de Datos):\n');
    
    const circuitsData = await fetchAPI('/api/circuits');
    if (!circuitsData) {
      console.log('❌ No se pudieron obtener datos de circuitos');
      return;
    }

    // Filter Miami, COTA, Suzuka
    const championshipCircuits = circuitsData.filter(c => 
      ['Miami', 'COTA', 'Suzuka'].includes(c.name)
    ).sort((a, b) => a.name.localeCompare(b.name));

    // Get all players for name mapping
    const playersData = [
      { id: '1', name: 'Juan' },
      { id: '2', name: 'Berna' },
      { id: '3', name: 'Borgia' }
    ];
    const playerMap = {};
    playersData.forEach(p => playerMap[p.id] = p.name);

    // Circuit Records Table
    console.log('┌─────────────────────┬───────────────────────┬───────────────────────┐');
    console.log('│ CIRCUITO            │ VR (Vuelta Rápida)    │ PR (Promedio)         │');
    console.log('├─────────────────────┼───────────────────────┼───────────────────────┤');
    
    const circuitData = {};
    for (const circuit of championshipCircuits) {
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

    // 2. Get game history
    console.log('\n\n🏆 ANÁLISIS DEL CAMPEONATO:\n');
    
    const gameHistory = await fetchAPI('/api/game/history');
    if (!gameHistory || gameHistory.length === 0) {
      console.log('❌ No se encontró historial de campeonatos');
      return;
    }

    const latestGame = gameHistory[0]; // Most recent completed game
    console.log(`📅 Fecha: ${new Date(latestGame.updatedAt).toLocaleDateString('es-ES')}`);
    console.log(`🎮 Game ID: ${latestGame.id}`);

    // Championship standings
    console.log('\n📊 CLASIFICACIÓN GENERAL DEL CAMPEONATO:\n');
    if (latestGame.state && latestGame.state.playerStats) {
      const standings = Object.entries(latestGame.state.playerStats)
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
    const gameState = latestGame.state;
    
    if (gameState && gameState.circuitResults && Array.isArray(gameState.circuitResults)) {
      gameState.circuitResults.forEach((circuitResult, circuitIndex) => {
        const circuitName = gameState.circuits && gameState.circuits[circuitIndex] 
          ? gameState.circuits[circuitIndex].name 
          : `Circuito ${circuitIndex + 1}`;
        
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
  }
}

// Check if we're running in Node.js environment
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  verifyChampionshipResults();
} else {
  // Browser environment
  console.log('Este script debe ejecutarse en Node.js, no en el navegador');
}

module.exports = { verifyChampionshipResults };