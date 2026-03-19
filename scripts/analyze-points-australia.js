// Análisis de puntos del campeonato activo - Circuito Australia

const gameState = {
  settings: {
    scoringMethod: "average",
    awardBestTimeFor: "turn",
    pointsForBestLap: 2,
    pointsForBestAverage: 0,
    turnsPerCircuit: 2
  },
  circuitResults: [
    {
      circuitId: "cmd7vv65x0000mgf2vphb96zq",
      turns: [
        // TURNO 1
        [
          { playerId: "1", averageTime: 80986, turnScore: 5 },
          { playerId: "2", averageTime: 82343, turnScore: 2 },
          { playerId: "3", averageTime: 86300, turnScore: 1 }
        ],
        // TURNO 2
        [
          { playerId: "1", averageTime: 82868, turnScore: 3 },
          { playerId: "2", averageTime: 83332, turnScore: 1 },
          { playerId: "3", averageTime: 83109, turnScore: 4 }
        ]
      ]
    }
  ],
  playerStats: {
    "1": { totalScore: 8, bestLaps: 1, bestAverages: 0 },
    "2": { totalScore: 3, bestLaps: 0, bestAverages: 0 },
    "3": { totalScore: 5, bestLaps: 1, bestAverages: 0 }
  },
  lapTimesLog: [
    // TURNO 1
    { playerId: "1", lap: 1, time: 80986, turn: 1 },
    { playerId: "1", lap: 2, time: 120000, turn: 1 },
    { playerId: "1", lap: 3, time: 120000, turn: 1 },
    { playerId: "2", lap: 1, time: 120000, turn: 1 },
    { playerId: "2", lap: 2, time: 82365, turn: 1 },
    { playerId: "2", lap: 3, time: 82321, turn: 1 },
    { playerId: "3", lap: 1, time: 89990, turn: 1 },
    { playerId: "3", lap: 2, time: 86262, turn: 1 },
    { playerId: "3", lap: 3, time: 82647, turn: 1 },
    // TURNO 2
    { playerId: "1", lap: 1, time: 83864, turn: 2 },
    { playerId: "1", lap: 2, time: 81872, turn: 2 },
    { playerId: "1", lap: 3, time: 120000, turn: 2 },
    { playerId: "2", lap: 1, time: 82169, turn: 2 },
    { playerId: "2", lap: 2, time: 82728, turn: 2 },
    { playerId: "2", lap: 3, time: 85099, turn: 2 },
    { playerId: "3", lap: 1, time: 86404, turn: 2 },
    { playerId: "3", lap: 2, time: 82061, turn: 2 },
    { playerId: "3", lap: 3, time: 80863, turn: 2 }
  ]
};

console.log('\n=== ANÁLISIS DE PUNTOS - AUSTRALIA ===\n');
console.log('CONFIGURACIÓN:');
console.log('  - Método: Mejor promedio de 3 vueltas');
console.log('  - Puntos por mejor vuelta: 2 pts');
console.log('  - Mejor tiempo se otorga: por turno');
console.log('  - Turnos por circuito: 2');

console.log('\n--- TURNO 1 ---\n');

// Análisis Turno 1
const turn1 = [
  { player: "BlackMamba", id: "1", avg: 80986, laps: [80986, 120000, 120000] },
  { player: "Berna", id: "2", avg: 82343, laps: [120000, 82365, 82321] },
  { player: "Borgia", id: "3", avg: 86300, laps: [89990, 86262, 82647] }
];

const turn1Sorted = [...turn1].sort((a, b) => a.avg - b.avg);
console.log('PROMEDIOS ORDENADOS (menor = mejor):');
turn1Sorted.forEach((p, idx) => {
  const points = idx === 0 ? 5 : idx === 1 ? 3 : 1;
  console.log(`  ${idx + 1}° ${p.player}: ${(p.avg/1000).toFixed(3)}s → ${points} pts`);
});

// Mejor vuelta del turno 1
const allLapsTurn1 = turn1.flatMap(p => p.laps.map(l => ({ player: p.player, id: p.id, time: l })));
const fastestTurn1 = allLapsTurn1.filter(l => l.time < 120000).sort((a, b) => a.time - b.time)[0];
console.log(`\nMEJOR VUELTA DEL TURNO: ${fastestTurn1.player} → ${(fastestTurn1.time/1000).toFixed(3)}s → +2 pts`);

console.log('\nPUNTOS TURNO 1:');
console.log(`  BlackMamba: 5 (1° promedio) + ${fastestTurn1.id === "1" ? "2 (mejor vuelta)" : "0"} = ${5 + (fastestTurn1.id === "1" ? 2 : 0)} pts`);
console.log(`  Berna: 3 (2° promedio) + ${fastestTurn1.id === "2" ? "2 (mejor vuelta)" : "0"} = ${3 + (fastestTurn1.id === "2" ? 2 : 0)} pts`);
console.log(`  Borgia: 1 (3° promedio) + ${fastestTurn1.id === "3" ? "2 (mejor vuelta)" : "0"} = ${1 + (fastestTurn1.id === "3" ? 2 : 0)} pts`);

console.log('\n--- TURNO 2 ---\n');

// Análisis Turno 2
const turn2 = [
  { player: "BlackMamba", id: "1", avg: 82868, laps: [83864, 81872, 120000] },
  { player: "Berna", id: "2", avg: 83332, laps: [82169, 82728, 85099] },
  { player: "Borgia", id: "3", avg: 83109, laps: [86404, 82061, 80863] }
];

const turn2Sorted = [...turn2].sort((a, b) => a.avg - b.avg);
console.log('PROMEDIOS ORDENADOS (menor = mejor):');
turn2Sorted.forEach((p, idx) => {
  const points = idx === 0 ? 5 : idx === 1 ? 3 : 1;
  console.log(`  ${idx + 1}° ${p.player}: ${(p.avg/1000).toFixed(3)}s → ${points} pts`);
});

// Mejor vuelta del turno 2
const allLapsTurn2 = turn2.flatMap(p => p.laps.map(l => ({ player: p.player, id: p.id, time: l })));
const fastestTurn2 = allLapsTurn2.filter(l => l.time < 120000).sort((a, b) => a.time - b.time)[0];
console.log(`\nMEJOR VUELTA DEL TURNO: ${fastestTurn2.player} → ${(fastestTurn2.time/1000).toFixed(3)}s → +2 pts`);

console.log('\nPUNTOS TURNO 2:');
turn2Sorted.forEach(p => {
  const posPoints = p.avg === turn2Sorted[0].avg ? 5 : p.avg === turn2Sorted[1].avg ? 3 : 1;
  const lapBonus = fastestTurn2.id === p.id ? 2 : 0;
  console.log(`  ${p.player}: ${posPoints} (promedio) + ${lapBonus} ${lapBonus > 0 ? "(mejor vuelta)" : ""} = ${posPoints + lapBonus} pts`);
});

console.log('\n=== TOTALES AUSTRALIA (2 turnos) ===\n');
const turn1Points = {
  "1": 5 + (fastestTurn1.id === "1" ? 2 : 0),
  "2": 3 + (fastestTurn1.id === "2" ? 2 : 0),
  "3": 1 + (fastestTurn1.id === "3" ? 2 : 0)
};

const turn2Points = {
  "1": (turn2Sorted[0].id === "1" ? 5 : turn2Sorted[1].id === "1" ? 3 : 1) + (fastestTurn2.id === "1" ? 2 : 0),
  "2": (turn2Sorted[0].id === "2" ? 5 : turn2Sorted[1].id === "2" ? 3 : 1) + (fastestTurn2.id === "2" ? 2 : 0),
  "3": (turn2Sorted[0].id === "3" ? 5 : turn2Sorted[1].id === "3" ? 3 : 1) + (fastestTurn2.id === "3" ? 2 : 0)
};

console.log('BlackMamba:');
console.log(`  Turno 1: ${turn1Points["1"]} pts`);
console.log(`  Turno 2: ${turn2Points["1"]} pts`);
console.log(`  TOTAL: ${turn1Points["1"] + turn2Points["1"]} pts`);
console.log(`  (Sistema dice: ${gameState.playerStats["1"].totalScore} pts) ${turn1Points["1"] + turn2Points["1"] === gameState.playerStats["1"].totalScore ? "✅" : "❌"}`);

console.log('\nBerna:');
console.log(`  Turno 1: ${turn1Points["2"]} pts`);
console.log(`  Turno 2: ${turn2Points["2"]} pts`);
console.log(`  TOTAL: ${turn1Points["2"] + turn2Points["2"]} pts`);
console.log(`  (Sistema dice: ${gameState.playerStats["2"].totalScore} pts) ${turn1Points["2"] + turn2Points["2"] === gameState.playerStats["2"].totalScore ? "✅" : "❌"}`);

console.log('\nBorgia:');
console.log(`  Turno 1: ${turn1Points["3"]} pts`);
console.log(`  Turno 2: ${turn2Points["3"]} pts`);
console.log(`  TOTAL: ${turn1Points["3"] + turn2Points["3"]} pts`);
console.log(`  (Sistema dice: ${gameState.playerStats["3"].totalScore} pts) ${turn1Points["3"] + turn2Points["3"] === gameState.playerStats["3"].totalScore ? "✅" : "❌"}`);

console.log('\n');
