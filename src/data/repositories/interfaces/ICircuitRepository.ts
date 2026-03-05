/**
 * Circuit Repository Interface
 * Defines the contract for circuit data access
 */

import type { Circuit } from '../../../domain/entities';

export interface CreateCircuitDTO {
  name: string;
  imageUrl: string;
}

export interface UpdateCircuitDTO {
  name?: string;
  imageUrl?: string;
  historicalBestLap?: number | null;
  historicalBestAverage?: number | null;
  bestLapHolderId?: string | null;
  bestAverageHolderId?: string | null;
}

export interface CircuitWithHolders extends Circuit {
  bestLapHolder: { id: string; name: string } | null;
  bestAverageHolder: { id: string; name: string } | null;
}

export interface ICircuitRepository {
  /**
   * Find all circuits
   */
  findAll(): Promise<Circuit[]>;

  /**
   * Find all circuits with record holder information
   */
  findAllWithHolders(): Promise<CircuitWithHolders[]>;

  /**
   * Find circuit by ID
   */
  findById(id: string): Promise<Circuit | null>;

  /**
   * Find circuit by ID with holder information
   */
  findByIdWithHolders(id: string): Promise<CircuitWithHolders | null>;

  /**
   * Create a new circuit
   */
  create(data: CreateCircuitDTO): Promise<Circuit>;

  /**
   * Update an existing circuit
   */
  update(id: string, data: UpdateCircuitDTO): Promise<Circuit>;

  /**
   * Delete a circuit
   */
  delete(id: string): Promise<void>;

  /**
   * Update circuit records
   */
  updateRecords(
    id: string,
    records: {
      bestLap?: number;
      bestLapHolderId?: string;
      bestAverage?: number;
      bestAverageHolderId?: string;
    }
  ): Promise<Circuit>;

  /**
   * Clear all records for a circuit
   */
  clearRecords(id: string): Promise<Circuit>;

  /**
   * Get circuits with records
   */
  findWithRecords(): Promise<CircuitWithHolders[]>;
}
