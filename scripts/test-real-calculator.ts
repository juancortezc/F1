import { PrismaClient } from '@prisma/client';
import { ScoreCalculator } from '../utils/ScoreCalculator';

const prisma = new PrismaClient();

async function main() {
  const game = await prisma.game.findFirst({
    where: { status: 'COMPLETED' },
    orderBy: { updatedAt: 'desc' }
  });

  if (!game) {
    console.log('No completed game found');
    return;
  }

  const state = game.state as any;

  // Use players from gameState.settings.players (same as app does)
  const players = state.settings.players;

  console.log('=== TESTING ScoreCalculator ===\n');
  console.log('Players passed to ScoreCalculator:');
  players.forEach((p: any) => console.log('  -', p.id, p.name));

  const calculator = new ScoreCalculator(state, players);
  const breakdown = calculator.getCircuitBreakdown();

  console.log('\n=== CIRCUIT BREAKDOWN ===\n');

  breakdown.forEach(circuit => {
    console.log('--- ' + circuit.name + ' ---');
    circuit.players.forEach(pd => {
      console.log('  ' + pd.player.name + ': BASE=' + pd.basePoints + ' BONUS=' + pd.bonusPoints + ' TOTAL=' + pd.totalPoints);
    });
    console.log('');
  });

  await prisma.$disconnect();
}

main().catch(console.error);
