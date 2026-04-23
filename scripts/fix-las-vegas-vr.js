const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const gameId = 'cmoaruake000190cq425xv782';
  const vrPoints = 2;
  const prPoints = 0;

  // Get game
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) {
    console.log('Game not found');
    return;
  }

  const state = game.state;
  const lasVegas = state.settings.circuits.find(c => c.name === 'Las Vegas');
  if (!lasVegas) {
    console.log('Las Vegas circuit not found');
    return;
  }

  const lasVegasBests = state.sessionBestTimes[lasVegas.id];
  const vrWinner = lasVegasBests?.bestLapPlayerId;
  const prWinner = lasVegasBests?.bestAveragePlayerId;

  console.log('Las Vegas VR winner:', vrWinner);
  console.log('Las Vegas PR winner:', prWinner);

  console.log('\n=== BEFORE FIX ===');
  for (const [pid, s] of Object.entries(state.playerStats)) {
    console.log(`  ${pid}: score=${s.totalScore} bestLaps=${s.bestLaps} bestAverages=${s.bestAverages}`);
  }

  // Update settings
  state.settings.pointsForBestLap = vrPoints;
  state.settings.pointsForBestAverage = prPoints;

  // Award VR bonus retroactively for Las Vegas
  if (vrPoints > 0 && vrWinner && state.playerStats[vrWinner]) {
    state.playerStats[vrWinner].totalScore += vrPoints;
    state.playerStats[vrWinner].bestLaps = (state.playerStats[vrWinner].bestLaps || 0) + 1;
    console.log(`\n✅ Added ${vrPoints} VR points + 1 bestLap to ${vrWinner}`);
  }

  // Award PR bonus retroactively for Las Vegas
  if (prPoints > 0 && prWinner && state.playerStats[prWinner]) {
    state.playerStats[prWinner].totalScore += prPoints;
    state.playerStats[prWinner].bestAverages = (state.playerStats[prWinner].bestAverages || 0) + 1;
    console.log(`✅ Added ${prPoints} PR points + 1 bestAverage to ${prWinner}`);
  }

  console.log('\n=== AFTER FIX ===');
  for (const [pid, s] of Object.entries(state.playerStats)) {
    console.log(`  ${pid}: score=${s.totalScore} bestLaps=${s.bestLaps} bestAverages=${s.bestAverages}`);
  }

  // Save
  await prisma.game.update({
    where: { id: gameId },
    data: { state }
  });

  console.log('\n✅ Game state updated successfully');
  console.log(`New settings: pointsForBestLap=${vrPoints}, pointsForBestAverage=${prPoints}`);
  console.log('Next circuits (Suzuka, Brasil) will now award VR/PR bonuses automatically.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
