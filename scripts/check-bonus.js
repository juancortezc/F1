const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const game = await prisma.game.findFirst({
    where: { status: "ACTIVE" }
  });

  if (game === null) {
    console.log("No active game found");
    return;
  }

  const state = game.state;

  console.log("=== ANÁLISIS DE BONUS VR/PR ===\n");
  console.log("Configuración:");
  console.log("  Points for Best Lap (VR):", state.settings.pointsForBestLap);
  console.log("  Points for Best Average (PR):", state.settings.pointsForBestAverage);
  console.log("");

  console.log("=== SESSION BEST TIMES (VR/PR holders) ===\n");
  for (const [circuitId, bests] of Object.entries(state.sessionBestTimes || {})) {
    const circuit = state.circuits.find(c => c.id === circuitId);
    const vrPlayer = state.settings.players.find(p => p.id === bests.bestLapPlayerId);
    const prPlayer = state.settings.players.find(p => p.id === bests.bestAveragePlayerId);

    console.log(circuit?.name + ":");
    if (bests.bestLap) {
      console.log("  VR:", (bests.bestLap/1000).toFixed(3) + "s → " + vrPlayer?.name);
    }
    if (bests.bestAverage) {
      console.log("  PR:", (bests.bestAverage/1000).toFixed(3) + "s → " + prPlayer?.name);
    }
    console.log("");
  }

  console.log("=== PLAYER STATS (incluyendo VR/PR counts) ===\n");
  for (const [playerId, stats] of Object.entries(state.playerStats)) {
    const player = state.settings.players.find(p => p.id === playerId);
    console.log(player?.name + ":");
    console.log("  Total Score:", stats.totalScore);
    console.log("  Best Laps (VR):", stats.bestLaps);
    console.log("  Best Averages (PR):", stats.bestAverages);
    console.log("");
  }

  console.log("=== DESGLOSE POR CIRCUITO ===\n");
  state.circuitResults.forEach((circuit, ci) => {
    const circuitName = state.circuits[ci]?.name;
    console.log("--- " + circuitName + " ---");

    let circuitTotals = {};
    state.settings.players.forEach(p => circuitTotals[p.id] = 0);

    circuit.turns.forEach((turn, ti) => {
      console.log("Turno " + (ti + 1) + ":");
      turn.forEach(result => {
        const player = state.settings.players.find(p => p.id === result.playerId);
        console.log("  " + player?.name + ": " + result.turnScore + " pts");
        circuitTotals[result.playerId] += result.turnScore;
      });
    });

    console.log("Totales del circuito (solo turnos):");
    for (const [playerId, total] of Object.entries(circuitTotals)) {
      const player = state.settings.players.find(p => p.id === playerId);
      console.log("  " + player?.name + ": " + total + " pts");
    }
    console.log("");
  });

  await prisma.$disconnect();
}

main().catch(console.error);
