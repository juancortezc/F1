const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Find active tournament
  const tournament = await prisma.tournament.findFirst({
    where: { status: 'ACTIVE' },
    include: {
      participants: { include: { player: true } },
      games: {
        where: { gameMode: 'tournament' },
        orderBy: { position: 'asc' }
      }
    }
  });

  if (!tournament) {
    console.log('No active tournament found');
    return;
  }

  console.log('\n=== ACTIVE TOURNAMENT ===');
  console.log('ID:', tournament.id);
  console.log('Name:', tournament.name);
  console.log('Played circuits:', tournament.playedCircuitIds?.length || 0);
  console.log('Games:', tournament.games.length);

  console.log('\n=== PARTICIPANTS ===');
  tournament.participants.forEach(p => {
    console.log(`- ${p.player?.name} (id: ${p.playerId}): ${p.totalPoints} pts (W:${p.championshipsWon} S:${p.championshipsSecond} T:${p.championshipsThird})`);
  });

  // 2. Find game details
  for (const game of tournament.games) {
    const state = game.state;
    const circuits = state?.settings?.circuits || [];
    const circuitNames = circuits.map(c => c.name);
    console.log(`\n=== GAME ${game.position} (${game.status}) ===`);
    console.log('Game ID:', game.id);
    console.log('Circuits:', circuitNames.join(', '));
    console.log('pointsForBestLap:', state?.settings?.pointsForBestLap);
    console.log('pointsForBestAverage:', state?.settings?.pointsForBestAverage);
    console.log('scoringMethod:', state?.settings?.scoringMethod);

    // Show sessionBestTimes (per circuit VR/PR holder)
    if (state?.sessionBestTimes) {
      console.log('\nSession Best Times:');
      for (const [circuitId, bests] of Object.entries(state.sessionBestTimes)) {
        const circuit = circuits.find(c => c.id === circuitId);
        const bestLapPlayer = tournament.participants.find(p => p.playerId === bests.bestLapPlayerId);
        const bestAvgPlayer = tournament.participants.find(p => p.playerId === bests.bestAveragePlayerId);
        console.log(`  ${circuit?.name || circuitId}:`);
        console.log(`    Best Lap: ${bests.bestLap}ms by ${bestLapPlayer?.player?.name || bests.bestLapPlayerId}`);
        console.log(`    Best Avg: ${bests.bestAverage}ms by ${bestAvgPlayer?.player?.name || bests.bestAveragePlayerId}`);
      }
    }

    // Show player stats
    if (state?.playerStats) {
      console.log('\nPlayer Stats in this game:');
      for (const [playerId, stats] of Object.entries(state.playerStats)) {
        const participant = tournament.participants.find(p => p.playerId === playerId);
        console.log(`  ${participant?.player?.name || playerId}: ${stats.totalScore} pts (VR:${stats.bestLaps} PR:${stats.bestAverages})`);
      }
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
