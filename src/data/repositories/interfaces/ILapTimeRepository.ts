/**
 * Lap Time Repository Interface
 * Defines the contract for lap time data access
 */

export interface IndividualLapTime {
  id: string;
  gameId: string;
  playerId: string;
  circuitId: string;
  turnNumber: number;
  lapNumber: number;
  timeMs: number;
  createdAt: Date;
}

export interface TurnCompletion {
  id: string;
  gameId: string;
  playerId: string;
  circuitId: string;
  turnNumber: number;
  lapTimes: number[];
  averageTimeMs: number;
  bestLapMs: number;
  turnScore: number;
  createdAt: Date;
}

export interface CreateLapTimeDTO {
  gameId: string;
  playerId: string;
  circuitId: string;
  turnNumber: number;
  lapNumber: number;
  timeMs: number;
}

export interface CreateTurnCompletionDTO {
  gameId: string;
  playerId: string;
  circuitId: string;
  turnNumber: number;
  lapTimes: number[];
  averageTimeMs: number;
  bestLapMs: number;
  turnScore: number;
}

export interface LapTimeFilters {
  gameId?: string;
  playerId?: string;
  circuitId?: string;
  turnNumber?: number;
}

export interface ILapTimeRepository {
  /**
   * Save an individual lap time
   */
  saveLapTime(data: CreateLapTimeDTO): Promise<IndividualLapTime>;

  /**
   * Save or update a lap time (upsert)
   */
  upsertLapTime(data: CreateLapTimeDTO): Promise<IndividualLapTime>;

  /**
   * Get lap times with filters
   */
  findLapTimes(filters: LapTimeFilters): Promise<IndividualLapTime[]>;

  /**
   * Get lap times for a specific turn
   */
  findByTurn(
    gameId: string,
    playerId: string,
    circuitId: string,
    turnNumber: number
  ): Promise<IndividualLapTime[]>;

  /**
   * Save a turn completion record
   */
  saveTurnCompletion(data: CreateTurnCompletionDTO): Promise<TurnCompletion>;

  /**
   * Get turn completions with filters
   */
  findTurnCompletions(filters: LapTimeFilters): Promise<TurnCompletion[]>;

  /**
   * Get all lap times for a game
   */
  findByGame(gameId: string): Promise<IndividualLapTime[]>;

  /**
   * Get all lap times for a player
   */
  findByPlayer(playerId: string): Promise<IndividualLapTime[]>;

  /**
   * Get live data for current game/circuit
   */
  getLiveData(
    gameId: string,
    circuitId: string
  ): Promise<{
    lapTimes: IndividualLapTime[];
    turnCompletions: TurnCompletion[];
  }>;

  /**
   * Delete all lap times for a game
   */
  deleteByGame(gameId: string): Promise<void>;

  /**
   * Delete lap times for a specific turn
   */
  deleteByTurn(
    gameId: string,
    playerId: string,
    circuitId: string,
    turnNumber: number
  ): Promise<void>;

  /**
   * Get best lap time for a circuit (historical)
   */
  getBestLapForCircuit(circuitId: string): Promise<IndividualLapTime | null>;

  /**
   * Get best average for a circuit (historical)
   */
  getBestAverageForCircuit(circuitId: string): Promise<TurnCompletion | null>;
}
