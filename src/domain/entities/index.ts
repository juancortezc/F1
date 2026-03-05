// Re-export types from main types file for domain layer
// These will be gradually moved here as we refactor

export type {
  Player,
  Circuit,
  Game,
  GameState,
  GameSettings,
  TurnResult,
  CircuitResult,
  PlayerStats,
  LapTime,
  NightlyResult,
  UserSession,
  UserRole,
} from '../../../types';

// Domain-specific types

export interface Standing {
  playerId: string;
  playerName: string;
  totalScore: number;
  bestLaps: number;
  bestAverages: number;
  firsts: number;
  seconds: number;
  thirds: number;
}

export interface TurnPosition {
  playerId: string;
  position: number;
  firsts: number;
  seconds: number;
  thirds: number;
}

export interface RecordResult {
  isNewBestLap: boolean;
  isNewBestAverage: boolean;
  previousBestLap: number | null;
  previousBestAverage: number | null;
}

export interface RecordData {
  bestLap?: number;
  bestAverage?: number;
}

export interface ProgressInfo {
  completedCircuits: number;
  totalCircuits: number;
  completedTurns: number;
  totalTurns: number;
  overallProgress: number;
  currentCircuitProgress: number;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export type ScoringMethod = 'average' | 'lap' | 'both';
