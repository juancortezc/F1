const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Simulating exactly what the component does
async function main() {
  const game = await prisma.game.findFirst({
    where: { status: 'COMPLETED' },
    orderBy: { updatedAt: 'desc' }
  });

  if (!game) {
    console.log('No completed game found');
    return;
  }

  const displayGameState = game.state;
  const { pointsForBestLap, pointsForBestAverage } = displayGameState.settings;
  const sessionBestTimes = displayGameState.sessionBestTimes || {};

  console.log('=== CONFIGURACIÓN ===');
  console.log('pointsForBestLap:', pointsForBestLap);
  console.log('pointsForBestAverage:', pointsForBestAverage);
  console.log('turnsPerCircuit:', displayGameState.settings.turnsPerCircuit);

  console.log('\n=== sessionBestTimes ===');
  console.log(JSON.stringify(sessionBestTimes, null, 2));

  console.log('\n=== PROCESANDO CIRCUITOS ===\n');

  displayGameState.settings.circuits.forEach((circuit, circuitIndex) => {
    const circuitResult = displayGameState.circuitResults[circuitIndex];
    if (!circuitResult) {
      console.log(circuit.name + ': NO RESULT');
      return;
    }

    console.log('--- ' + circuit.name + ' ---');
    console.log('circuit.id:', circuit.id);
    console.log('circuitResult.turns.length:', circuitResult.turns.length);
    console.log('turnsPerCircuit:', displayGameState.settings.turnsPerCircuit);

    const isCircuitComplete = circuitResult.turns.length >= displayGameState.settings.turnsPerCircuit;
    console.log('isCircuitComplete:', isCircuitComplete);

    const circuitBests = sessionBestTimes[circuit.id];
    console.log('circuitBests:', JSON.stringify(circuitBests));

    const vrHolderId = isCircuitComplete ? (circuitBests ? circuitBests.bestLapPlayerId : null) : null;
    const prHolderId = isCircuitComplete ? (circuitBests ? circuitBests.bestAveragePlayerId : null) : null;

    console.log('vrHolderId:', vrHolderId);
    console.log('prHolderId:', prHolderId);

    // Process each player
    const players = displayGameState.settings.players;
    players.forEach(player => {
      let circuitBonusPoints = 0;

      // Check VR
      const hasVR = vrHolderId === player.id;
      const hasPR = prHolderId === player.id;

      console.log('  ' + player.name + ' (id=' + player.id + '): vrHolderId=' + vrHolderId + ' match=' + hasVR);

      if (hasVR && pointsForBestLap > 0) {
        circuitBonusPoints += pointsForBestLap;
        console.log('    -> VR BONUS +' + pointsForBestLap);
      }
      if (hasPR && pointsForBestAverage > 0) {
        circuitBonusPoints += pointsForBestAverage;
        console.log('    -> PR BONUS +' + pointsForBestAverage);
      }
      console.log('    -> Total bonus: ' + circuitBonusPoints);
    });

    console.log('');
  });

  await prisma.$disconnect();
}

main().catch(console.error);
