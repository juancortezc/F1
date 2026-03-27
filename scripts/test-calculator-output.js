const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Copy of ScoreCalculator logic
function getCircuitBreakdown(gameState, players) {
  const { pointsForBestLap, pointsForBestAverage } = gameState.settings;
  const sessionBestTimes = gameState.sessionBestTimes || {};

  return gameState.settings.circuits.map((circuit, circuitIndex) => {
    const circuitResult = gameState.circuitResults[circuitIndex];
    if (!circuitResult) return null;

    const isCircuitComplete = circuitResult.turns.length >= gameState.settings.turnsPerCircuit;
    const circuitBests = sessionBestTimes[circuit.id];
    const vrHolderId = isCircuitComplete ? (circuitBests ? circuitBests.bestLapPlayerId : null) : null;
    const prHolderId = isCircuitComplete ? (circuitBests ? circuitBests.bestAveragePlayerId : null) : null;

    const participatingPlayerIds = new Set();
    circuitResult.turns.forEach(turn => {
      turn.forEach(result => participatingPlayerIds.add(result.playerId));
    });

    const playerCircuitData = players
      .filter(player => participatingPlayerIds.has(player.id))
      .map((player) => {
        const playerId = player.id;
        let circuitBasePoints = 0;
        let circuitBonusPoints = 0;

        circuitResult.turns.forEach((turn) => {
          const playerTurn = turn.find(p => p.playerId === playerId);
          if (!playerTurn) return;

          // Sort by turnScore to get position
          const sortedTurn = [...turn].sort((a, b) => b.turnScore - a.turnScore);
          const position = sortedTurn.findIndex(p => p.playerId === playerId) + 1;

          // Calculate base points
          const rank = position - 1;
          const totalPlayers = turn.length;
          let basePoints = 0;
          if (rank === 0) basePoints = 3;
          else if (rank === 1 && totalPlayers >= 2) basePoints = 2;
          else if (rank === 2 && totalPlayers >= 3) basePoints = 1;

          circuitBasePoints += basePoints;
        });

        // Add VR/PR bonus at circuit level
        if (vrHolderId === playerId && pointsForBestLap > 0) {
          circuitBonusPoints += pointsForBestLap;
        }
        if (prHolderId === playerId && pointsForBestAverage > 0) {
          circuitBonusPoints += pointsForBestAverage;
        }

        return {
          player,
          basePoints: circuitBasePoints,
          bonusPoints: circuitBonusPoints,
          totalPoints: circuitBasePoints + circuitBonusPoints
        };
      });

    return {
      name: circuit.name,
      circuitIndex,
      vrHolderId,
      prHolderId,
      players: playerCircuitData.sort((a, b) => b.totalPoints - a.totalPoints)
    };
  }).filter(Boolean);
}

async function main() {
  const game = await prisma.game.findFirst({
    orderBy: { updatedAt: 'desc' }
  });

  const state = game.state;
  const breakdown = getCircuitBreakdown(state, state.settings.players);

  console.log("=== CIRCUIT BREAKDOWN OUTPUT ===\n");

  breakdown.forEach(circuit => {
    console.log("╔════════════════════════════════════════════╗");
    console.log("║ " + circuit.name.toUpperCase().padEnd(42) + " ║");
    console.log("╚════════════════════════════════════════════╝");

    const vrPlayer = state.settings.players.find(p => p.id === circuit.vrHolderId);
    const prPlayer = state.settings.players.find(p => p.id === circuit.prHolderId);
    console.log("VR Holder:", vrPlayer ? vrPlayer.name : "N/A");
    console.log("PR Holder:", prPlayer ? prPlayer.name : "N/A");
    console.log("");

    console.log("┌──────────────┬──────┬───────┬───────┐");
    console.log("│ JUGADOR      │ BASE │ BONUS │ TOTAL │");
    console.log("├──────────────┼──────┼───────┼───────┤");
    circuit.players.forEach(p => {
      const name = p.player.name.padEnd(12);
      const base = p.basePoints.toString().padStart(4);
      const bonus = p.bonusPoints.toString().padStart(5);
      const total = p.totalPoints.toString().padStart(5);
      console.log("│ " + name + " │" + base + "  │" + bonus + "  │" + total + "  │");
    });
    console.log("└──────────────┴──────┴───────┴───────┘\n");
  });

  await prisma.$disconnect();
}

main().catch(console.error);
