
// Re-export Prisma types for use in components
import type { Player, Circuit, Game } from '@prisma/client';
export type { Player, Circuit, Game };

export type LapTime = {
  min: string;
  sec: string;
  ms: string;
};

export interface GameSettings {
  players: Player[]; // Ordered players for the game
  circuits: Circuit[]; // Ordered circuits for the game
  lapsPerTurn: 3 | 5;
  turnsPerCircuit: number;

  // New scoring settings
  scoringMethod: 'average' | 'lap' | 'both';
  scoringMultiplier: {
    appliesTo: 'average' | 'lap';
    factor: number;
  } | null;

  // Bonus points settings (existing)
  pointsForBestLap: number;
  pointsForBestAverage: number;
  awardBestTimeFor: 'turn' | 'circuit' | 'both';
  useBest4Of5Laps: boolean;
}

export interface TurnResult {
  playerId: string;
  lapTimes: number[];
  averageTime?: number;
  turnScore: number;
}

export interface CircuitResult {
  circuitId: string;
  turns: TurnResult[][]; // Array of turns, each turn is an array of player results
}

export interface PlayerStats {
  totalScore: number;
  bestLaps: number;
  bestAverages: number;
}

export interface NightlyResult {
  playerId: string;
  circuitName: string;
  turn: number;
  lap: number;
  time: number;
}

export interface GameState {
  settings: GameSettings;
  circuits: Circuit[];
  playerOrder: string[]; // array of player IDs
  currentCircuitIndex: number;
  currentTurn: number;
  currentPlayerIndex: number;
  circuitResults: CircuitResult[];
  playerStats: Record<string, PlayerStats>;
  sessionBestLap: number;
  sessionBestAverage: number;
  lapTimesLog: NightlyResult[];
}

export interface GameHistoryEntry {
  id: string;
  state: GameState;
  status: "COMPLETED";
  updatedAt: string;
}