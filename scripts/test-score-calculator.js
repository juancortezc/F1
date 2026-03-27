const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Simular ScoreCalculator
class ScoreCalculator {
  constructor(gameState, players) {
    this.gameState = gameState;
    this.players = players;
  }

  getPositionPoints(rank, totalPlayers) {
    if (rank === 0) return 3;
    if (rank === 1 && totalPlayers >= 2) return 2;
    if (rank === 2 && totalPlayers >= 3) return 1;
    return 0;
  }

  getTurnPositions(turn) {
    const sortedTurn = [...turn].sort((a, b) => b.turnScore - a.turnScore);
    return sortedTurn.map((result, index) => ({
      playerId: result.playerId,
      position: index + 1
    }));
  }

  getCircuitBreakdown() {
    const { pointsForBestLap, pointsForBestAverage } = this.gameState.settings;
    const sessionBestTimes = this.gameState.sessionBestTimes || {};

    return this.gameState.settings.circuits.map((circuit, circuitIndex) => {
      const circuitResult = this.gameState.circuitResults[circuitIndex];
      if (!circuitResult) return null;

      const isCircuitComplete = circuitResult.turns.length >= this.gameState.settings.turnsPerCircuit;
      const circuitBests = sessionBestTimes[circuit.id];
      const vrHolderId = isCircuitComplete ? circuitBests?.bestLapPlayerId : null;
      const prHolderId = isCircuitComplete ? circuitBests?.bestAveragePlayerId : null;

      const participatingPlayerIds = new Set();
      circuitResult.turns.forEach(turn => {
        turn.forEach(result => participatingPlayerIds.add(result.playerId));
      });

      const playerCircuitData = this.players
        .filter(player => participatingPlayerIds.has(player.id))
        .map((player) => {
          const playerId = player.id;
          let circuitBasePoints = 0;
          let circuitBonusPoints = 0;

          circuitResult.turns.forEach((turn) => {
            const playerTurn = turn.find(p => p.playerId === playerId);
            if (!playerTurn) return;

            const positions = this.getTurnPositions(turn);
            const playerPosition = positions.find(p => p.playerId === playerId);
            const position = playerPosition ? playerPosition.position : turn.length + 1;
            const basePoints = this.getPositionPoints(position - 1, turn.length);

            circuitBasePoints += basePoints;
          });

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
        isComplete: isCircuitComplete,
        vrHolder: vrHolderId ? this.players.find(p => p.id === vrHolderId)?.name : null,
        prHolder: prHolderId ? this.players.find(p => p.id === prHolderId)?.name : null,
        players: playerCircuitData.sort((a, b) => b.totalPoints - a.totalPoints)
      };
    }).filter(Boolean);
  }
}

async function main() {
  const game = await prisma.game.findFirst({
    where: { status: "ACTIVE" }
  });

  if (game === null) {
    console.log("No active game found");
    return;
  }

  const state = game.state;
  const calculator = new ScoreCalculator(state, state.settings.players);
  const breakdown = calculator.getCircuitBreakdown();

  console.log("=== DESGLOSE CON BONUS VR/PR ===\n");
  console.log("VR: +" + state.settings.pointsForBestLap + " pts");
  console.log("PR: +" + state.settings.pointsForBestAverage + " pts\n");

  breakdown.forEach(circuit => {
    console.log("╔════════════════════════════════════════════╗");
    console.log("║ " + circuit.name.toUpperCase().padEnd(42) + " ║");
    console.log("╚════════════════════════════════════════════╝");
    console.log("Estado: " + (circuit.isComplete ? "COMPLETO" : "EN PROGRESO"));
    if (circuit.isComplete) {
      console.log("VR Holder: " + (circuit.vrHolder || "N/A"));
      console.log("PR Holder: " + (circuit.prHolder || "N/A"));
    }
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

  // Verify totals match playerStats
  console.log("=== VERIFICACIÓN DE TOTALES ===\n");
  let calculatedTotals = {};
  state.settings.players.forEach(p => calculatedTotals[p.id] = 0);

  breakdown.forEach(circuit => {
    circuit.players.forEach(p => {
      calculatedTotals[p.player.id] += p.totalPoints;
    });
  });

  console.log("┌──────────────┬────────────┬──────────┬─────────┐");
  console.log("│ JUGADOR      │ CALCULADO  │ EN STATS │ MATCH   │");
  console.log("├──────────────┼────────────┼──────────┼─────────┤");
  for (const [playerId, calculated] of Object.entries(calculatedTotals)) {
    const player = state.settings.players.find(p => p.id === playerId);
    const actual = state.playerStats[playerId]?.totalScore || 0;
    const match = calculated === actual ? "✅" : "❌";
    const name = player?.name.padEnd(12);
    console.log("│ " + name + " │    " + calculated.toString().padStart(2) + "      │    " + actual.toString().padStart(2) + "    │   " + match + "    │");
  }
  console.log("└──────────────┴────────────┴──────────┴─────────┘");

  await prisma.$disconnect();
}

main().catch(console.error);
