/**
 * RecordService - Handles historical records management
 * Pure domain service for record checking and updates
 */

import type { Circuit, RecordResult, RecordData } from '../entities';

export interface RecordCheckResult extends RecordResult {
  circuitId: string;
  newBestLap?: number;
  newBestAverage?: number;
}

export interface CircuitRecords {
  bestLap: number | null;
  bestLapHolderId: string | null;
  bestLapHolderName?: string;
  bestAverage: number | null;
  bestAverageHolderId: string | null;
  bestAverageHolderName?: string;
}

export class RecordService {
  /**
   * Check if new times beat existing circuit records
   * @param circuit - Circuit with current records
   * @param bestLap - New best lap time (or null)
   * @param bestAverage - New best average time (or null)
   * @returns RecordCheckResult indicating which records were beaten
   */
  checkNewRecords(
    circuit: Circuit,
    bestLap: number | null,
    bestAverage: number | null
  ): RecordCheckResult {
    const result: RecordCheckResult = {
      circuitId: circuit.id,
      isNewBestLap: false,
      isNewBestAverage: false,
      previousBestLap: circuit.historicalBestLap ?? null,
      previousBestAverage: circuit.historicalBestAverage ?? null,
    };

    // Check best lap record
    if (bestLap !== null && bestLap > 0) {
      if (
        circuit.historicalBestLap === null ||
        circuit.historicalBestLap === undefined ||
        bestLap < circuit.historicalBestLap
      ) {
        result.isNewBestLap = true;
        result.newBestLap = bestLap;
      }
    }

    // Check best average record
    if (bestAverage !== null && bestAverage > 0) {
      if (
        circuit.historicalBestAverage === null ||
        circuit.historicalBestAverage === undefined ||
        bestAverage < circuit.historicalBestAverage
      ) {
        result.isNewBestAverage = true;
        result.newBestAverage = bestAverage;
      }
    }

    return result;
  }

  /**
   * Check if a single lap time beats the circuit record
   */
  isNewLapRecord(circuit: Circuit, lapTime: number): boolean {
    if (lapTime <= 0) return false;
    if (circuit.historicalBestLap === null || circuit.historicalBestLap === undefined) {
      return true;
    }
    return lapTime < circuit.historicalBestLap;
  }

  /**
   * Check if an average time beats the circuit record
   */
  isNewAverageRecord(circuit: Circuit, averageTime: number): boolean {
    if (averageTime <= 0) return false;
    if (circuit.historicalBestAverage === null || circuit.historicalBestAverage === undefined) {
      return true;
    }
    return averageTime < circuit.historicalBestAverage;
  }

  /**
   * Build update data for circuit records
   * Returns only the fields that need to be updated
   */
  buildRecordUpdateData(
    currentCircuit: Circuit,
    playerId: string,
    records: RecordData
  ): Partial<Circuit> | null {
    const updates: Partial<Circuit> = {};
    let hasUpdates = false;

    if (records.bestLap !== undefined && records.bestLap > 0) {
      if (this.isNewLapRecord(currentCircuit, records.bestLap)) {
        updates.historicalBestLap = records.bestLap;
        updates.bestLapHolderId = playerId;
        hasUpdates = true;
      }
    }

    if (records.bestAverage !== undefined && records.bestAverage > 0) {
      if (this.isNewAverageRecord(currentCircuit, records.bestAverage)) {
        updates.historicalBestAverage = records.bestAverage;
        updates.bestAverageHolderId = playerId;
        hasUpdates = true;
      }
    }

    return hasUpdates ? updates : null;
  }

  /**
   * Get formatted record info for display
   */
  getRecordInfo(circuit: Circuit): CircuitRecords {
    return {
      bestLap: circuit.historicalBestLap ?? null,
      bestLapHolderId: circuit.bestLapHolderId ?? null,
      bestLapHolderName: circuit.bestLapHolder?.name,
      bestAverage: circuit.historicalBestAverage ?? null,
      bestAverageHolderId: circuit.bestAverageHolderId ?? null,
      bestAverageHolderName: circuit.bestAverageHolder?.name,
    };
  }

  /**
   * Compare two records and determine if there's an improvement
   * @param oldRecord - Previous record time (or null)
   * @param newRecord - New record time
   * @returns Improvement in milliseconds (positive = faster), or null if no improvement
   */
  calculateImprovement(oldRecord: number | null, newRecord: number): number | null {
    if (oldRecord === null) {
      return null; // First record, no comparison
    }
    if (newRecord >= oldRecord) {
      return null; // No improvement
    }
    return oldRecord - newRecord;
  }

  /**
   * Validate that records data is consistent
   */
  validateRecordData(records: RecordData): boolean {
    if (records.bestLap !== undefined) {
      if (typeof records.bestLap !== 'number' || records.bestLap <= 0) {
        return false;
      }
    }
    if (records.bestAverage !== undefined) {
      if (typeof records.bestAverage !== 'number' || records.bestAverage <= 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Create a summary of record changes for notification
   */
  createRecordSummary(
    result: RecordCheckResult,
    playerName: string,
    circuitName: string
  ): string[] {
    const messages: string[] = [];

    if (result.isNewBestLap && result.newBestLap) {
      const improvement = this.calculateImprovement(result.previousBestLap, result.newBestLap);
      if (improvement !== null) {
        messages.push(
          `🏎️ ${playerName} batió el récord de vuelta rápida en ${circuitName} por ${(improvement / 1000).toFixed(3)}s`
        );
      } else {
        messages.push(`🏎️ ${playerName} estableció el primer récord de vuelta rápida en ${circuitName}`);
      }
    }

    if (result.isNewBestAverage && result.newBestAverage) {
      const improvement = this.calculateImprovement(result.previousBestAverage, result.newBestAverage);
      if (improvement !== null) {
        messages.push(
          `📊 ${playerName} batió el récord de mejor promedio en ${circuitName} por ${(improvement / 1000).toFixed(3)}s`
        );
      } else {
        messages.push(`📊 ${playerName} estableció el primer récord de promedio en ${circuitName}`);
      }
    }

    return messages;
  }
}

// Export singleton instance
export const recordService = new RecordService();
