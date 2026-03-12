const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function verify() {
  const players = await prisma.player.findMany();
  const games = await prisma.game.findMany({ where: { status: "COMPLETED" } });

  const stats = {};
  players.forEach(p => {
    stats[p.id] = { name: p.name, isGuest: p.isGuest, cmp: 0, vic: 0, vr: 0, pr: 0, totalScore: 0 };
  });

  games.forEach((game) => {
    const state = game.state;
    if (state === null || state.playerStats === undefined) return;

    // Championship (winner with highest score, only if > 0)
    const standings = Object.entries(state.playerStats)
      .map(([pid, s]) => ({ pid, score: s.totalScore || 0 }))
      .sort((a, b) => b.score - a.score);

    if (standings[0] && standings[0].score > 0 && stats[standings[0].pid]) {
      stats[standings[0].pid].cmp++;
    }

    // Add totalScore for all
    Object.entries(state.playerStats).forEach(([pid, s]) => {
      if (stats[pid]) stats[pid].totalScore += s.totalScore || 0;
    });

    // Circuit victories (only if > 0)
    if (state.circuitResults) {
      state.circuitResults.forEach((cr) => {
        if (cr.turns === undefined) return;
        const points = {};
        cr.turns.forEach((turn) => {
          if (Array.isArray(turn)) {
            turn.forEach((pd) => {
              points[pd.playerId] = (points[pd.playerId] || 0) + (pd.turnScore || 0);
            });
          }
        });
        const entries = Object.entries(points).sort((a, b) => b[1] - a[1]);
        const winner = entries[0];
        if (winner && winner[1] > 0 && stats[winner[0]]) {
          stats[winner[0]].vic++;
        }
      });
    }

    // VR and PR from sessionBestTimes
    if (state.sessionBestTimes) {
      Object.values(state.sessionBestTimes).forEach((best) => {
        if (best.bestLapPlayerId && stats[best.bestLapPlayerId]) stats[best.bestLapPlayerId].vr++;
        if (best.bestAveragePlayerId && stats[best.bestAveragePlayerId]) stats[best.bestAveragePlayerId].pr++;
      });
    }
  });

  console.log("=== EXPECTED HALL OF FAME STATS ===");
  console.log("(CMP=Campeonatos, VIC=Victorias Circuito, VR=Vueltas Rápidas, PR=Mejor Promedio)");
  console.log("");

  const ranked = Object.values(stats)
    .map((s) => ({ ...s, pts: s.cmp * 10 + s.vic * 3 + s.vr * 2 + s.pr }))
    .filter((s) => s.pts > 0 || s.totalScore > 0)
    .sort((a, b) => b.pts - a.pts);

  console.log("POS | JUGADOR     | PTS | CMP | VIC | VR | PR | GUEST");
  console.log("----+-------------+-----+-----+-----+----+----+------");
  ranked.forEach((s, i) => {
    console.log(String(i+1).padStart(2) + "  | " + s.name.padEnd(11) + " | " + String(s.pts).padStart(3) + " | " + String(s.cmp).padStart(3) + " | " + String(s.vic).padStart(3) + " | " + String(s.vr).padStart(2) + " | " + String(s.pr).padStart(2) + " | " + (s.isGuest ? "YES" : "NO"));
  });

  await prisma.$disconnect();
}

verify().catch(console.error);
