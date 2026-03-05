/**
 * TimingService - Handles all lap time calculations and formatting
 * Pure domain service with no external dependencies
 */

import type { ValidationResult, TurnResult } from '../entities';
import { formatTime, formatDelta, formatTimeShort } from '../utils/formatters';
import { validateLapTime, validateLapTimes } from '../utils/validators';

export class TimingService {
  /**
   * Validate a single lap time
   */
  validateLapTime(timeMs: number): ValidationResult {
    return validateLapTime(timeMs);
  }

  /**
   * Validate an array of lap times
   */
  validateLapTimes(lapTimes: number[], expectedCount?: number): ValidationResult {
    return validateLapTimes(lapTimes, expectedCount);
  }

  /**
   * Calculate average time from lap times
   * @param lapTimes - Array of lap times in milliseconds
   * @returns Average time in milliseconds
   */
  calculateAverage(lapTimes: number[]): number {
    if (!lapTimes || lapTimes.length === 0) {
      return 0;
    }

    const validTimes = lapTimes.filter(t => typeof t === 'number' && !isNaN(t) && t > 0);
    if (validTimes.length === 0) {
      return 0;
    }

    const sum = validTimes.reduce((acc, time) => acc + time, 0);
    return Math.round(sum / validTimes.length);
  }

  /**
   * Calculate best 4 of 5 average
   * Used when useBest4Of5Laps setting is enabled
   * @param lapTimes - Array of 5 lap times
   * @returns Average of best 4 times
   */
  calculateBest4Of5Average(lapTimes: number[]): number {
    if (!lapTimes || lapTimes.length < 4) {
      return this.calculateAverage(lapTimes);
    }

    const validTimes = lapTimes.filter(t => typeof t === 'number' && !isNaN(t) && t > 0);
    if (validTimes.length < 4) {
      return this.calculateAverage(validTimes);
    }

    // Sort ascending and take best 4
    const sorted = [...validTimes].sort((a, b) => a - b);
    const best4 = sorted.slice(0, 4);

    return this.calculateAverage(best4);
  }

  /**
   * Get the best (fastest) lap time from an array
   * @param lapTimes - Array of lap times in milliseconds
   * @returns Best lap time or null if no valid times
   */
  getBestLap(lapTimes: number[]): number | null {
    if (!lapTimes || lapTimes.length === 0) {
      return null;
    }

    const validTimes = lapTimes.filter(t => typeof t === 'number' && !isNaN(t) && t > 0);
    if (validTimes.length === 0) {
      return null;
    }

    return Math.min(...validTimes);
  }

  /**
   * Get the worst (slowest) lap time from an array
   * @param lapTimes - Array of lap times in milliseconds
   * @returns Worst lap time or null if no valid times
   */
  getWorstLap(lapTimes: number[]): number | null {
    if (!lapTimes || lapTimes.length === 0) {
      return null;
    }

    const validTimes = lapTimes.filter(t => typeof t === 'number' && !isNaN(t) && t > 0);
    if (validTimes.length === 0) {
      return null;
    }

    return Math.max(...validTimes);
  }

  /**
   * Calculate delta between two times
   * Positive = slower, Negative = faster
   * @param currentTime - Current lap time
   * @param referenceTime - Reference time to compare against
   * @returns Delta in milliseconds
   */
  calculateDelta(currentTime: number, referenceTime: number): number {
    if (!currentTime || !referenceTime) {
      return 0;
    }
    return currentTime - referenceTime;
  }

  /**
   * Find the best lap time across all players in a turn
   * @param turn - Array of TurnResult
   * @returns Best lap time and player ID
   */
  findTurnBestLap(turn: TurnResult[]): { time: number; playerId: string } | null {
    let bestTime: number | null = null;
    let bestPlayerId: string | null = null;

    for (const result of turn) {
      const playerBest = this.getBestLap(result.lapTimes);
      if (playerBest !== null && (bestTime === null || playerBest < bestTime)) {
        bestTime = playerBest;
        bestPlayerId = result.playerId;
      }
    }

    if (bestTime === null || bestPlayerId === null) {
      return null;
    }

    return { time: bestTime, playerId: bestPlayerId };
  }

  /**
   * Find the best average across all players in a turn
   * @param turn - Array of TurnResult
   * @returns Best average time and player ID
   */
  findTurnBestAverage(turn: TurnResult[]): { time: number; playerId: string } | null {
    let bestAverage: number | null = null;
    let bestPlayerId: string | null = null;

    for (const result of turn) {
      const average = result.averageTime ?? this.calculateAverage(result.lapTimes);
      if (average > 0 && (bestAverage === null || average < bestAverage)) {
        bestAverage = average;
        bestPlayerId = result.playerId;
      }
    }

    if (bestAverage === null || bestPlayerId === null) {
      return null;
    }

    return { time: bestAverage, playerId: bestPlayerId };
  }

  /**
   * Format time for display
   */
  formatTime(ms: number | null | undefined): string {
    return formatTime(ms);
  }

  /**
   * Format time in short format
   */
  formatTimeShort(ms: number | null | undefined): string {
    return formatTimeShort(ms);
  }

  /**
   * Format delta for display
   */
  formatDelta(ms: number): string {
    return formatDelta(ms);
  }

  /**
   * Check if a lap time is a new personal best
   * @param newTime - New lap time
   * @param previousBest - Previous best time (or null)
   * @returns True if new time is better
   */
  isNewPersonalBest(newTime: number, previousBest: number | null): boolean {
    if (previousBest === null) {
      return true;
    }
    return newTime < previousBest;
  }

  /**
   * Check if a time is a penalty time (over 3 minutes)
   * Penalty times are typically excluded from averages
   */
  isPenaltyTime(timeMs: number): boolean {
    const PENALTY_THRESHOLD = 180000; // 3 minutes
    return timeMs > PENALTY_THRESHOLD;
  }

  /**
   * Filter out penalty times from an array
   */
  filterPenaltyTimes(lapTimes: number[]): number[] {
    return lapTimes.filter(t => !this.isPenaltyTime(t));
  }

  /**
   * Calculate statistics for a set of lap times
   */
  calculateStats(lapTimes: number[]): {
    best: number | null;
    worst: number | null;
    average: number;
    count: number;
    consistency: number;
  } {
    const validTimes = lapTimes.filter(t => typeof t === 'number' && !isNaN(t) && t > 0);

    if (validTimes.length === 0) {
      return { best: null, worst: null, average: 0, count: 0, consistency: 0 };
    }

    const best = Math.min(...validTimes);
    const worst = Math.max(...validTimes);
    const average = this.calculateAverage(validTimes);

    // Consistency: 100% - (std deviation / average * 100)
    // Higher is more consistent
    const variance = validTimes.reduce((acc, t) => acc + Math.pow(t - average, 2), 0) / validTimes.length;
    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, 100 - (stdDev / average) * 100);

    return {
      best,
      worst,
      average,
      count: validTimes.length,
      consistency: Math.round(consistency * 10) / 10,
    };
  }
}

// Export singleton instance for convenience
export const timingService = new TimingService();
