const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function changeMiamiToSpa() {
  try {
    // 1. Obtener el juego activo
    const activeGame = await prisma.game.findFirst({
      where: { status: 'ACTIVE' }
    });

    if (!activeGame) {
      console.log('❌ No hay campeonato activo');
      return;
    }

    const gameState = activeGame.state;
    console.log('\n🔄 Cambiando Miami por Spa en el campeonato activo...\n');

    // 2. Buscar el circuito de Spa
    const spaCircuit = await prisma.circuit.findFirst({
      where: { name: 'Spa' }
    });

    if (!spaCircuit) {
      console.log('❌ Circuito Spa no encontrado en la base de datos');
      console.log('Circuitos disponibles:');
      const circuits = await prisma.circuit.findMany({ select: { name: true } });
      circuits.forEach(c => console.log(`  - ${c.name}`));
      return;
    }

    console.log(`✅ Circuito Spa encontrado: ${spaCircuit.id}`);

    // 3. Buscar índice de Miami en el estado del juego
    const miamiIndex = gameState.circuits.findIndex(c => c.name === 'Miami');

    if (miamiIndex === -1) {
      console.log('❌ Miami no encontrado en el campeonato activo');
      console.log('Circuitos actuales:');
      gameState.circuits.forEach((c, i) => console.log(`  ${i}: ${c.name}`));
      return;
    }

    console.log(`✅ Miami encontrado en posición ${miamiIndex}`);

    // 4. Actualizar el estado del juego
    const updatedCircuits = [...gameState.circuits];
    updatedCircuits[miamiIndex] = {
      id: spaCircuit.id,
      name: spaCircuit.name,
      imageUrl: spaCircuit.imageUrl,
      createdAt: spaCircuit.createdAt,
      updatedAt: spaCircuit.updatedAt,
      bestLapHolder: spaCircuit.bestLapHolder,
      bestLapHolderId: spaCircuit.bestLapHolderId,
      bestAverageHolder: spaCircuit.bestAverageHolder,
      historicalBestLap: spaCircuit.historicalBestLap,
      bestAverageHolderId: spaCircuit.bestAverageHolderId,
      historicalBestAverage: spaCircuit.historicalBestAverage,
      historicalBestLapDate: spaCircuit.historicalBestLapDate,
      historicalBestAverageDate: spaCircuit.historicalBestAverageDate
    };

    // Actualizar también en settings.circuits
    const updatedSettingsCircuits = [...gameState.settings.circuits];
    updatedSettingsCircuits[miamiIndex] = updatedCircuits[miamiIndex];

    // Actualizar circuitResults para el nuevo circuito
    const updatedCircuitResults = [...gameState.circuitResults];
    updatedCircuitResults[miamiIndex] = {
      circuitId: spaCircuit.id,
      turns: []
    };

    // Actualizar sessionBestTimes
    const updatedSessionBestTimes = { ...gameState.sessionBestTimes };
    const miamiId = gameState.circuits[miamiIndex].id;
    delete updatedSessionBestTimes[miamiId];
    updatedSessionBestTimes[spaCircuit.id] = {
      bestLap: null,
      bestAverage: null,
      bestLapPlayerId: null,
      bestAveragePlayerId: null
    };

    const updatedGameState = {
      ...gameState,
      circuits: updatedCircuits,
      settings: {
        ...gameState.settings,
        circuits: updatedSettingsCircuits
      },
      circuitResults: updatedCircuitResults,
      sessionBestTimes: updatedSessionBestTimes
    };

    // 5. Guardar en la base de datos
    await prisma.game.update({
      where: { id: activeGame.id },
      data: {
        state: updatedGameState
      }
    });

    console.log('\n✅ Cambio exitoso!');
    console.log(`\nCircuitos actualizados:`);
    updatedCircuits.forEach((c, i) => console.log(`  ${i + 1}. ${c.name}`));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

changeMiamiToSpa();
