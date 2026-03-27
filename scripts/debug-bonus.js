const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  const game = await prisma.game.findFirst({
    orderBy: { updatedAt: 'desc' }
  });

  const state = game.state;
  const { pointsForBestLap, pointsForBestAverage } = state.settings;
  const sessionBestTimes = state.sessionBestTimes || {};

  console.log('pointsForBestLap:', pointsForBestLap);
  console.log('pointsForBestAverage:', pointsForBestAverage);
  console.log('');

  state.settings.circuits.forEach((circuit, circuitIndex) => {
    const circuitResult = state.circuitResults[circuitIndex];
    if (!circuitResult) {
      console.log(circuit.name + ': NO RESULT');
      return;
    }

    const isCircuitComplete = circuitResult.turns.length >= state.settings.turnsPerCircuit;
    const circuitBests = sessionBestTimes[circuit.id];

    console.log('=== ' + circuit.name + ' ===');
    console.log('circuit.id:', circuit.id);
    console.log('isCircuitComplete:', isCircuitComplete);
    console.log('circuitBests:', JSON.stringify(circuitBests));

    const vrHolderId = isCircuitComplete ? (circuitBests ? circuitBests.bestLapPlayerId : null) : null;
    const prHolderId = isCircuitComplete ? (circuitBests ? circuitBests.bestAveragePlayerId : null) : null;

    console.log('vrHolderId:', vrHolderId);
    console.log('prHolderId:', prHolderId);

    if (vrHolderId) {
      const vrPlayer = state.settings.players.find(p => p.id === vrHolderId);
      console.log('VR Holder:', vrPlayer ? vrPlayer.name : 'NOT FOUND', '(+' + pointsForBestLap + ' pts)');
    }
    if (prHolderId && pointsForBestAverage > 0) {
      const prPlayer = state.settings.players.find(p => p.id === prHolderId);
      console.log('PR Holder:', prPlayer ? prPlayer.name : 'NOT FOUND', '(+' + pointsForBestAverage + ' pts)');
    }
    console.log('');
  });

  await prisma.$disconnect();
}

check().catch(console.error);
