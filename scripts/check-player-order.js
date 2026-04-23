const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const gameId = 'cmoaruake000190cq425xv782';
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  const state = game.state;

  console.log('=== GAME STATE ===');
  console.log('currentCircuitIndex:', state.currentCircuitIndex);
  console.log('currentTurn:', state.currentTurn);
  console.log('currentPlayerIndex:', state.currentPlayerIndex);
  console.log('Current circuit:', state.circuits[state.currentCircuitIndex]?.name);

  console.log('\n=== PLAYER ORDER (current) ===');
  state.playerOrder.forEach((pid, i) => {
    const player = state.settings.players.find(p => p.id === pid);
    const stats = state.playerStats[pid];
    console.log(`  ${i + 1}. ${player?.name} (id: ${pid}) - totalScore: ${stats?.totalScore}`);
  });

  console.log('\n=== OVERALL STANDINGS (by totalScore) ===');
  const byScore = Object.entries(state.playerStats)
    .map(([pid, s]) => ({ pid, name: state.settings.players.find(p => p.id === pid)?.name, score: s.totalScore }))
    .sort((a, b) => b.score - a.score);
  byScore.forEach((p, i) => console.log(`  ${i + 1}. ${p.name} - ${p.score} pts`));

  console.log('\n=== CURRENT CIRCUIT STANDINGS ===');
  const currentCircuitResults = state.circuitResults[state.currentCircuitIndex];
  if (currentCircuitResults) {
    const circuitPoints = new Map();
    state.settings.players.forEach(p => circuitPoints.set(p.id, 0));

    console.log(`Turns completed in ${state.circuits[state.currentCircuitIndex].name}: ${currentCircuitResults.turns.length}`);

    currentCircuitResults.turns.forEach((turn, ti) => {
      console.log(`  Turn ${ti + 1}:`);
      turn.forEach(result => {
        const name = state.settings.players.find(p => p.id === result.playerId)?.name;
        console.log(`    ${name}: turnScore=${result.turnScore}, avg=${result.averageTime}ms`);
        circuitPoints.set(result.playerId, (circuitPoints.get(result.playerId) || 0) + result.turnScore);
      });
    });

    console.log('\n  Circuit cumulative points:');
    Array.from(circuitPoints.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([pid, pts], i) => {
        const name = state.settings.players.find(p => p.id === pid)?.name;
        console.log(`    ${i + 1}. ${name}: ${pts} pts`);
      });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
