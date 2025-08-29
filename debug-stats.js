// Debug script to trace exactly what StatsView is receiving and calculating

const mockGameHistory = [
  {
    id: 'cmeuobvxx0000h6cel8ei0qau',
    updatedAt: '2025-08-27T23:00:00.000Z',
    state: {
      circuits: [
        { id: 'cmejb5rlw0000rblf3vfmw3o6', name: 'Miami' },
        { id: 'cmd7vv6tq0006mgf26lkobscw', name: 'COTA' },
        { id: 'cmd7vv6wp0007mgf23sxfiavz', name: 'Suzuka' }
      ],
      playerStats: {
        '1': { totalScore: 45 }, // Juan
        '2': { totalScore: 42 }, // Berna  
        '3': { totalScore: 48 }  // Borgia (champion)
      },
      circuitResults: [
        // Miami (index 0) - Winner: Borgia
        {
          turns: [
            [ // Turn 1
              { playerId: '1', turnScore: 15, averageTime: 95000, lapTimes: [94000, 96000, 95000] },
              { playerId: '2', turnScore: 12, averageTime: 96000, lapTimes: [95000, 97000, 96000] },
              { playerId: '3', turnScore: 18, averageTime: 93000, lapTimes: [92000, 94000, 93000] }
            ],
            [ // Turn 2  
              { playerId: '1', turnScore: 12, averageTime: 94000, lapTimes: [93000, 95000, 94000] },
              { playerId: '2', turnScore: 15, averageTime: 95000, lapTimes: [94000, 96000, 95000] },
              { playerId: '3', turnScore: 18, averageTime: 92000, lapTimes: [91000, 93000, 92000] }
            ]
          ]
        },
        // COTA (index 1) - Winner: Juan
        {
          turns: [
            [ // Turn 1
              { playerId: '1', turnScore: 18, averageTime: 102000, lapTimes: [101000, 103000, 102000] },
              { playerId: '2', turnScore: 15, averageTime: 103000, lapTimes: [102000, 104000, 103000] },
              { playerId: '3', turnScore: 12, averageTime: 104000, lapTimes: [103000, 105000, 104000] }
            ],
            [ // Turn 2
              { playerId: '1', turnScore: 15, averageTime: 101000, lapTimes: [100000, 102000, 101000] },
              { playerId: '2', turnScore: 18, averageTime: 102000, lapTimes: [101000, 103000, 102000] },
              { playerId: '3', turnScore: 12, averageTime: 105000, lapTimes: [104000, 106000, 105000] }
            ]
          ]
        },
        // Suzuka (index 2) - Winner: Berna
        {
          turns: [
            [ // Turn 1
              { playerId: '1', turnScore: 12, averageTime: 96000, lapTimes: [95000, 97000, 96000] },
              { playerId: '2', turnScore: 18, averageTime: 94000, lapTimes: [93000, 95000, 94000] },
              { playerId: '3', turnScore: 15, averageTime: 95000, lapTimes: [94000, 96000, 95000] }
            ],
            [ // Turn 2
              { playerId: '1', turnScore: 15, averageTime: 95000, lapTimes: [94000, 96000, 95000] },
              { playerId: '2', turnScore: 12, averageTime: 96000, lapTimes: [95000, 97000, 96000] },
              { playerId: '3', turnScore: 18, averageTime: 94000, lapTimes: [93000, 95000, 94000] }
            ]
          ]
        }
      ]
    }
  }
];

const mockPlayers = [
  { id: '1', name: 'Juan', isGuest: false },
  { id: '2', name: 'Berna', isGuest: false },
  { id: '3', name: 'Borgia', isGuest: false }
];

const mockCircuits = [
  { 
    id: 'cmejb5rlw0000rblf3vfmw3o6', 
    name: 'Miami',
    bestLapHolderId: '3', // Borgia
    bestAverageHolderId: '3' // Borgia
  },
  { 
    id: 'cmd7vv6tq0006mgf26lkobscw', 
    name: 'COTA',
    bestLapHolderId: '1', // Juan
    bestAverageHolderId: '2' // Berna
  },
  { 
    id: 'cmd7vv6wp0007mgf23sxfiavz', 
    name: 'Suzuka',
    bestLapHolderId: '2', // Berna
    bestAverageHolderId: '3' // Borgia
  }
];

// Simulate the exact StatsView logic
function debugStatsCalculation() {
  console.log('🔍 DEBUG: StatsView Calculation\n');
  console.log('═══════════════════════════════════\n');
  
  // Filter out guest players from stats
  const eligiblePlayers = mockPlayers.filter(p => !p.isGuest);
  console.log('✅ Eligible Players:', eligiblePlayers.map(p => p.name));
  
  // Initialize accumulated stats for each eligible player
  const playerAccStats = {};
  eligiblePlayers.forEach(player => {
    playerAccStats[player.id] = {
      player,
      championships: 0,
      circuitVictories: 0,
      fastestLaps: 0,
      bestAverages: 0,
      totalScore: 0,
      favoriteCircuit: null
    };
  });
  
  console.log('\n📊 Initial Stats:');
  Object.entries(playerAccStats).forEach(([id, stats]) => {
    console.log(`   ${stats.player.name}: CMP=0, VIC=0, VR=0, PR=0`);
  });

  // Track favorite circuits
  const victoryCount = {};
  mockPlayers.forEach(player => {
    victoryCount[player.id] = {};
    mockCircuits.forEach(circuit => {
      victoryCount[player.id][circuit.id] = 0;
    });
  });

  console.log('\n🏆 Processing Game History...\n');

  // Process completed games
  mockGameHistory.forEach((game, gameIndex) => {
    console.log(`📄 Game ${gameIndex + 1}: ${game.id}`);
    
    if (game.state && game.state.playerStats) {
      // Find winner (player with highest total score)
      const standings = Object.entries(game.state.playerStats)
        .map(([playerId, stats]) => ({
          playerId,
          totalScore: stats.totalScore || 0
        }))
        .sort((a, b) => b.totalScore - a.totalScore);
      
      console.log('   Championship standings:');
      standings.forEach((standing, index) => {
        const playerName = mockPlayers.find(p => p.id === standing.playerId)?.name;
        console.log(`     ${index + 1}. ${playerName}: ${standing.totalScore} pts`);
      });
      
      // Add championship to winner (first in standings)
      if (standings.length > 0 && playerAccStats[standings[0].playerId]) {
        playerAccStats[standings[0].playerId].championships++;
        const winnerName = mockPlayers.find(p => p.id === standings[0].playerId)?.name;
        console.log(`   🏆 Championship winner: ${winnerName}`);
      }

      // Calculate circuit victories (VIC): who finished 1st in each circuit overall
      if (game.state.circuitResults && Array.isArray(game.state.circuitResults)) {
        console.log('\n   Circuit Analysis:');
        
        game.state.circuitResults.forEach((circuitResult, circuitIndex) => {
          const circuitName = game.state.circuits[circuitIndex]?.name || `Circuit ${circuitIndex + 1}`;
          console.log(`     🏁 ${circuitName}:`);
          
          if (circuitResult.turns && Array.isArray(circuitResult.turns)) {
            // Calculate total points per player for this circuit
            const circuitPoints = {};
            
            circuitResult.turns.forEach((turn, turnIndex) => {
              console.log(`       Turn ${turnIndex + 1}:`);
              if (Array.isArray(turn)) {
                turn.forEach((playerData) => {
                  const playerName = mockPlayers.find(p => p.id === playerData.playerId)?.name;
                  console.log(`         ${playerName}: ${playerData.turnScore} pts`);
                  
                  if (!circuitPoints[playerData.playerId]) {
                    circuitPoints[playerData.playerId] = 0;
                  }
                  circuitPoints[playerData.playerId] += playerData.turnScore || 0;
                });
              }
            });
            
            console.log('       Circuit totals:');
            Object.entries(circuitPoints).forEach(([playerId, points]) => {
              const playerName = mockPlayers.find(p => p.id === playerId)?.name;
              console.log(`         ${playerName}: ${points} pts total`);
            });
            
            // Find winner of this circuit (highest total points)
            const circuitWinner = Object.entries(circuitPoints)
              .reduce((winner, [playerId, points]) => 
                points > winner.points ? { playerId, points } : winner
              , { playerId: '', points: 0 });
            
            if (circuitWinner.playerId && playerAccStats[circuitWinner.playerId]) {
              const winnerName = mockPlayers.find(p => p.id === circuitWinner.playerId)?.name;
              console.log(`       🥇 Circuit winner: ${winnerName} (${circuitWinner.points} pts)`);
              
              playerAccStats[circuitWinner.playerId].circuitVictories++;
              
              // Update victory count for favorite circuit
              const circuitId = game.state.circuits[circuitIndex]?.id;
              if (circuitId && victoryCount[circuitWinner.playerId]) {
                victoryCount[circuitWinner.playerId][circuitId]++;
              }
            }
          }
        });
      }

      // Add total scores for ranking
      Object.entries(game.state.playerStats || {}).forEach(([playerId, stats]) => {
        if (playerAccStats[playerId]) {
          playerAccStats[playerId].totalScore += stats.totalScore || 0;
        }
      });
    }
  });

  console.log('\n⚡ Count VR and PR from historical circuit records...\n');
  
  // Count VR and PR from historical circuit records (database records)
  mockCircuits.forEach(circuit => {
    console.log(`🏁 ${circuit.name}:`);
    
    // VR: Count fastest lap records
    if (circuit.bestLapHolderId && playerAccStats[circuit.bestLapHolderId]) {
      const holderName = mockPlayers.find(p => p.id === circuit.bestLapHolderId)?.name;
      console.log(`   VR holder: ${holderName}`);
      playerAccStats[circuit.bestLapHolderId].fastestLaps++;
    }
    
    // PR: Count best average records  
    if (circuit.bestAverageHolderId && playerAccStats[circuit.bestAverageHolderId]) {
      const holderName = mockPlayers.find(p => p.id === circuit.bestAverageHolderId)?.name;
      console.log(`   PR holder: ${holderName}`);
      playerAccStats[circuit.bestAverageHolderId].bestAverages++;
    }
  });

  // Calculate favorite circuit for each player
  Object.entries(victoryCount).forEach(([playerId, playerCircuits]) => {
    let maxVictories = 0;
    let favoriteCircuitId = null;
    
    Object.entries(playerCircuits).forEach(([circuitId, count]) => {
      if (count > maxVictories) {
        maxVictories = count;
        favoriteCircuitId = circuitId;
      }
    });
    
    if (favoriteCircuitId && playerAccStats[playerId]) {
      const circuit = mockCircuits.find(c => c.id === favoriteCircuitId);
      playerAccStats[playerId].favoriteCircuit = circuit ? circuit.name : null;
    }
  });

  console.log('\n📊 FINAL RESULTS:\n');
  console.log('┌─────────┬─────┬─────┬─────┬─────┬──────────────────┐');
  console.log('│ JUGADOR │ CMP │ VIC │ VR  │ PR  │ CIRCUITO FAV     │');
  console.log('├─────────┼─────┼─────┼─────┼─────┼──────────────────┤');
  
  Object.entries(playerAccStats).forEach(([id, stats]) => {
    console.log(`│ ${stats.player.name.padEnd(7)} │  ${stats.championships}  │  ${stats.circuitVictories}  │  ${stats.fastestLaps}  │  ${stats.bestAverages}  │ ${(stats.favoriteCircuit || '-').padEnd(16)} │`);
  });
  console.log('└─────────┴─────┴─────┴─────┴─────┴──────────────────┘');

  // Verify totals
  const totalVIC = Object.values(playerAccStats).reduce((sum, stats) => sum + stats.circuitVictories, 0);
  const totalVR = Object.values(playerAccStats).reduce((sum, stats) => sum + stats.fastestLaps, 0);
  const totalPR = Object.values(playerAccStats).reduce((sum, stats) => sum + stats.bestAverages, 0);
  
  console.log(`\n📈 TOTALES: VIC=${totalVIC}, VR=${totalVR}, PR=${totalPR}`);
  console.log(`📊 ESPERADOS: VIC=3, VR=3, PR=3`);
  
  const isCorrect = totalVIC === 3 && totalVR === 3 && totalPR === 3;
  console.log(`${isCorrect ? '✅' : '❌'} Totales ${isCorrect ? 'correctos' : 'incorrectos'}`);

  return playerAccStats;
}

debugStatsCalculation();