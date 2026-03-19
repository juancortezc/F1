const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function changeVegasToMiami() {
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
    console.log('\n🔄 Cambiando Las Vegas por Miami en el campeonato activo...\n');

    // 2. Buscar el circuito de Miami
    const miamiCircuit = await prisma.circuit.findFirst({
      where: { name: 'Miami' }
    });

    if (!miamiCircuit) {
      console.log('❌ Circuito Miami no encontrado en la base de datos');
      console.log('Circuitos disponibles:');
      const circuits = await prisma.circuit.findMany({ select: { name: true } });
      circuits.forEach(c => console.log(`  - ${c.name}`));
      return;
    }

    console.log(`✅ Circuito Miami encontrado: ${miamiCircuit.id}`);

    // 3. Buscar índice de Las Vegas en el estado del juego
    const vegasIndex = gameState.circuits.findIndex(c => c.name === 'Las Vegas');

    if (vegasIndex === -1) {
      console.log('❌ Las Vegas no encontrado en el campeonato activo');
      console.log('Circuitos actuales:');
      gameState.circuits.forEach((c, i) => console.log(`  ${i}: ${c.name}`));
      return;
    }

    console.log(`✅ Las Vegas encontrado en posición ${vegasIndex}`);

    // 4. Actualizar el estado del juego
    const updatedCircuits = [...gameState.circuits];
    updatedCircuits[vegasIndex] = {
      id: miamiCircuit.id,
      name: miamiCircuit.name,
      imageUrl: miamiCircuit.imageUrl,
      createdAt: miamiCircuit.createdAt,
      updatedAt: miamiCircuit.updatedAt,
      bestLapHolder: miamiCircuit.bestLapHolder,
      bestLapHolderId: miamiCircuit.bestLapHolderId,
      bestAverageHolder: miamiCircuit.bestAverageHolder,
      historicalBestLap: miamiCircuit.historicalBestLap,
      bestAverageHolderId: miamiCircuit.bestAverageHolderId,
      historicalBestAverage: miamiCircuit.historicalBestAverage,
      historicalBestLapDate: miamiCircuit.historicalBestLapDate,
      historicalBestAverageDate: miamiCircuit.historicalBestAverageDate
    };

    // Actualizar también en settings.circuits
    const updatedSettingsCircuits = [...gameState.settings.circuits];
    updatedSettingsCircuits[vegasIndex] = updatedCircuits[vegasIndex];

    // Actualizar circuitResults para el nuevo circuito
    const updatedCircuitResults = [...gameState.circuitResults];
    updatedCircuitResults[vegasIndex] = {
      circuitId: miamiCircuit.id,
      turns: []
    };

    // Actualizar sessionBestTimes
    const updatedSessionBestTimes = { ...gameState.sessionBestTimes };
    const vegasId = gameState.circuits[vegasIndex].id;
    delete updatedSessionBestTimes[vegasId];
    updatedSessionBestTimes[miamiCircuit.id] = {
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

changeVegasToMiami();
