const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function recalculate() {
  const game = await prisma.game.findFirst({
    where: { status: "ACTIVE" }
  });

  if (game === null) {
    console.log("No active game found");
    return;
  }

  const state = JSON.parse(JSON.stringify(game.state));

  console.log("=== RECALCULANDO TODOS LOS PROMEDIOS ===\n");
  console.log("Incluyendo TODOS los tiempos (2:00.000, 2:30.000, etc.)\n");

  // Reset player stats
  for (const playerId of Object.keys(state.playerStats)) {
    state.playerStats[playerId].totalScore = 0;
    state.playerStats[playerId].bestLaps = 0;
    state.playerStats[playerId].bestAverages = 0;
  }

  // Reset session best times
  state.sessionBestTimes = {};

  const getPoints = (rank, totalPlayers) => {
    if (rank === 0) return 3;
    if (rank === 1 && totalPlayers >= 2) return 2;
    if (rank === 2 && totalPlayers >= 3) return 1;
    return 0;
  };

  // Process each circuit
  state.circuitResults.forEach((circuit, ci) => {
    const circuitId = state.circuits[ci].id;
    const circuitName = state.circuits[ci].name;

    console.log("--- " + circuitName.toUpperCase() + " ---\n");

    // Initialize session bests
    state.sessionBestTimes[circuitId] = {
      bestLap: null,
      bestLapPlayerId: null,
      bestAverage: null,
      bestAveragePlayerId: null
    };

    circuit.turns.forEach((turn, ti) => {
      console.log("TURNO " + (ti + 1) + ":");

      // Recalculate ALL averages including penalty times
      turn.forEach(result => {
        const player = state.settings.players.find(p => p.id === result.playerId);

        // NEW: Include ALL times in average (no filtering)
        const allTimes = result.lapTimes;
        const newAverage = Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length);

        const oldAverage = result.averageTime;
        result.averageTime = newAverage;

        // Track best lap for VR (excluding 2:00+ for VR only)
        const validLaps = result.lapTimes.filter(t => t < 120000);
        const bestLap = validLaps.length > 0 ? Math.min(...validLaps) : null;

        if (bestLap !== null) {
          if (state.sessionBestTimes[circuitId].bestLap === null || bestLap < state.sessionBestTimes[circuitId].bestLap) {
            state.sessionBestTimes[circuitId].bestLap = bestLap;
            state.sessionBestTimes[circuitId].bestLapPlayerId = result.playerId;
          }
        }

        if (state.sessionBestTimes[circuitId].bestAverage === null || newAverage < state.sessionBestTimes[circuitId].bestAverage) {
          state.sessionBestTimes[circuitId].bestAverage = newAverage;
          state.sessionBestTimes[circuitId].bestAveragePlayerId = result.playerId;
        }

        const formatTime = (ms) => {
          const totalSec = ms / 1000;
          const min = Math.floor(totalSec / 60);
          const sec = (totalSec % 60).toFixed(3);
          return min + ":" + sec.padStart(6, "0");
        };

        if (oldAverage !== newAverage) {
          console.log("  " + player?.name + ": " + formatTime(oldAverage) + " → " + formatTime(newAverage) + " (CORREGIDO)");
        } else {
          console.log("  " + player?.name + ": " + formatTime(newAverage));
        }
      });

      // Recalculate turn scores
      const sorted = [...turn].sort((a, b) => a.averageTime - b.averageTime);
      const totalPlayers = sorted.length;

      console.log("  Posiciones:");
      sorted.forEach((result, rank) => {
        const points = getPoints(rank, totalPlayers);
        result.turnScore = points;
        state.playerStats[result.playerId].totalScore += points;

        const player = state.settings.players.find(p => p.id === result.playerId);
        console.log("    " + (rank + 1) + "° " + player?.name + ": +" + points + " pts");
      });
      console.log("");
    });

    // Award VR bonus at end of completed circuit
    if (circuit.turns.length >= state.settings.turnsPerCircuit) {
      const vrPlayerId = state.sessionBestTimes[circuitId].bestLapPlayerId;
      if (vrPlayerId !== null && state.settings.pointsForBestLap > 0) {
        state.playerStats[vrPlayerId].totalScore += state.settings.pointsForBestLap;
        state.playerStats[vrPlayerId].bestLaps += 1;
        const vrPlayer = state.settings.players.find(p => p.id === vrPlayerId);
        console.log("🏎️ VR BONUS (+" + state.settings.pointsForBestLap + ") → " + vrPlayer?.name + "\n");
      }
    }
  });

  console.log("=== TOTALES FINALES ===");
  for (const [playerId, stats] of Object.entries(state.playerStats)) {
    const player = state.settings.players.find(p => p.id === playerId);
    console.log(player?.name + ": " + stats.totalScore + " pts | VR: " + stats.bestLaps);
  }

  // Update database
  await prisma.game.update({
    where: { id: game.id },
    data: { state: state }
  });

  console.log("\n✅ Base de datos actualizada!");

  await prisma.$disconnect();
}

recalculate().catch(console.error);
