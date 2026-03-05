/**
 * Player Repository Interface
 * Defines the contract for player data access
 */

import type { Player } from '../../../domain/entities';

export interface CreatePlayerDTO {
  name: string;
  imageUrl: string;
  pin: string;
  isGuest?: boolean;
  isActive?: boolean;
}

export interface UpdatePlayerDTO {
  name?: string;
  imageUrl?: string;
  pin?: string;
  isGuest?: boolean;
  isActive?: boolean;
}

export interface IPlayerRepository {
  /**
   * Find all players
   * @param includeInactive - Include inactive players (default: false)
   */
  findAll(includeInactive?: boolean): Promise<Player[]>;

  /**
   * Find all active players (excludes guests by default)
   */
  findAllActive(): Promise<Player[]>;

  /**
   * Find all guest players
   */
  findAllGuests(): Promise<Player[]>;

  /**
   * Find player by ID
   */
  findById(id: string): Promise<Player | null>;

  /**
   * Find player by PIN
   */
  findByPin(pin: string): Promise<Player | null>;

  /**
   * Check if PIN is already taken
   */
  isPinTaken(pin: string, excludePlayerId?: string): Promise<boolean>;

  /**
   * Create a new player
   */
  create(data: CreatePlayerDTO): Promise<Player>;

  /**
   * Update an existing player
   */
  update(id: string, data: UpdatePlayerDTO): Promise<Player>;

  /**
   * Delete a player (soft delete - sets isActive to false)
   */
  delete(id: string): Promise<void>;

  /**
   * Permanently delete a player
   */
  hardDelete(id: string): Promise<void>;

  /**
   * Validate player PIN
   */
  validatePin(pin: string): Promise<Player | null>;

  /**
   * Generate unique PIN for guest
   */
  generateGuestPin(): Promise<string>;
}
