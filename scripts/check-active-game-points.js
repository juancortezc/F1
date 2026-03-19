const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkActiveGamePoints() {
  try {
    const game = await prisma.game.findFirst({
      where: { status: 'ACTIVE' }
    });

    if (!game) {
      console.log('❌ No hay campeonato activo');
      return;
    }

    const state = game.state;
    console.log('\n=== CAMPEONATO ACTIVO ===\n');
    console.log('ID del juego:', game.id);
    console.log('Circuitos completados:', state.currentCircuitIndex, 'de', state.circuits.length);
    console.log('Turno actual:', state.currentTurnNumber, 'de', state.turnsPerCircuit);
    console.log('\n--- CONFIGURACIÓN DE PUNTOS ---');
    console.log('Sistema de puntos:', JSON.stringify(state.pointsConfig, null, 2));

    console.log('\n--- ANÁLISIS DE PUNTOS POR JUGADOR ---\n');

    state.players.forEach(player => {
      console.log(`\n🏎️  ${player.name.toUpperCase()} (ID: ${player.id})`);
      console.log('─'.repeat(50));
      console.log(`PUNTOS TOTALES: ${player.totalPoints} pts`);

      // Mostrar desglose por circuito
      if (player.circuitResults && player.circuitResults.length > 0) {
        console.log('\nDesglose por circuito:');
        player.circuitResults.forEach((result, idx) => {
          console.log(`\n  Circuito ${idx + 1}: ${state.circuits[idx]?.name || 'Desconocido'}`);
          console.log(`    Posición final: ${result.position}°`);
          console.log(`    Puntos obtenidos: ${result.points} pts`);
          console.log(`    Mejor vuelta: ${result.bestLap ? (result.bestLap / 1000).toFixed(3) + 's' : 'N/A'}`);
          console.log(`    Promedio: ${result.bestAverage ? (result.bestAverage / 1000).toFixed(3) + 's' : 'N/A'}`);
        });
      }

      // Mostrar estadísticas generales
      console.log(`\nEstadísticas generales:`);
      console.log(`  Vueltas rápidas: ${player.fastestLaps || 0}`);
      console.log(`  Mejores promedios: ${player.bestAverages || 0}`);
      console.log(`  Podios: 1° (${player.firstPlaces || 0}) | 2° (${player.secondPlaces || 0}) | 3° (${player.thirdPlaces || 0})`);
    });

    console.log('\n\n=== ORDEN FINAL (por puntos) ===\n');
    const sortedPlayers = [...state.players].sort((a, b) => b.totalPoints - a.totalPoints);
    sortedPlayers.forEach((player, idx) => {
      console.log(`${idx + 1}. ${player.name}: ${player.totalPoints} pts`);
    });

    console.log('\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkActiveGamePoints();
