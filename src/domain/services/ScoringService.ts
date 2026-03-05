/**
 * ScoringService - Handles all scoring calculations
 * Pure domain service with no external dependencies
 */

import type {
  GameState,
  Player,
  TurnResult,
  PlayerStats,
  Standing,
  TurnPosition,
  ScoringMethod,
} from '../entities';
import { TimingService } from './TimingService';

export interface TurnScoreResult {
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  hasBestLap: boolean;
  hasBestAverage: boolean;
}

export interface CircuitBreakdown {
  name: string;
  circuitIndex: number;
  players: {
    playerId: string;
    playerName: string;
    basePoints: number;
    bonusPoints: number;
    totalPoints: number;
    turns: {
      turnNumber: number;
      position: number;
      basePoints: number;
      bonusPoints: number;
      totalPoints: number;
    }[];
  }[];
}

export class ScoringService {
  private timingService: TimingService;

  constructor(timingService?: TimingService) {
    this.timingService = timingService || new TimingService();
  }

  /**
   * Get position-based points (without bonus)
   * @param position - 1-based position (1 = first place)
   * @param totalPlayers - Total number of players
   * @param settings - Optional custom points (defaults: 3, 2, 1)
   */
  getPositionPoints(
    position: number,
    totalPlayers: number,
    settings?: { first?: number; second?: number; third?: number }
  ): number {
    const first = settings?.first ?? 3;
    const second = settings?.second ?? 2;
    const third = settings?.third ?? 1;

    if (position === 1) return first;
    if (position === 2 && totalPlayers >= 2) return second;
    if (position === 3 && totalPlayers >= 3) return third;
    return 0;
  }

  /**
   * Calculate turn score based on lap times
   * @param lapTimes - Array of lap times in milliseconds
   * @param method - Scoring method ('average', 'lap', or 'both')
   * @param useBest4Of5 - Whether to use best 4 of 5 laps for average
   */
  calculateTurnScore(
    lapTimes: number[],
    method: ScoringMethod = 'average',
    useBest4Of5: boolean = false
  ): number {
    if (!lapTimes || lapTimes.length === 0) {
      return 0;
    }

    switch (method) {
      case 'average':
        return useBest4Of5 && lapTimes.length === 5
          ? this.timingService.calculateBest4Of5Average(lapTimes)
          : this.timingService.calculateAverage(lapTimes);

      case 'lap':
        return this.timingService.getBestLap(lapTimes) || 0;

      case 'both':
        const average = useBest4Of5 && lapTimes.length === 5
          ? this.timingService.calculateBest4Of5Average(lapTimes)
          : this.timingService.calculateAverage(lapTimes);
        const bestLap = this.timingService.getBestLap(lapTimes) || 0;
        // Combined score: weight average more heavily
        return Math.round(average * 0.7 + bestLap * 0.3);

      default:
        return this.timingService.calculateAverage(lapTimes);
    }
  }

  /**
   * Calculate bonus points for best times
   */
  calculateBonusPoints(
    isBestLap: boolean,
    isBestAverage: boolean,
    settings?: { pointsForBestLap?: number; pointsForBestAverage?: number }
  ): number {
    const pointsForBestLap = settings?.pointsForBestLap ?? 1;
    const pointsForBestAverage = settings?.pointsForBestAverage ?? 1;

    let bonus = 0;
    if (isBestLap) bonus += pointsForBestLap;
    if (isBestAverage) bonus += pointsForBestAverage;
    return bonus;
  }

  /**
   * Sort turn results by time (ascending - fastest first)
   * @param turn - Array of TurnResult
   * @returns Sorted array with positions
   */
  sortTurnByTime(turn: TurnResult[]): { playerId: string; position: number; time: number }[] {
    // Sort by averageTime or calculated average (ascending)
    const sorted = [...turn]
      .map((result) => ({
        playerId: result.playerId,
        time: result.averageTime ?? this.timingService.calculateAverage(result.lapTimes),
      }))
      .filter((r) => r.time > 0)
      .sort((a, b) => a.time - b.time);

    return sorted.map((result, index) => ({
      ...result,
      position: index + 1,
    }));
  }

  /**
   * Sort turn results by score (descending - highest first)
   * @param turn - Array of TurnResult
   * @returns Sorted array with positions
   */
  sortTurnByScore(turn: TurnResult[]): { playerId: string; position: number; score: number }[] {
    const sorted = [...turn]
      .map((result) => ({
        playerId: result.playerId,
        score: result.turnScore,
      }))
      .sort((a, b) => b.score - a.score);

    return sorted.map((result, index) => ({
      ...result,
      position: index + 1,
    }));
  }

  /**
   * Calculate turn positions for all circuits
   * Returns count of 1st, 2nd, 3rd places per player
   */
  calculateTurnPositions(
    gameState: GameState,
    players: Player[]
  ): Record<string, TurnPosition> {
    const positions: Record<string, TurnPosition> = {};

    // Initialize counters
    players.forEach((player) => {
      positions[player.id] = {
        playerId: player.id,
        position: 0,
        firsts: 0,
        seconds: 0,
        thirds: 0,
      };
    });

    // Process each circuit's results
    gameState.circuitResults.forEach((circuit) => {
      circuit.turns.forEach((turn) => {
        const sorted = this.sortTurnByScore(turn);
        const totalPlayers = sorted.length;

        sorted.forEach(({ playerId, position }) => {
          if (!positions[playerId]) return;

          if (position === 1 && totalPlayers >= 1) {
            positions[playerId].firsts++;
          }
          if (position === 2 && totalPlayers >= 2) {
            positions[playerId].seconds++;
          }
          if (position === 3 && totalPlayers >= 3) {
            positions[playerId].thirds++;
          }
        });
      });
    });

    return positions;
  }

  /**
   * Calculate standings from game state
   */
  calculateStandings(gameState: GameState, players: Player[]): Standing[] {
    const turnPositions = this.calculateTurnPositions(gameState, players);

    return Object.entries(gameState.playerStats)
      .map(([playerId, stats]) => {
        const player = players.find((p) => p.id === playerId);
        if (!player) return null;

        const positions = turnPositions[playerId] || {
          firsts: 0,
          seconds: 0,
          thirds: 0,
        };

        return {
          playerId,
          playerName: player.name,
          totalScore: stats.totalScore,
          bestLaps: stats.bestLaps || 0,
          bestAverages: stats.bestAverages || 0,
          firsts: positions.firsts,
          seconds: positions.seconds,
          thirds: positions.thirds,
        };
      })
      .filter((s): s is Standing => s !== null)
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Get detailed breakdown by circuit
   */
  getCircuitBreakdown(gameState: GameState, players: Player[]): CircuitBreakdown[] {
    return gameState.settings.circuits
      .map((circuit, circuitIndex) => {
        const circuitResult = gameState.circuitResults[circuitIndex];
        if (!circuitResult) return null;

        // Get participating players
        const participatingIds = new Set<string>();
        circuitResult.turns.forEach((turn) => {
          turn.forEach((result) => participatingIds.add(result.playerId));
        });

        const playerData = players
          .filter((p) => participatingIds.has(p.id))
          .map((player) => {
            let circuitBasePoints = 0;
            let circuitBonusPoints = 0;
            const turnDetails: CircuitBreakdown['players'][0]['turns'] = [];

            circuitResult.turns.forEach((turn, turnIndex) => {
              const playerTurn = turn.find((t) => t.playerId === player.id);
              if (!playerTurn) return;

              const sorted = this.sortTurnByScore(turn);
              const playerPosition = sorted.find((s) => s.playerId === player.id);
              const position = playerPosition?.position ?? turn.length + 1;

              const basePoints = this.getPositionPoints(position, turn.length);
              const totalTurnScore = playerTurn.turnScore || 0;
              const bonusPoints = Math.max(0, totalTurnScore - basePoints);

              circuitBasePoints += basePoints;
              circuitBonusPoints += bonusPoints;

              turnDetails.push({
                turnNumber: turnIndex + 1,
                position,
                basePoints,
                bonusPoints,
                totalPoints: basePoints + bonusPoints,
              });
            });

            return {
              playerId: player.id,
              playerName: player.name,
              basePoints: circuitBasePoints,
              bonusPoints: circuitBonusPoints,
              totalPoints: circuitBasePoints + circuitBonusPoints,
              turns: turnDetails,
            };
          })
          .sort((a, b) => b.totalPoints - a.totalPoints);

        return {
          name: circuit.name,
          circuitIndex,
          players: playerData,
        };
      })
      .filter((c): c is CircuitBreakdown => c !== null);
  }

  /**
   * Determine winner from standings
   */
  getWinner(gameState: GameState, players: Player[]): Standing | null {
    const standings = this.calculateStandings(gameState, players);
    return standings.length > 0 ? standings[0] : null;
  }

  /**
   * Calculate total points for a player
   */
  calculatePlayerTotal(playerId: string, gameState: GameState): number {
    return gameState.playerStats[playerId]?.totalScore ?? 0;
  }
}

// Export singleton instance
export const scoringService = new ScoringService();
