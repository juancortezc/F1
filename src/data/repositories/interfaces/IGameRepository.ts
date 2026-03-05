/**
 * Game Repository Interface
 * Defines the contract for game data access
 */

import type { GameState } from '../../../domain/entities';

export type GameStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface CreateGameDTO {
  state: GameState;
  status?: GameStatus;
}

// Standalone interface instead of extending Prisma's Game type
// to avoid JSON type compatibility issues
export interface GameWithState {
  id: string;
  state: GameState;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGameRepository {
  /**
   * Find the currently active game
   */
  findActive(): Promise<GameWithState | null>;

  /**
   * Find game by ID
   */
  findById(id: string): Promise<GameWithState | null>;

  /**
   * Find all games with optional status filter
   */
  findAll(status?: GameStatus): Promise<GameWithState[]>;

  /**
   * Get game history (completed games)
   * @param limit - Maximum number of games to return
   */
  getHistory(limit?: number): Promise<GameWithState[]>;

  /**
   * Create a new game
   */
  create(data: CreateGameDTO): Promise<GameWithState>;

  /**
   * Update game state
   */
  updateState(id: string, state: GameState): Promise<GameWithState>;

  /**
   * Update game status
   */
  updateStatus(id: string, status: GameStatus): Promise<GameWithState>;

  /**
   * Complete the active game
   */
  completeActive(): Promise<GameWithState | null>;

  /**
   * Cancel the active game
   */
  cancelActive(): Promise<GameWithState | null>;

  /**
   * Delete a game
   */
  delete(id: string): Promise<void>;

  /**
   * Check if there's an active game
   */
  hasActiveGame(): Promise<boolean>;

  /**
   * Get count of games by status
   */
  countByStatus(status: GameStatus): Promise<number>;
}
