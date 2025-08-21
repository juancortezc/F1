
// Re-export Prisma types for use in components
import type { Circuit as PrismaCircuit, Game } from '@prisma/client';
export type { Game };

// Enhanced Circuit type with player holder information
export interface Circuit extends PrismaCircuit {
  bestLapHolder?: { id: string; name: string } | null;
  bestAverageHolder?: { id: string; name: string } | null;
}

// Player interface with PIN integration
export interface Player {
  id: string;
  name: string;
  imageUrl: string;
  pin: string;
  isActive: boolean;
}

export type LapTime = {
  min: string;
  sec: string;
  ms: string;
};

export interface GameSettings {
  players: Player[]; // Ordered players for the game
  circuits: Circuit[]; // Ordered circuits for the game
  controllerIds: string[]; // IDs of players who can register times
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
  
  // Points system settings
  pointsForFirst?: number;
  pointsForSecond?: number;
  pointsForThird?: number;
  pointsForCircuit?: number[]; // Array of bonus points per circuit position
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
  sessionBestLap: number | null; // Global session best (deprecated, kept for compatibility)
  sessionBestAverage: number | null; // Global session best (deprecated, kept for compatibility)
  // Per-circuit session tracking
  sessionBestTimes: Record<string, {
    bestLap: number | null;
    bestLapPlayerId: string | null;
    bestAverage: number | null;
    bestAveragePlayerId: string | null;
  }>;
  lapTimesLog: NightlyResult[];
  // Control de turnos
  currentController: string; // ID del usuario que puede registrar resultados
  participantUsers: { userId: string; name: string; role: 'controller' | 'spectator' }[];
}

export interface GameHistoryEntry {
  id: string;
  state: GameState;
  status: "COMPLETED";
  updatedAt: string;
}

// User roles and authentication
export type UserRole = 'organizer' | 'player' | 'spectator';

export interface UserSession {
  userId: string;
  name: string;
  role: UserRole;
}

export interface AuthenticationRequest {
  pin: string;
  role: UserRole;
  adminName?: string; // Optional name for admin/organizer role
}

// Tournament System Types
export interface Tournament {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  maxChampionships: number;
  pointsForFirst: number;
  pointsForSecond: number;
  pointsForThird: number;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  championships: Championship[];
  participants: TournamentParticipant[];
}

export interface Championship {
  id: string;
  tournamentId: string;
  name: string;
  gameState: any; // GameState object
  status: 'ACTIVE' | 'COMPLETED';
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentParticipant {
  id: string;
  tournamentId: string;
  playerId: string;
  totalPoints: number;
  championshipsWon: number;
  championshipsSecond: number;
  championshipsThird: number;
  championshipsTotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentStanding {
  position: number;
  player: {
    id: string;
    name: string;
    imageUrl: string;
  };
  totalPoints: number;
  championshipsWon: number;
  championshipsSecond: number;
  championshipsThird: number;
  championshipsTotal: number;
  participationRate: number;
}

export interface TournamentGameState extends GameState {
  tournamentId?: string;
  championshipId?: string;
  championshipName?: string;
  championshipPosition?: number;
}