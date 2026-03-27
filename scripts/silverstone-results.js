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
  const circuitName = "Suzuka";
  const circuitIndex = state.circuits.findIndex(c => c.name === circuitName);
  const circuitResults = state.circuitResults[circuitIndex];

  console.log("╔════════════════════════════════════════════════════════════════════════════════╗");
  console.log("║                          SUZUKA - RESULTADOS DETALLADOS                        ║");
  console.log("╚════════════════════════════════════════════════════════════════════════════════╝\n");

  circuitResults.turns.forEach((turn, ti) => {
    console.log("┌──────────────────────────────────────────────────────────────────────────────────┐");
    console.log("│ TURNO " + (ti + 1) + "                                                                          │");
    console.log("├────────────┬─────────────┬─────────────┬─────────────┬─────────────┬────────────┤");
    console.log("│ JUGADOR    │ VUELTA 1    │ VUELTA 2    │ VUELTA 3    │ PROMEDIO    │ PUNTOS     │");
    console.log("├────────────┼─────────────┼─────────────┼─────────────┼─────────────┼────────────┤");

    const sorted = [...turn].sort((a, b) => a.averageTime - b.averageTime);

    sorted.forEach((result) => {
      const player = state.settings.players.find(p => p.id === result.playerId);
      const name = (player?.name || "Unknown").padEnd(10);

      const formatTime = (ms) => {
        if (ms >= 120000) return "2:00.000 ⚠️";
        const totalSec = ms / 1000;
        const min = Math.floor(totalSec / 60);
        const sec = (totalSec % 60).toFixed(3);
        return min + ":" + sec.padStart(6, "0");
      };

      const v1 = formatTime(result.lapTimes[0]).padEnd(11);
      const v2 = formatTime(result.lapTimes[1]).padEnd(11);
      const v3 = formatTime(result.lapTimes[2]).padEnd(11);
      const avg = formatTime(result.averageTime).padEnd(11);
      const pts = (result.turnScore + " pts").padEnd(10);

      console.log("│ " + name + " │ " + v1 + " │ " + v2 + " │ " + v3 + " │ " + avg + " │ " + pts + " │");
    });

    console.log("└────────────┴─────────────┴─────────────┴─────────────┴─────────────┴────────────┘\n");
  });

  const circuitId = state.circuits[circuitIndex].id;
  const bests = state.sessionBestTimes[circuitId];
  const vrPlayer = state.settings.players.find(p => p.id === bests?.bestLapPlayerId);

  console.log("🏎️ VUELTA RÁPIDA (VR): " + (bests?.bestLap/1000).toFixed(3) + "s - " + vrPlayer?.name + " (+2 pts)");

  await prisma.$disconnect();
}

main().catch(console.error);
